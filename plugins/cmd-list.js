import fs from 'fs';


const handler = async (m, {conn}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.cmd_list;

  conn.reply(m.chat, `
*${tradutor.texto1}*

${Object.entries(global.db.data.sticker).map(([key, value], index) => `*${index + 1}.-*\n*𝙲𝙾𝙳𝙸𝙶𝙾:* ${value.locked ? `*(𝚋𝚕𝚘𝚚𝚞𝚎𝚊𝚍𝚘)* ${key}` : key}\n*𝙲𝙾𝙼𝙰𝙽𝙳𝙾/𝚃𝙴𝚇𝚃𝙾* ${value.text}`).join('\n\n')}
`.trim(), null, {mentions: Object.values(global.db.data.sticker).map((x) => x.mentionedJid).reduce((a, b) => [...a, ...b], [])});
};
handler.command = ['listcmd', 'cmdlist'];
handler.rowner = true;
export default handler;
