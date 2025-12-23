import {generateWAMessageFromContent} from "@whiskeysockets/baileys";
import * as fs from 'fs';
const cooldowns = new Map();
const handler = async (m, {conn, text, isOwner, isAdmin}) => {
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
  
  const users = groupMetadata.participants.map((u) => u.id);
  
  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || '';
  const isMedia = /image|video|sticker|audio/.test(mime);
  
  let finalText = text || 'Hola :D';
  let finalUsers = [...users];
  
  if (m.quoted) {
    let quotedText = quoted.text || '';
    
    if (quotedText) {
      const mentionMatches = quotedText.match(/@\d+/g) || [];
      
      for (const match of mentionMatches) {
        const userId = match.replace('@', '');
        
        const participant = groupMetadata.participants.find(p => {
          const lidMatch = p.lid && p.lid.startsWith(userId);
          const idMatch = p.id && p.id.includes(userId);
          return lidMatch || idMatch;
        });
        
        if (participant) {
          const realNumber = participant.id.split('@')[0];
          const jid = participant.id;
          
          quotedText = quotedText.replace(match, `@${realNumber}`);
          finalUsers.push(jid);
        } else {
          const validJid = userId + '@s.whatsapp.net';
          finalUsers.push(validJid);
        }
      }
      
      finalText = text ? `${quotedText}\n\n${text}` : quotedText;
    }
  }
  
  const uniqueUsers = [...new Set(finalUsers)];
  
  try {
    if (isMedia && quoted.mtype === 'imageMessage') {
      const mediax = await quoted.download?.();
      await conn.sendMessage(m.chat, {image: mediax, mentions: uniqueUsers, caption: finalText}, {quoted: m});
    } else if (isMedia && quoted.mtype === 'videoMessage') {
      const mediax = await quoted.download?.();
      await conn.sendMessage(m.chat, {video: mediax, mentions: uniqueUsers, mimetype: 'video/mp4', caption: finalText}, {quoted: m});
    } else if (isMedia && quoted.mtype === 'audioMessage') {
      const mediax = await quoted.download?.();
      await conn.sendMessage(m.chat, {audio: mediax, mentions: uniqueUsers, mimetype: 'audio/mpeg', fileName: `Hidetag.mp3`}, {quoted: m});
    } else if (isMedia && quoted.mtype === 'stickerMessage') {
      const mediax = await quoted.download?.();
      await conn.sendMessage(m.chat, {sticker: mediax, mentions: uniqueUsers}, {quoted: m});
    } else {
      await conn.sendMessage(m.chat, {text: finalText, mentions: uniqueUsers}, {quoted: m});
    }
  } catch (e) {
    console.error('Error enviando:', e.message);
    await m.reply('Error al enviar el mensaje: ' + e.message);
  }
};
handler.command = /^(hidetag|notificar|notify|n)$/i;
handler.group = true;
export default handler;
