let handler = async (m, { conn, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_toggleia || {};
  if (!global.db.data.settings) global.db.data.settings = {};
  if (!global.db.data.settings[conn.user.jid]) {
    global.db.data.settings[conn.user.jid] = {};
  }
  
  const settings = global.db.data.settings[conn.user.jid];
  
  if (typeof settings.iaLunaActive === 'undefined') {
    settings.iaLunaActive = true;
  }
  
  if (command === 'toggleia') {
    settings.iaLunaActive = !settings.iaLunaActive;
  } else if (command === 'iaon') {
    settings.iaLunaActive = true;
  } else if (command === 'iaoff') {
    settings.iaLunaActive = false;
  }
  
  const status = settings.iaLunaActive ? (t.estado_activa || '✅ ACTIVADA') : (t.estado_desactivada || '❌ DESACTIVADA');
  const emoji = settings.iaLunaActive ? '🟢' : '🔴';
  
  await m.reply(`${emoji} ${t.titulo || '*IA de Luna-Bot*'}\n\n${(t.estado?.replace('{estado}', status) || `Estado: ${status}`)}\n\n${settings.iaLunaActive ? (t.activa_desc || '• El bot responderá a menciones y mensajes privados') : (t.desactivada_desc || '• El bot NO responderá automáticamente\n• Los comandos normales siguen funcionando')}`);
};

handler.help = ['toggleia', 'iaon', 'iaoff'];
handler.tags = ['owner'];
handler.command = /^(toggleia|iaon|iaoff)$/i;
handler.owner = true;

export default handler;