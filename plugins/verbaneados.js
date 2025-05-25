function handler(m, { conn, isOwner }) {
  if (!isOwner) return m.reply('🚫 Solo el owner puede usar esto.');

  const baneados = global.db.data.baneados || {};
  const keys = Object.keys(baneados);

  if (!keys.length) return m.reply('✅ No hay usuarios bloqueados por spam.');

  let texto = `📛 *Lista de usuarios bloqueados por spam:*\n\n`;

  for (const id of keys) {
    const info = baneados[id];
    const fecha = new Date(info.fecha).toLocaleString();
    texto += `🔸 *@${id.split('@')[0]}*\n• Motivo: ${info.motivo}\n• Fecha: ${fecha}\n• Por: ${info.bloqueadoPor}\n\n`;
  }

  m.reply(texto.trim(), null, {
    mentions: keys
  });
}

handler.command = ['verbaneados'];
handler.rowner = true;
handler.help = ['verbaneados'];
handler.tags = ['owner'];

export default handler;
