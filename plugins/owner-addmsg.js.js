import fs from 'fs';


const handler = async (m, {command, usedPrefix, text}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const tradutor = _translate.plugins.owner_addmsg;

  const M = m.constructor;
  const which = command.replace(/agregar/i, '');
  if (!m.quoted) return m.reply(tradutor.texto1);
  if (!text) return m.reply(`${tradutor.texto2[0]} *${usedPrefix}list${which}* ${tradutor.texto2[1]}`);
  const msgs = global.db.data.msgs;
  if (text in msgs) return m.reply(`*[❗𝐈𝐍𝐅𝐎❗] '${text}' ${tradutor.texto3}`);
  msgs[text] = M.toObject(await m.getQuotedObj());
  m.reply(`${tradutor.texto4[0]} '${text}'${tradutor.texto4[1]} ${usedPrefix}ver${which} ${text}*`);
};
handler.help = ['vn', 'msg', 'video', 'audio', 'img', 'sticker'].map((v) => 'add' + v + ' <text>');
handler.tags = ['database'];
handler.command = /^agregar(vn|msg|video|audio|img|sticker)$/;
handler.rowner = true;
export default handler;
