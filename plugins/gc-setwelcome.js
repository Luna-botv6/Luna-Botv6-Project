import * as fs from 'fs';
import { setConfig } from '../lib/funcConfig.js';

const cooldowns = new Map();

const handler = async (m, { isOwner, conn, text, args, usedPrefix }) => {
  const chatId = m.chat;
  const cooldownTime = 2 * 60 * 1000;
  const now = Date.now();

  if (usedPrefix == 'a' || usedPrefix == 'A') return;

  const groupMetadata = await conn.groupMetadata(m.chat);
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);

  let realUserJid = m.sender;

  if (m.sender.includes('@lid')) {
    const participantData = groupMetadata.participants.find(p => p.lid === m.sender);
    if (participantData && participantData.id) {
      realUserJid = participantData.id;
    }
  }

  const isUserAdmin = groupAdmins.includes(realUserJid);

  if (!isUserAdmin && !isOwner) {
    return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.');
  }

  if (cooldowns.has(chatId)) {
    const expirationTime = cooldowns.get(chatId) + cooldownTime;
    if (now < expirationTime) {
      const timeLeft = Math.ceil((expirationTime - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return m.reply(`⏰ Debes esperar ${minutes}m ${seconds}s antes de usar este comando nuevamente.`);
    }
  }

  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_setwelcome;

  if (text) {
    global.db.data.chats[m.chat].sWelcome = text;
    await setConfig(m.chat, { sWelcome: text });
    m.reply(tradutor.texto1);
  } else {
    throw `${tradutor.texto2[0]}\n*- @user (mención)*\n*- @group (nombre de grupo)*\n*- @desc (description de grupo)*`;
  }

  cooldowns.set(chatId, now);
};

handler.help = ['setwelcome <text>'];
handler.tags = ['group'];
handler.command = /^(setwelcome)$/i;
handler.group = true;
export default handler;
