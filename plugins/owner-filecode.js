import fs from 'fs';
import path from 'path';

// Función mejorada para verificar si el usuario es propietario
function isOwnerAuthorized(sender) {
  // Números y LIDs autorizados
  const authorizedUsers = [
    '5493483466763@s.whatsapp.net',  // Tu número principal corregido
    '128213531545849@lid',           // Tu LID
    '128213531545849@s.whatsapp.net', // Tu LID como jid normal
    '29717298188532@lid',            // Tu segundo LID
    '29717298188532@s.whatsapp.net'  // Tu segundo LID como jid normal
  ];
    
  // Números base para verificación (sin @domain)
  const authorizedNumbers = [
    '5493483466763',
    '128213531545849', 
    '29717298188532'
  ];
    
  // Verificación directa
  if (authorizedUsers.includes(sender)) {
    return true;
  }
    
  // Verificación por número base
  const senderNumber = sender.split('@')[0].split(':')[0]; // Remover sufijos como :85
  if (authorizedNumbers.includes(senderNumber)) {
    return true;
  }
    
  // Verificación con includes para casos especiales
  for (const number of authorizedNumbers) {
    if (sender.includes(number)) {
      return true;
    }
  }
    
  return false;
}

const handler = async (m, { conn, text, command, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const userId = m.sender;
    
  // Verificación mejorada de propietario
  const isAuthorized = isOwnerAuthorized(m.sender) || m.fromMe;
    
  // Debug: mostrar información para troubleshooting
  console.log('Owner verification debug:', {
    sender: m.sender,
    isAuthorized,
    fromMe: m.fromMe
  });
    
  if (!isAuthorized) {
    return m.reply(`❌ *ACCESO DENEGADO*

🔒 Solo el propietario principal puede usar estos comandos de gestión de código.

👤 *Tu JID:* ${m.sender}
🚫 *Estado:* No autorizado

📞 *Números autorizados:*
• 5493483466763
• 128213531545849  
• 29717298188532

👤 *Autorizado para:* Ehl villano únicamente`);
  }
    
  // Manejar comando agrg (agregar codigo)
  if (command === 'agrg') {
    return await handleCodeInput(m, conn, text, userId);
  }
    
  // Manejar comando cancel
  if (command === 'cancel') {
    if (global.fileSessions && global.fileSessions.has(userId)) {
      const session = global.fileSessions.get(userId);
      global.fileSessions.delete(userId);
      return m.reply(`❌ *OPERACION CANCELADA*

📁 Archivo: ${session.originalPath}
🚫 La ${session.action === 'create' ? 'creacion' : 'edicion'} ha sido cancelada.

👤 *Cancelado por:* Propietario principal`);
    } else {
      return m.reply(`❌ No hay operaciones activas para cancelar.

👤 *Usuario:* Propietario principal`);
    }
  }
};

// Procesar entrada de codigo
async function handleCodeInput(m, conn, text, userId) {
  // Verificar si hay sesiones globales
  if (!global.fileSessions) {
    global.fileSessions = new Map();
  }
    
  const session = global.fileSessions.get(userId);
    
  if (!session) {
    return m.reply(`❌ *NO HAY SESIÓN ACTIVA*

Para crear o editar archivos usa:
• .createfile [archivo] - Crear nuevo archivo
• .editfile [archivo] - Editar archivo existente

*Ejemplo:*
.createfile plugins/test.js

🔒 *Acceso exclusivo para el propietario principal*
👤 *Usuario:* Ehl villano`);
  }
    
  // Verificar timeout (5 minutos)
  if (Date.now() - session.timestamp > 300000) {
    global.fileSessions.delete(userId);
    return m.reply(`⏰ *SESIÓN EXPIRADA*

Tu sesión ha expirado (5 minutos máximo).
Inicia nuevamente con:
• .createfile [archivo] - Para crear
• .editfile [archivo] - Para editar

👤 *Usuario:* Propietario principal`);
  }
    
  // Verificar que hay código
  if (!text || text.trim() === '') {
    return m.reply(`❌ *CÓDIGO VACÍO*

*Uso correcto:*
.agrg [tu código aquí]

*Ejemplo:*
.agrg import fs from 'fs';
const handler = async (m, { conn }) => {
    m.reply('¡Hola mundo!');
};
handler.command = /^(test)$/i;
export default handler;

👤 *Usuario:* Propietario principal`);
  }
    
  try {
    // Crear directorio si no existe
    const dir = path.dirname(session.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Directorio creado por owner principal: ${dir}`);
    }
        
    // Escribir el archivo
    fs.writeFileSync(session.filePath, text.trim(), 'utf8');
        
    // Obtener estadísticas del archivo
    const stats = fs.statSync(session.filePath);
    const size = (stats.size / 1024).toFixed(2);
    const lines = text.trim().split('\n').length;
        
    // Determinar acción realizada
    const action = session.action === 'create' ? 'CREADO' : 'EDITADO';
    const emoji = session.action === 'create' ? '🎉' : '🔄';
    const message = session.action === 'create' ? 
      'El archivo ha sido creado exitosamente y está listo para usar' : 
      'Los cambios han sido guardados correctamente';
        
    // Limpiar la sesión
    global.fileSessions.delete(userId);
        
    // Mensaje de éxito
    return m.reply(`✅ *ARCHIVO ${action} EXITOSAMENTE*

${emoji} *Archivo:* ${session.originalPath}
📊 *Tamaño:* ${size} KB
📝 *Líneas:* ${lines}
⏰ *Fecha:* ${new Date().toLocaleString('es-ES')}
👤 *${action} por:* Propietario principal (Ehl villano)

💡 ${message}

*Comandos relacionados:*
• .viewfile ${session.originalPath} - Ver contenido
• .editfile ${session.originalPath} - Editar again
• .listfiles - Ver todos los archivos

🔒 *Gestión exclusiva del propietario principal*`);
        
  } catch (error) {
    console.error('Error al escribir archivo por owner principal:', error);
        
    // No limpiar la sesión en caso de error para permitir reintento
    return m.reply(`❌ *ERROR AL ${session.action === 'create' ? 'CREAR' : 'EDITAR'} ARCHIVO*

*Error:* ${error.message}

💡 *Posibles soluciones:*
• Verifica que la ruta sea válida
• Asegúrate de tener permisos de escritura
• Revisa que el código no tenga caracteres especiales
• Intenta nuevamente con .agrg [código]

🚫 *Para cancelar:* .cancel
👤 *Usuario:* Propietario principal`);
  }
}

// Función para validar código JavaScript (opcional)
function validateJavaScript(code) {
  try {
    // Verificaciones básicas para ES6 modules
    if (!code.includes('handler') && !code.includes('export default')) {
      return {
        valid: false,
        message: 'El código parece no ser un plugin válido (falta handler o export default)'
      };
    }
        
    // Verificar sintaxis ES6 común
    if (code.includes('module.exports') && !code.includes('export default')) {
      return {
        valid: false,
        message: 'El código usa CommonJS (module.exports), considera usar ES6 (export default)'
      };
    }
        
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      message: `Error de sintaxis: ${error.message}`
    };
  }
}

// Limpiar sesiones expiradas cada 10 minutos
setInterval(() => {
  if (global.fileSessions) {
    const now = Date.now();
    let cleanedSessions = 0;
        
    for (const [userId, session] of global.fileSessions.entries()) {
      if (now - session.timestamp > 600000) { // 10 minutos
        global.fileSessions.delete(userId);
        cleanedSessions++;
      }
    }
        
    if (cleanedSessions > 0) {
      console.log(`🧹 Limpiadas ${cleanedSessions} sesiones expiradas de gestión de archivos`);
    }
  }
}, 600000); // Cada 10 minutos

// Comandos que maneja este handler
handler.command = /^(agrg|cancel)$/i;
handler.owner = true; // Solo el owner puede usar estos comandos

export default handler;