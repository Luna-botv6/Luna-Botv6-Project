import * as fs from 'fs';

const cooldowns = new Map();

const handler = async (m, {isOwner, isAdmin, conn, text, participants, args, command, usedPrefix}) => {
  const chatId = m.chat;
  const cooldownTime = 2 * 60 * 1000; // 2 minutos en milisegundos
  const now = Date.now();
  
  if (cooldowns.has(chatId)) {
    const expirationTime = cooldowns.get(chatId) + cooldownTime;
    if (now < expirationTime) {
      const timeLeft = Math.ceil((expirationTime - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return m.reply(`⏰ Debes esperar ${minutes}m ${seconds}s antes de usar este comando nuevamente.`);
    }
  }
  
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.gc_tagall

  if (usedPrefix == 'a' || usedPrefix == 'A') return;
  if (!(isAdmin || isOwner)) {
    global.dfail('admin', m, conn);
    throw false;
  }
  
  cooldowns.set(chatId, now);
  
  const pesan = args.join` `;
  const oi = `${tradutor.texto1[0]} ${pesan}`;
  let teks = `${tradutor.texto1[1]}  ${oi}\n\n${tradutor.texto1[2]}\n`;
  for (const mem of participants) {
    teks += `┣➥ @${mem.id.split('@')[0]}\n`;
  }
  teks += `*└* Luna-Botv5- 𝐁𝐨𝐭\n\n*▌│█║▌║▌║║▌║▌║▌║█*`;
  conn.sendMessage(m.chat, {text: teks, mentions: participants.map((a) => a.id)} );
};

handler.help = ['tagall <mesaje>', 'invocar <mesaje>'];
handler.tags = ['group'];
handler.command = /^(tagall|invocar|invocacion|todos|invocación)$/i;
handler.admin = true;
handler.group = true;
export default handler;