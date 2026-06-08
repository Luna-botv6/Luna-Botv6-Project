import axios from 'axios';


const handler = async (m, {
  conn,
  args,
  usedPrefix,
  command,
}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.random_navidad;

  const res = (await axios.get('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/navidad.json')).data;
  const mystic = await res[Math.floor(res.length * Math.random())];
  conn.sendMessage(m.chat, {
    image: {
      url: mystic,
    },
    caption: tradutor.texto1,
  }, {
    quoted: m,
  });
  // conn.sendButton(m.chat, `_Navidad 🧑‍🎄_`, author, mystic, [['🔄 𝚂𝙸𝙶𝚄𝙸𝙴𝙽𝚃𝙴 🔄', `${usedPrefix + command}`]], m)
};
handler.help = ['navidad'];
handler.tags = ['internet'];
handler.command = /^(navidad)$/i;
export default handler;
