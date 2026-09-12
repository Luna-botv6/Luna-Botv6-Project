import { setSinPrefijo, getSinPrefijo } from '../lib/sinPrefijo.js';

let handler = async (m, { conn, isOwner, isAdmin, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_sinprefijo || {};
  if (!isAdmin && !isOwner) {
    return m.reply((t.solo_admin || '⚠️ Solo los administradores pueden usar este comando'));
  }

  if (!m.isGroup) {
    return m.reply((t.solo_grupos || '⚠️ Este comando solo funciona en grupos'));
  }

  const estadoActual = getSinPrefijo(m.chat);
  
  if (command === 'sinprefijo' || command === 'noprefix') {
    if (estadoActual) {
      return m.reply((t.ya_activado || '✅ El modo sin prefijo ya está ACTIVADO en este grupo'));
    }
    
    setSinPrefijo(m.chat, true);
    
    await m.reply((t.activado || `✅ *Modo sin prefijo ACTIVADO*

Ahora los miembros pueden usar comandos sin necesidad de prefijos.

*Ejemplos:*
• play bad bunny
• menu
• sticker (responder a imagen)
• ig (url de instagram)

*Nota:* Los prefijos seguirán funcionando normalmente.

Para desactivar usa: /conprefijo`));
    
  } else if (command === 'conprefijo' || command === 'withprefix') {
    if (!estadoActual) {
      return m.reply((t.ya_desactivado || '✅ El modo sin prefijo ya está DESACTIVADO en este grupo'));
    }
    
    setSinPrefijo(m.chat, false);
    
    await m.reply((t.desactivado || `✅ *Modo sin prefijo DESACTIVADO*

Ahora los comandos solo funcionarán con prefijo.

*Ejemplos:*
• /play bad bunny
• /menu
• /sticker (responder a imagen)

Para activar usa: /sinprefijo`));
  }
};

handler.help = ['sinprefijo', 'conprefijo'];
handler.tags = ['owner', 'group'];
handler.command = ['sinprefijo', 'noprefix', 'conprefijo', 'withprefix'];
handler.group = true;
handler.admin = true;

export default handler;