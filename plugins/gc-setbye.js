import * as fs from 'fs';
import { setConfig } from '../lib/funcConfig.js';

const cooldowns = new Map();

const handler = async (m, { isOwner, conn, text, args, usedPrefix }) => {
  const cooldownTime = 2 * 60 * 1000;
  const now = Date.now();

  if (usedPrefix == 'a' || usedPrefix == 'A') return;

  const groupMetadata = await conn.groupMetadata(m.chat);
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);

  let realUserJid = m.sender;
  if (m.sender.includes('@lid')) {
    const participantData = groupMetadata.participants.find(p => p.lid === m.sender);
    if (participantData && participantData.id) realUserJid = participantData.id;
  }

  const isUserAdmin = groupAdmins.includes(realUserJid);
  if (!isUserAdmin && !isOwner) return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.');

  if (cooldowns.has(m.chat)) {
    const expirationTime = cooldowns.get(m.chat) + cooldownTime;
    if (now < expirationTime) {
      const timeLeft = Math.ceil((expirationTime - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return m.reply(`⏰ Debes esperar ${minutes}m ${seconds}s antes de usar este comando nuevamente.`);
    }
  }

  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_setbye;

  if (!text || text.trim().length === 0) {
    return m.reply(`${tradutor.texto2}\n*- @user ${tradutor.texto3}`);
  }

  global.db.data.chats[m.chat].sBye = text;
  await setConfig(m.chat, { sBye: text });
  m.reply(tradutor.texto1);

  cooldowns.set(m.chat, now);
};

handler.help = ['setbye <text>'];
handler.tags = ['group'];
handler.command = /^(setbye)$/i;
handler.group = true;
export default handler;
