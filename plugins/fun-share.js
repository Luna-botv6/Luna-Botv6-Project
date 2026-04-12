import fs from 'fs'

const handler = async (m, { args, conn, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.share

  if (!args.length) return m.reply(`${tradutor.texto1}\n*${usedPrefix + command} [texto del resultado]*`);

  const result = args.join(' ');
  await conn.sendMessage(m.chat, {
    text: `*${tradutor.texto2}:*\n\n${result}`,
    mentions: conn.parseMention(result)
  }, { quoted: m });
};

handler.help = ['share <texto>'];
handler.tags = ['fun'];
handler.command = /^share$/i;

export default handler;

