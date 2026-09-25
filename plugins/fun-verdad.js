import fs from 'fs';


const handler = async (m, {conn}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.fun_verdad;

  global.verdad = tradutor.texto3;

  conn.reply(m.chat, `*┌────「 𝚅𝙴𝚁𝙳𝙰𝙳 」─*\n*“${pickRandom(global.verdad)}”*\n*└────「 𝙼𝚈𝚂𝚃𝙸𝙲 」─*`, m);
};
handler.help = ['verdad'];
handler.tags = ['fun'];
handler.command = /^verdad/i;
export default handler;

function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())];
}


