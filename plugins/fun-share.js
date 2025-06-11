const handler = async (m, { args, conn, usedPrefix, command }) => {
  if (!args.length) return m.reply(`Usa el comando así:\n*${usedPrefix + command} [texto del resultado]*`);

  const result = args.join(' ');
  await conn.sendMessage(m.chat, {
    text: `*Resultado compartido:*\n\n${result}`,
    mentions: conn.parseMention(result)
  }, { quoted: m });
};

handler.help = ['share <texto>'];
handler.tags = ['fun'];
handler.command = /^share$/i;

export default handler;

