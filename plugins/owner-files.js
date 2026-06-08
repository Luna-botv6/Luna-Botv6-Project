import fs from 'fs';
import path from 'path';

// Almacenar sesiones de usuarios
global.fileSessions = global.fileSessions || new Map();

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

🔒 Solo el propietario principal puede usar estos comandos de gestión de archivos.

👤 *Tu JID:* ${m.sender}
🚫 *Estado:* No autorizado

📞 *Números autorizados:*
• 5493483466763
• 128213531545849  
• 29717298188532

👤 *Autorizado para:* Ehl villano únicamente`);
  }
    
  const args = text ? text.trim().split(' ') : [];
    
  try {
    switch (command) {
    case 'createfile':
      return await handleCreateFile(m, conn, args, userId);
    case 'editfile':
      return await handleEditFile(m, conn, args, userId);
    case 'deletefile':
      return await handleDeleteFile(m, conn, args, userId);
    case 'listfiles':
      return await handleListFiles(m, conn, args, userId);
    case 'viewfile':
      return await handleViewFile(m, conn, args, userId);
    }
  } catch (error) {
    console.error('Error en gestion de archivos:', error);
    return m.reply('❌ Error: ' + error.message);
  }
};

// Crear archivo
async function handleCreateFile(m, conn, args, userId) {
  if (args.length < 1) {
    return m.reply(`📝 *CREAR ARCHIVO*

*Uso:* .createfile [ruta/archivo.js]

*Ejemplos:*
• .createfile plugins/jugar.js
• .createfile config.js
• .createfile lib/functions.js
• .createfile plugins/admin/ban.js

*Rutas comunes:*
• plugins/ - Para comandos del bot
• lib/ - Para librerias y funciones
• src/ - Para codigo fuente
• database/ - Para bases de datos

🔒 *Acceso exclusivo para el propietario principal*`);
  }
    
  let filePath = args[0];
    
  // Normalizar ruta
  if (filePath.startsWith('/')) filePath = filePath.slice(1);
  const fullPath = path.resolve(filePath);
    
  // Verificar si ya existe
  if (fs.existsSync(fullPath)) {
    return m.reply(`❌ *EL ARCHIVO YA EXISTE:* ${filePath}

🔧 *Opciones disponibles:*
• .editfile ${filePath} - Para editarlo
• .viewfile ${filePath} - Para verlo
• .deletefile ${filePath} - Para eliminarlo`);
  }
    
  // Crear sesion temporal
  global.fileSessions.set(userId, {
    action: 'create',
    filePath: fullPath,
    originalPath: filePath,
    timestamp: Date.now()
  });
    
  return m.reply(`📝 *CREANDO ARCHIVO:* ${filePath}

💡 *PASO SIGUIENTE:*
Ahora usa el comando *.agrg* seguido de tu codigo:

*Ejemplo:*
.agrg import fs from 'fs';
const handler = async (m, { conn }) => {
    m.reply('¡Hola mundo!');
};
handler.command = /^(test)$/i;
export default handler;

⏰ *Tiempo limite:* 5 minutos
🚫 *Para cancelar:* .cancel

👤 *Sesión iniciada por:* Propietario principal`);
}

// Editar archivo  
async function handleEditFile(m, conn, args, userId) {
  if (args.length < 1) {
    return m.reply(`✏️ *EDITAR ARCHIVO*

*Uso:* .editfile [ruta/archivo.js]

*Ejemplos:*
• .editfile plugins/jugar.js
• .editfile config.js
• .editfile lib/functions.js

🔒 *Acceso exclusivo para el propietario principal*`);
  }
    
  let filePath = args[0];
  if (filePath.startsWith('/')) filePath = filePath.slice(1);
  const fullPath = path.resolve(filePath);
    
  // Verificar existencia
  if (!fs.existsSync(fullPath)) {
    return m.reply(`❌ *ARCHIVO NO ENCONTRADO:* ${filePath}

🔧 *Opciones:*
• .createfile ${filePath} - Para crearlo
• .listfiles - Ver archivos disponibles`);
  }
    
  // Leer contenido actual
  const currentContent = fs.readFileSync(fullPath, 'utf8');
  const preview = currentContent.length > 800 ? 
    currentContent.substring(0, 800) + '\n...[contenido truncado]' : 
    currentContent;
    
  // Crear sesion temporal
  global.fileSessions.set(userId, {
    action: 'edit',
    filePath: fullPath,
    originalPath: filePath,
    currentContent: currentContent,
    timestamp: Date.now()
  });
    
  return m.reply(`✏️ *EDITANDO ARCHIVO:* ${filePath}

📋 *Contenido actual:*
\`\`\`javascript
${preview}
\`\`\`

💡 *PASO SIGUIENTE:*
Usa *.agrg* seguido del nuevo codigo completo

⏰ *Tiempo limite:* 5 minutos
🚫 *Para cancelar:* .cancel

👤 *Sesión iniciada por:* Propietario principal`);
}

