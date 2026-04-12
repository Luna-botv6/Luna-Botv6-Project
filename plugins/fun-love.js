import fs from 'fs'

const handler = async (m, { args, usedPrefix, command, conn }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.love

  let user1, user2, name1, name2;
  
  if (m.mentionedJid && m.mentionedJid.length >= 2) {
    user1 = m.mentionedJid[0];
    user2 = m.mentionedJid[1];
  } else if (m.mentionedJid && m.mentionedJid.length === 1) {
    user1 = m.mentionedJid[0];
    user2 = m.sender;
  } else if (args.length >= 2) {
    name1 = args[0];
    name2 = args.slice(1).join(' ');
  } else {
    return m.reply(`${tradutor.texto1}\n${usedPrefix + command} <@usuario1> <@usuario2>\n${usedPrefix + command} <nombre1> <nombre2>\n\n${tradutor.texto2}\n${usedPrefix + command} @juan @maria\n${usedPrefix + command} Juan Maria`);
  }

  if (user1 && user2) {
    try {
      const contact1 = await conn.getContact(user1);
      name1 = contact1.notify || contact1.name || user1.split('@')[0];
    } catch {
      name1 = user1.split('@')[0];
    }

    try {
      const contact2 = await conn.getContact(user2);
      name2 = contact2.notify || contact2.name || user2.split('@')[0];
    } catch {
      name2 = user2.split('@')[0];
    }
  }

  const percentage = Math.floor(Math.random() * 101);
  const loveBarLength = 10;
  const filledHearts = Math.round((percentage / 100) * loveBarLength);
  const emptyHearts = loveBarLength - filledHearts;
  const loveBar = '❤️'.repeat(filledHearts) + '🤍'.repeat(emptyHearts);

  let mensajeFinal = '';
  if (percentage > 90) mensajeFinal = tradutor.texto3;
  else if (percentage > 70) mensajeFinal = tradutor.texto4;
  else if (percentage > 50) mensajeFinal = tradutor.texto5;
  else if (percentage > 30) mensajeFinal = tradutor.texto6;
  else mensajeFinal = tradutor.texto7;

  let resultText;
  
  if (user1 && user2) {
    resultText = `
╭━━━〔 *💕 ${tradutor.texto8}* 〕━━━⬣
┃
┃ *👥 ${tradutor.texto9}:*
┃ • @${user1.split('@')[0]}
┃ • @${user2.split('@')[0]}
┃
┃ *💖 ${tradutor.texto10}:* ${percentage}%
┃ ${loveBar}
┃
┃ *🔮 ${tradutor.texto11}:*
┃ ${mensajeFinal}
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

💬 ${getLoveMessage(percentage, tradutor)}
    `.trim();
    
    await m.reply(resultText, null, { mentions: [user1, user2] });
  } else {
    resultText = `
╭━━━〔 *💕 ${tradutor.texto8}* 〕━━━⬣
┃
┃ *👥 ${tradutor.texto9}:*
┃ • ${name1}
┃ • ${name2}
┃
┃ *💖 ${tradutor.texto10}:* ${percentage}%
┃ ${loveBar}
┃
┃ *🔮 ${tradutor.texto11}:*
┃ ${mensajeFinal}
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

💬 ${getLoveMessage(percentage, tradutor)}
    `.trim();
    
    await m.reply(resultText);
  }
};

function getLoveMessage(percentage, tradutor) {
  if (percentage >= 95) return tradutor.texto12;
  if (percentage >= 85) return tradutor.texto13;
  if (percentage >= 75) return tradutor.texto14;
  if (percentage >= 65) return tradutor.texto15;
  if (percentage >= 55) return tradutor.texto16;
  if (percentage >= 45) return tradutor.texto17;
  if (percentage >= 35) return tradutor.texto18;
  if (percentage >= 25) return tradutor.texto19;
  if (percentage >= 15) return tradutor.texto20;
  return tradutor.texto21;
}

handler.help = ['love <@usuario1> <@usuario2>', 'love <nombre1> <nombre2>'];
handler.tags = ['fun'];
handler.command = /^love$/i;

export default handler;