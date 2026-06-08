import fs from 'fs';
import path from 'path';
import { getUserStats, setUserStats } from '../lib/stats.js';

const backupFile = './copia-niveles.js';
const statsFile = './database/stats.json';

const handler = async (m, { args, usedPrefix, command, conn }) => {
  try {
    // Verificar permisos: Owner, LID Owner o Moderador
    const isOwner = global.owner.some(([num]) => num === m.sender.split('@')[0]);
    const isLidOwner = global.lidOwners.includes(m.sender.split('@')[0]);
    const isMod = global.mods.includes(m.sender.split('@')[0]);
    const isUserOwner = global.db.data.users[m.sender]?.owner;

    if (!isOwner && !isLidOwner && !isMod && !isUserOwner) {
      return m.reply('❌ Solo los owners, LID owners y moderadores pueden usar este comando');
    }

    // Validación de base de datos del usuario
    if (!global.db.data.users[m.sender]) {
      global.db.data.users[m.sender] = {};
    }

    const mensajeUso = `
🔧 *SISTEMA DE COPIAS DE SEGURIDAD*

📋 *Comandos disponibles:*
• *${usedPrefix + command} crear* - Crea una copia de seguridad
• *${usedPrefix + command} restaurar* - Restaura la copia de seguridad
• *${usedPrefix + command} info* - Información del backup

⚠️ *Nota:* Solo owners, LID owners y moderadores pueden usar estos comandos`.trim();

    // Validación de argumentos
    if (!args[0]) {
      return m.reply(mensajeUso);
    }

    const action = args[0].toLowerCase();

    switch (action) {
    case 'crear':
    case 'backup':
      return await crearCopia(m, conn);
      
    case 'restaurar':
    case 'restore':
      return await restaurarCopia(m, conn);
      
    case 'info':
    case 'información':
      return await infoBackup(m, conn);
      
    default:
      return m.reply(`❌ Acción no válida. Usa: crear, restaurar o info\n\n${mensajeUso}`);
    }

  } catch (error) {
    console.error('Error en comando backup:', error);
    await m.reply('❌ Ocurrió un error interno. Intenta nuevamente.');
  }
};

async function crearCopia(m, conn) {
  try {
    // Verificar si existe el archivo de estadísticas
    if (!fs.existsSync(statsFile)) {
      return m.reply('❌ No se encontró el archivo de estadísticas para crear la copia');
    }

    // Leer el archivo de estadísticas actual
    const statsData = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    
    // Obtener la fecha actual para el backup
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toLocaleTimeString('es-ES', { hour12: false });
    
    // Obtener información del usuario que crea el backup
    const userNumber = m.sender.split('@')[0];
    const userRole = getUserRole(userNumber);
    
    // Crear el contenido de la copia de seguridad
    const backupContent = `// Copia de seguridad creada el ${fecha} a las ${hora}
// Este archivo contiene los datos de todos los usuarios del bot
// Para restaurar, ejecuta: /copia restaurar

export const backupData = ${JSON.stringify(statsData, null, 2)}

export const backupInfo = {
  fecha: "${fecha}",
  hora: "${hora}",
  totalUsuarios: ${Object.keys(statsData).length},
  version: "1.0",
  createdBy: "${m.sender}",
  createdByNumber: "${userNumber}",
  createdByRole: "${userRole}",
  timestamp: ${Date.now()}
}

// Función para obtener los datos de respaldo
export function getBackupData() {
  return backupData
}

// Función para obtener información del backup
export function getBackupInfo() {
  return backupInfo
}
`;

    // Escribir el archivo de copia de seguridad
    fs.writeFileSync(backupFile, backupContent, 'utf8');
    
    const totalUsuarios = Object.keys(statsData).length;
    
    const respuesta = `✅ *COPIA DE SEGURIDAD CREADA*

📁 *Archivo:* copia-niveles.js
📊 *Usuarios respaldados:* ${totalUsuarios}
📅 *Fecha:* ${fecha}
🕒 *Hora:* ${hora}
👤 *Creado por:* ${userRole}
💾 *Ubicación:* Raíz del bot

🔄 Para restaurar usa: */copia restaurar*
ℹ️ Para ver info usa: */copia info*`;

    return m.reply(respuesta);

  } catch (error) {
    console.error('Error al crear copia de seguridad:', error);
    return m.reply('❌ Error al crear la copia de seguridad: ' + error.message);
  }
}

