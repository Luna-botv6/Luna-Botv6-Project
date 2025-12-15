import {generateWAMessageFromContent} from "@whiskeysockets/baileys";
import * as fs from 'fs';

const cooldowns = new Map();

const handler = async (m, {conn, text, participants, isOwner, isAdmin}) => {
  const cooldownTime = 2 * 60 * 1000;
  const now = Date.now();
  
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
  
  const senderJid = realUserJid.replace('@s.whatsapp.net', '');
  const isLidOwner = global.lidOwners && global.lidOwners.includes(senderJid);
  const isGlobalOwner = global.owner && global.owner.some(([num]) => num === senderJid);
  
  if (!isUserAdmin && !isOwner && !isLidOwner && !isGlobalOwner) {
    return m.reply('Este comando solo puede ser usado por administradores del grupo.');
  }
  
  if (!isOwner && !isLidOwner && !isGlobalOwner) {
    const userCooldownKey = `${m.chat}_${m.sender}`;
    
    if (cooldowns.has(userCooldownKey)) {
      const expirationTime = cooldowns.get(userCooldownKey) + cooldownTime;
      if (now < expirationTime) {
        const timeLeft = Math.ceil((expirationTime - now) / 1000);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return m.reply(`Debes esperar ${minutes}m ${seconds}s antes de usar este comando nuevamente.`);
      }
    }
    cooldowns.set(userCooldownKey, now);
  }
  
  const users = participants.map((u) => conn.decodeJid(u.id));
  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || '';
  const isMedia = /image|video|sticker|audio/.test(mime);
  
  let finalText = text || 'Hola :D';
  
  if (m.quoted) {
    const quotedText = quoted.text || '';
    if (quotedText && !isMedia) {
      finalText = text ? `${quotedText}\n\n${text}` : quotedText;
    }
  }
  
  if (isMedia && quoted.mtype === 'imageMessage') {
    const mediax = await quoted.download?.();
    await conn.sendMessage(m.chat, {image: mediax, mentions: users, caption: finalText}, {quoted: m});
  } else if (isMedia && quoted.mtype === 'videoMessage') {
    const mediax = await quoted.download?.();
    await conn.sendMessage(m.chat, {video: mediax, mentions: users, mimetype: 'video/mp4', caption: finalText}, {quoted: m});
  } else if (isMedia && quoted.mtype === 'audioMessage') {
    const mediax = await quoted.download?.();
    await conn.sendMessage(m.chat, {audio: mediax, mentions: users, mimetype: 'audio/mpeg', fileName: `Hidetag.mp3`}, {quoted: m});
  } else if (isMedia && quoted.mtype === 'stickerMessage') {
    const mediax = await quoted.download?.();
    await conn.sendMessage(m.chat, {sticker: mediax, mentions: users}, {quoted: m});
  } else {
    await conn.sendMessage(m.chat, {text: finalText, mentions: users}, {quoted: m});
  }
};

handler.command = /^(hidetag|notificar|notify|n)$/i;
handler.group = true;

export default handler;
