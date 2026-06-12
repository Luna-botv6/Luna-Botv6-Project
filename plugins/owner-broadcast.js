import {randomBytes} from 'crypto';

const handler = async (m, {conn, command, participants, usedPrefix, text}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_broadcast;

  if (!text) return tradutor.texto1;
  const fkontak = {'key': {'participants': '0@s.whatsapp.net', 'remoteJid': 'status@broadcast', 'fromMe': false, 'id': 'Halo'}, 'message': {'contactMessage': {'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${conn.user.jid.split('@')[0]}:${conn.user.jid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}, 'participant': '0@s.whatsapp.net'};
  const cc4 = text ? m : m.quoted ? await m.getQuotedObj() : false || m;
  const teks4 = text ? text : cc4.text;
  const groups2 = Object.keys(await conn.groupFetchAllParticipating());
  //close const chats2 = Object.keys(global.db.data.users).filter((user) => user.endsWith('@s.whatsapp.net'));
  await conn.reply(m.chat, tradutor.texto2, m);
  const start2 = new Date().getTime();
  const usersTag2 = participants.map((u) => conn.decodeJid(u.id));
  //close let totalPri2 = 0;
  for (let i = 0; i < groups2.length; i++) {
    const group = groups2[i];
    const delay = i * 4000;
    setTimeout(async () => {
      await conn.reply(group, tradutor.texto3[0] + teks4, {mentions: usersTag2}, {quoted: fkontak});
    }, delay);
  }
  //close for (const user of chats2) {
  //close   await new Promise((resolve) => setTimeout(resolve, 2000));
  //close   await conn.reply(user, tradutor.texto3[1] + teks4, fkontak, null);
  //close   totalPri2++;
  //close   if (totalPri2 >= 500000) {
  //close     break;
  //close   }
  //close }
  const end2 = new Date().getTime();
  //close const totalPrivate2 = chats2.length;
  const totalPrivate2 = 0;
  const totalGroups2 = groups2.length;
  const total2 = totalGroups2;
  let time2 = Math.floor((end2 - start2) / 1000);
  if (time2 >= 60) {
    const minutes = Math.floor(time2 / 60);
    const seconds = time2 % 60;
    time2 = `${minutes} minutos y ${seconds} segundos`;
  } else {
    time2 = `${time2} segundos`;
  }
  await m.reply(`${tradutor.texto4[0]}
\`\`\`${tradutor.texto4[2]}   ${totalGroups2}\`\`\`
\`\`\`${tradutor.texto4[3]}   ${total2}\`\`\`\n\n${tradutor.texto4[4]} ${time2}*`);
};
handler.help = ['broadcast', 'bc'].map((v) => v + ' <teks>');
handler.tags = ['owner'];
handler.command = /^(comunicar|comunicado|broadcastall)$/i;
handler.owner = true;

export default handler;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);
const randomID = (length) => randomBytes(Math.ceil(length * .5)).toString('hex').slice(0, length);