async function restaurarCopia(m, conn) {
  try {
    // Verificar si existe el archivo de copia de seguridad
    if (!fs.existsSync(backupFile)) {
      return m.reply(`❌ *NO SE ENCONTRÓ LA COPIA DE SEGURIDAD*

📁 No existe el archivo: copia-niveles.js
💡 Primero crea una copia con: */copia crear*`);
    }

    // Leer el archivo de copia de seguridad
    const backupContent = fs.readFileSync(backupFile, 'utf8');
    
    // Extraer los datos usando regex (más seguro que import dinámico)
    const dataMatch = backupContent.match(/export const backupData = ([\s\S]*?)(?=\n\nexport const backupInfo)/);
    const infoMatch = backupContent.match(/export const backupInfo = ([\s\S]*?)(?=\n\n|$)/);
    
    if (!dataMatch || !infoMatch) {
      return m.reply('❌ La copia de seguridad está corrupta o no contiene datos válidos');
    }

    const backupData = JSON.parse(dataMatch[1]);
    const backupInfo = JSON.parse(infoMatch[1]);
    
    if (!backupData || typeof backupData !== 'object') {
      return m.reply('❌ Los datos de la copia de seguridad no son válidos');
    }

    // Crear directorio de database si no existe
    const dbDir = './database';
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Crear respaldo del archivo actual antes de restaurar
    const timestamp = Date.now();
    const backupActual = `./database/stats-backup-${timestamp}.json`;
    
    if (fs.existsSync(statsFile)) {
      fs.copyFileSync(statsFile, backupActual);
    }

    // Restaurar los datos
    fs.writeFileSync(statsFile, JSON.stringify(backupData, null, 2), 'utf8');
    
    const totalUsuarios = Object.keys(backupData).length;
    const userRole = getUserRole(m.sender.split('@')[0]);
    
    const respuesta = `✅ *COPIA DE SEGURIDAD RESTAURADA*

📁 *Backup del:* ${backupInfo.fecha || 'Sin fecha'} - ${backupInfo.hora || 'Sin hora'}
📊 *Usuarios restaurados:* ${totalUsuarios}
👤 *Restaurado por:* ${userRole}
🔄 *Estado:* Todos los niveles, exp, dinero y diamantes restaurados

💾 *Respaldo previo:* stats-backup-${timestamp}.json
⚠️ *Nota:* Los cambios se aplicaron inmediatamente`;

    return m.reply(respuesta);

  } catch (error) {
    console.error('Error al restaurar copia de seguridad:', error);
    return m.reply('❌ Error al restaurar la copia de seguridad: ' + error.message);
  }
}

async function infoBackup(m, conn) {
  try {
    if (!fs.existsSync(backupFile)) {
      return m.reply(`ℹ️ *INFORMACIÓN DE BACKUP*

❌ No existe ninguna copia de seguridad
📁 Archivo esperado: copia-niveles.js
💡 Crea una copia con: */copia crear*`);
    }

    const stats = fs.statSync(backupFile);
    const backupContent = fs.readFileSync(backupFile, 'utf8');
    
    // Extraer información del backup
    const infoMatch = backupContent.match(/export const backupInfo = ([\s\S]*?)(?=\n\n|$)/);
    
    if (!infoMatch) {
      return m.reply('❌ No se pudo leer la información del backup');
    }

    const backupInfo = JSON.parse(infoMatch[1]);
    
    const respuesta = `ℹ️ *INFORMACIÓN DE BACKUP*

📁 *Archivo:* copia-niveles.js
📊 *Usuarios respaldados:* ${backupInfo.totalUsuarios || 'N/A'}
📅 *Fecha creación:* ${backupInfo.fecha || 'N/A'}
🕒 *Hora creación:* ${backupInfo.hora || 'N/A'}
👤 *Creado por:* ${backupInfo.createdByRole || 'N/A'}
💾 *Tamaño:* ${(stats.size / 1024).toFixed(2)} KB
🔢 *Versión:* ${backupInfo.version || 'N/A'}

🔄 Para restaurar: */copia restaurar*
🆕 Para crear nuevo: */copia crear*`;

    return m.reply(respuesta);

  } catch (error) {
    console.error('Error al obtener info del backup:', error);
    return m.reply('❌ Error al obtener información del backup: ' + error.message);
  }
}

// Función para obtener el rol del usuario
function getUserRole(userNumber) {
  // Verificar si es Owner
  const isOwner = global.owner.some(([num]) => num === userNumber);
  if (isOwner) {
    const ownerInfo = global.owner.find(([num]) => num === userNumber);
    return ownerInfo[1] || 'Owner';
  }
  
  // Verificar si es LID Owner
  if (global.lidOwners.includes(userNumber)) {
    return 'LID Owner';
  }
  
  // Verificar si es Moderador
  if (global.mods.includes(userNumber)) {
    return 'Moderador';
  }
  
  // Verificar si tiene permisos de owner en la base de datos
  if (global.db.data.users[userNumber + '@s.whatsapp.net']?.owner) {
    return 'Owner (DB)';
  }
  
  return 'Usuario';
}

// Función para crear backup automático (se puede llamar desde otros comandos)
export async function crearBackupAutomatico() {
  try {
    if (!fs.existsSync(statsFile)) return false;
    
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toLocaleTimeString('es-ES', { hour12: false });
    const autoBackupFile = `./backup-auto-${fecha}.js`;
    
    const statsData = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    
    const backupContent = `// Backup automático del ${fecha} a las ${hora}
export const backupData = ${JSON.stringify(statsData, null, 2)}

export const backupInfo = {
  fecha: "${fecha}",
  hora: "${hora}",
  tipo: "automatico",
  totalUsuarios: ${Object.keys(statsData).length}
}

export function getBackupData() {
  return backupData
}
`;
    
    fs.writeFileSync(autoBackupFile, backupContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error en backup automático:', error);
    return false;
  }
}

// Configuración del comando
handler.help = ['copia <crear|restaurar|info>'];
handler.tags = ['owner'];
handler.command = ['copia', 'backup', 'respaldo'];
handler.owner = false; // Cambiado a false para usar verificación personalizada
handler.rowner = false; // Cambiado a false para usar verificación personalizada

export default handler;