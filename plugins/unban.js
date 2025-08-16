function handler(m, { conn, text, isOwner }) {
  if (!isOwner) return m.reply('🚫 Solo el owner puede usar esto.');

  const numero = text.replace(/\D/g, '') + '@s.whatsapp.net';

  if (!global.db.data.baneados || !global.db.data.baneados[numero])
    return m.reply('❌ Ese número no está en la lista de baneados.');

  delete global.db.data.baneados[numero];

  conn.updateBlockStatus(numero, 'unblock');
  m.reply(`✅ Usuario desbloqueado: ${numero}`);
}

handler.command = ['desbloquear'];
handler.rowner = true;
handler.help = ['desbloquear <número>'];
handler.tags = ['owner'];

export default handler;

