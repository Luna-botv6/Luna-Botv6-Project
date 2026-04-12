import { setSinPrefijo, getSinPrefijo } from '../lib/sinPrefijo.js';

let handler = async (m, { conn, isOwner, isAdmin, command }) => {
  if (!isAdmin && !isOwner) {
    return m.reply('⚠️ Solo los administradores pueden usar este comando');
  }

  if (!m.isGroup) {
    return m.reply('⚠️ Este comando solo funciona en grupos');
  }

  const estadoActual = getSinPrefijo(m.chat);
  
  if (command === 'sinprefijo' || command === 'noprefix') {
    if (estadoActual) {
      return m.reply('✅ El modo sin prefijo ya está ACTIVADO en este grupo');
    }
    
    setSinPrefijo(m.chat, true);
    
    await m.reply(`✅ *Modo sin prefijo ACTIVADO*

Ahora los miembros pueden usar comandos sin necesidad de prefijos.

*Ejemplos:*
• play bad bunny
• menu
• sticker (responder a imagen)
• ig (url de instagram)

*Nota:* Los prefijos seguirán funcionando normalmente.

Para desactivar usa: /conprefijo`);
    
  } else if (command === 'conprefijo' || command === 'withprefix') {
    if (!estadoActual) {
      return m.reply('✅ El modo sin prefijo ya está DESACTIVADO en este grupo');
    }
    
    setSinPrefijo(m.chat, false);
    
    await m.reply(`✅ *Modo sin prefijo DESACTIVADO*

Ahora los comandos solo funcionarán con prefijo.

*Ejemplos:*
• /play bad bunny
• /menu
• /sticker (responder a imagen)

Para activar usa: /sinprefijo`);
  }
};

handler.help = ['sinprefijo', 'conprefijo'];
handler.tags = ['owner', 'group'];
handler.command = ['sinprefijo', 'noprefix', 'conprefijo', 'withprefix'];
handler.group = true;
handler.admin = true;

export default handler;