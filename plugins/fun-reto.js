import fs from 'fs'

const handler = async (m, {conn}) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`))
  const tradutor = _translate.plugins.fun_reto

  global.bucin = tradutor.texto1;

  conn.reply(m.chat, `${tradutor.texto2}\n*“${pickRandom(global.bucin)}”*\n${tradutor.texto3}`, m);
};

handler.help = ['reto'];
handler.tags = ['fun'];
handler.command = /^reto/i;

export default handler;

function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())];
}