// Ver archivo
async function handleViewFile(m, conn, args, userId) {
  if (args.length < 1) {
    return m.reply(`👀 *VER ARCHIVO*

*Uso:* .viewfile [ruta/archivo.js]

*Ejemplo:* .viewfile plugins/jugar.js

🔒 *Acceso exclusivo para el propietario principal*`);
  }
    
  let filePath = args[0];
  if (filePath.startsWith('/')) filePath = filePath.slice(1);
  const fullPath = path.resolve(filePath);
    
  if (!fs.existsSync(fullPath)) {
    return m.reply(`❌ *ARCHIVO NO ENCONTRADO:* ${filePath}`);
  }
    
  const content = fs.readFileSync(fullPath, 'utf8');
  const stats = fs.statSync(fullPath);
  const size = (stats.size / 1024).toFixed(2);
    
  // Limitar contenido para WhatsApp
  const preview = content.length > 1200 ? 
    content.substring(0, 1200) + '\n...[archivo muy largo - contenido truncado]' : 
    content;
    
  return m.reply(`📄 *ARCHIVO:* ${filePath}
📊 *Tamaño:* ${size} KB
📅 *Modificado:* ${stats.mtime.toLocaleString()}
👤 *Visto por:* Propietario principal

\`\`\`javascript
${preview}
\`\`\``);
}

// Eliminar archivo
async function handleDeleteFile(m, conn, args, userId) {
  if (args.length < 1) {
    return m.reply(`🗑️ *ELIMINAR ARCHIVO*

*Uso:* .deletefile [ruta/archivo.js]

*Ejemplo:* .deletefile plugins/test.js

⚠️ *ADVERTENCIA:* Esta accion es irreversible
🔒 *Acceso exclusivo para el propietario principal*`);
  }
    
  let filePath = args[0];
  if (filePath.startsWith('/')) filePath = filePath.slice(1);
  const fullPath = path.resolve(filePath);
    
  if (!fs.existsSync(fullPath)) {
    return m.reply(`❌ *ARCHIVO NO ENCONTRADO:* ${filePath}`);
  }
    
  // Obtener info del archivo antes de eliminar
  const stats = fs.statSync(fullPath);
  const size = (stats.size / 1024).toFixed(2);
    
  try {
    // Eliminar archivo
    fs.unlinkSync(fullPath);
        
    return m.reply(`✅ *ARCHIVO ELIMINADO EXITOSAMENTE*

📁 *Ruta:* ${filePath}
📊 *Tamaño:* ${size} KB
🗑️ *Estado:* Eliminado permanentemente
⏰ *Fecha:* ${new Date().toLocaleString()}
👤 *Eliminado por:* Propietario principal`);
  } catch (error) {
    return m.reply(`❌ *ERROR AL ELIMINAR:* ${error.message}`);
  }
}

// Listar archivos
async function handleListFiles(m, conn, args, userId) {
  const directory = args[0] || 'plugins';
  let dirPath = directory;
    
  if (dirPath.startsWith('/')) dirPath = dirPath.slice(1);
  dirPath = path.resolve(dirPath);
    
  if (!fs.existsSync(dirPath)) {
    return m.reply(`❌ *DIRECTORIO NO ENCONTRADO:* ${directory}

*Directorios comunes:*
• plugins - Comandos del bot
• lib - Librerias y funciones
• src - Codigo fuente
• database - Bases de datos

🔒 *Acceso exclusivo para el propietario principal*`);
  }
    
  try {
    const files = fs.readdirSync(dirPath);
    const jsFiles = files.filter(file => file.endsWith('.js'));
        
    if (jsFiles.length === 0) {
      return m.reply(`📁 *DIRECTORIO:* ${directory}
❌ No se encontraron archivos .js

💡 *Tip:* Usa .createfile para crear nuevos archivos

👤 *Consultado por:* Propietario principal`);
    }
        
    let fileList = `📁 *ARCHIVOS EN:* ${directory}
👤 *Acceso:* Propietario principal

`;
        
    jsFiles.slice(0, 25).forEach((file, index) => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(1);
      const date = stats.mtime.toLocaleDateString();
      fileList += `${index + 1}. 📄 *${file}*\n   📊 ${size}KB • 📅 ${date}\n\n`;
    });
        
    if (jsFiles.length > 25) {
      fileList += `... y ${jsFiles.length - 25} archivos mas\n\n`;
    }
        
    fileList += `📊 *TOTAL:* ${jsFiles.length} archivos JavaScript
🔒 *Gestión exclusiva del propietario principal*`;
        
    return m.reply(fileList);
  } catch (error) {
    return m.reply(`❌ *ERROR AL LISTAR:* ${error.message}`);
  }
}

handler.command = /^(createfile|editfile|deletefile|listfiles|viewfile)$/i;
handler.owner = true; // Solo el owner puede usar estos comandos

export default handler;