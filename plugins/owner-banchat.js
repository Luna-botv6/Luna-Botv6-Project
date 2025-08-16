import fs from 'fs';

const handler = async (m, { conn }) => {
  // 🔧 VERIFICACIÓN MEJORADA DE OWNER
  console.log('=== DEBUG OWNER CHECK ===');
  console.log('Sender original:', m.sender);
  
  // Normalizar el sender
  const normalizedSender = conn.decodeJid(m.sender).replace(/@.*/g, '@s.whatsapp.net');
  console.log('Sender normalizado:', normalizedSender);
  
  // Obtener el ID del bot de forma segura
  const botId = conn.decodeJid(conn.user?.id || global.conn?.user?.id || '');
  console.log('Bot ID:', botId);
  
  // Lista completa de owners
  const allOwners = [
    botId, // ID del bot
    ...global.owner.map(([number]) => number.replace(/[^0-9]/g, '') + '@s.whatsapp.net'),
    ...global.lidOwners.map((number) => number.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
  ].filter(Boolean); // Filtrar valores vacíos
  
  console.log('Lista completa de owners:', allOwners);
  
  // Verificar si el usuario es owner
  const isROwner = allOwners.includes(normalizedSender);
  const isOwner = isROwner || m.fromMe;
  
  console.log('isROwner:', isROwner);
  console.log('isOwner:', isOwner);
  console.log('m.fromMe:', m.fromMe);
  console.log('========================');
  
  // Si no eres owner, mostrar mensaje de error detallado
  if (!isOwner) {
    const debugInfo = `❌ **NO AUTORIZADO**
    
📱 **Tu número:** ${m.sender}
🤖 **Bot ID:** ${botId}
👑 **Owners configurados:**
${global.owner.map(([num, name]) => `   • ${num} (${name})`).join('\n')}

🔧 **Owners principales:**
${global.lidOwners.map(num => `   • ${num}`).join('\n')}

⚠️ **Posibles soluciones:**
1. Verifica que tu número esté correctamente en config.js
2. Asegúrate de incluir el código de país completo
3. Reinicia el bot después de modificar config.js
4. Verifica que no haya espacios extra en los números`;
    
    return m.reply(debugInfo);
  }
  
  // Cargar idioma y traducción
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.owner.banchat;
  } catch (error) {
    console.log('Error cargando traducción:', error);
    tradutor = { texto1: '✅ Chat baneado exitosamente.' };
  }
  
  // Banear el chat
  if (!global.db.data.chats[m.chat]) {
    global.db.data.chats[m.chat] = {};
  }
  
  global.db.data.chats[m.chat].isBanned = true;
  
  // Confirmar acción
  const successMessage = `✅ **CHAT BANEADO**

🚫 Este chat ha sido baneado exitosamente.
📱 Baneado por: @${m.sender.split('@')[0]}
⏰ Fecha: ${new Date().toLocaleString('es-ES')}

ℹ️ El bot no responderá a comandos en este chat hasta que sea desbaneado.`;
  
  m.reply(successMessage, null, { mentions: [m.sender] });
};

handler.help = ['banchat'];
handler.tags = ['owner'];
handler.command = /^banchat$/i;
handler.owner = true;

export default handler;