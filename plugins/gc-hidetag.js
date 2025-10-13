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
  
  console.log('DEBUG - Sender original:', m.sender);
  console.log('DEBUG - Sender real:', realUserJid);
  console.log('DEBUG - isUserAdmin:', isUserAdmin);
  console.log('DEBUG - isOwner:', isOwner);
  console.log('DEBUG - isLidOwner:', isLidOwner);
  console.log('DEBUG - isGlobalOwner:', isGlobalOwner);
  
  if (!isUserAdmin && !isOwner && !isLidOwner && !isGlobalOwner) {
    return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.');
  }
  
  if (!isOwner && !isLidOwner && !isGlobalOwner) {
    const userCooldownKey = `${m.chat}_${m.sender}`;
    
    if (cooldowns.has(userCooldownKey)) {
      const expirationTime = cooldowns.get(userCooldownKey) + cooldownTime;
      if (now < expirationTime) {
        const timeLeft = Math.ceil((expirationTime - now) / 1000);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return m.reply(`⏰ Debes esperar ${minutes}m ${seconds}s antes de usar este comando nuevamente.`);
      }
    }
    cooldowns.set(userCooldownKey, now);
  }
  
  try {
    const users = participants.map((u) => conn.decodeJid(u.id));
    const q = m.quoted ? m.quoted : m || m.text || m.sender;
    const c = m.quoted ? await m.getQuotedObj() : m.msg || m.text || m.sender;
    const msg = conn.cMod(m.chat, generateWAMessageFromContent(m.chat, {[m.quoted ? q.mtype : 'extendedTextMessage']: m.quoted ? c.message[q.mtype] : {text: '' || c}}, {quoted: m, userJid: conn.user.id}), text || q.text, conn.user.jid, {mentions: users});
    await conn.relayMessage(m.chat, msg.message, {messageId: msg.key.id});
  } catch {
    const users = participants.map((u) => conn.decodeJid(u.id));
    const quoted = m.quoted ? m.quoted : m;
    const mime = (quoted.msg || quoted).mimetype || '';
    const isMedia = /image|video|sticker|audio/.test(mime);
    const more = String.fromCharCode(8206);
    const masss = more.repeat(850);
    const htextos = `${text ? text : '*Hola :D*'}`;
    
    if ((isMedia && quoted.mtype === 'imageMessage') && htextos) {
      var mediax = await quoted.download?.();
      conn.sendMessage(m.chat, {image: mediax, mentions: users, caption: htextos, mentions: users}, {quoted: m});
    } else if ((isMedia && quoted.mtype === 'videoMessage') && htextos) {
      var mediax = await quoted.download?.();
      conn.sendMessage(m.chat, {video: mediax, mentions: users, mimetype: 'video/mp4', caption: htextos}, {quoted: m});
    } else if ((isMedia && quoted.mtype === 'audioMessage') && htextos) {
      var mediax = await quoted.download?.();
      conn.sendMessage(m.chat, {audio: mediax, mentions: users, mimetype: 'audio/mpeg', fileName: `Hidetag.mp3`}, {quoted: m});
    } else if ((isMedia && quoted.mtype === 'stickerMessage') && htextos) {
      var mediax = await quoted.download?.();
      conn.sendMessage(m.chat, {sticker: mediax, mentions: users}, {quoted: m});
    } else {
      await conn.relayMessage(m.chat, {extendedTextMessage: {text: `${masss}\n${htextos}\n`, ...{contextInfo: {mentionedJid: users, externalAdReply: {thumbnail: imagen1, sourceUrl: ''}}}}}, {});
    }
  }
};
handler.command = /^(hidetag|notificar|notify)$/i;
handler.group = true;
export default handler;