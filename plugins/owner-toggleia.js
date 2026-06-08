let handler = async (m, { conn, command }) => {
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
  
  const status = settings.iaLunaActive ? '✅ ACTIVADA' : '❌ DESACTIVADA';
  const emoji = settings.iaLunaActive ? '🟢' : '🔴';
  
  await m.reply(`${emoji} *IA de Luna-Bot*\n\nEstado: ${status}\n\n${settings.iaLunaActive ? '• El bot responderá a menciones y mensajes privados' : '• El bot NO responderá automáticamente\n• Los comandos normales siguen funcionando'}`);
};

handler.help = ['toggleia', 'iaon', 'iaoff'];
handler.tags = ['owner'];
handler.command = /^(toggleia|iaon|iaoff)$/i;
handler.owner = true;

export default handler;