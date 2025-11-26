const handler = async (m, { conn, usedPrefix }) => {
  if (!global.muted || global.muted.length === 0) return m.reply('*[⚠] No hay usuarios muteados*');

  const groupMuted = global.muted.filter(key => key.includes(`${m.chat}_`));
  
  if (groupMuted.length === 0) {
    return m.reply('*[⚠] No hay usuarios muteados en este grupo*');
  }

  let mensaje = '*👤 USUARIOS MUTEADOS*\n\n';
  
  groupMuted.forEach((muteKey, index) => {
    const user = muteKey.split('_')[1];
    const numero = user.split('@')[0];
    mensaje += `${index + 1}. @${numero}\n`;
  });

  mensaje += `\n*Total:* ${groupMuted.length} usuario(s) muteado(s)`;
  
  const mentions = groupMuted.map(key => key.split('_')[1]);
  await m.reply(mensaje, null, { mentions });
};

handler.help = ['listamute'];
handler.tags = ['group'];
handler.command = /^listamute$/i;
handler.group = true;

export default handler;