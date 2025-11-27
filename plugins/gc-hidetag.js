import { generateWAMessageFromContent } from "@whiskeysockets/baileys";

const cooldowns = new Map();

const handler = async (m, { conn, text, participants, isOwner }) => {
  const cooldownTime = 2 * 60 * 1000;
  const now = Date.now();

  const groupMetadata = await conn.groupMetadata(m.chat);
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);

  let realUserJid = m.sender;
  if (m.sender.includes('@lid')) {
    const pdata = groupMetadata.participants.find(p => p.lid === m.sender);
    if (pdata && pdata.id) realUserJid = pdata.id;
  }

  const senderJid = realUserJid.replace('@s.whatsapp.net', '');
  const isLidOwner = global.lidOwners && global.lidOwners.includes(senderJid);
  const isGlobalOwner = global.owner && global.owner.some(([num]) => num === senderJid);
  const isUserAdmin = groupAdmins.includes(realUserJid);

  if (!isUserAdmin && !isOwner && !isLidOwner && !isGlobalOwner)
    return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.');

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

  const resolveLidToId = (jid) => {
    if (jid.includes('@lid')) {
      const participant = groupMetadata.participants.find(p => p.lid === jid);
      return participant ? participant.id : jid;
    }
    return jid;
  };

  try {
    const users = participants.map(u => resolveLidToId(u.id));
    const quoted = m.quoted || m;
    let finalText = text || (quoted.text || '*Hola :D*');

    const mentionMatches = finalText.match(/@(\d+)/g);
    if (mentionMatches) {
      mentionMatches.forEach(match => {
        const number = match.substring(1);
        const realJid = resolveLidToId(`${number}@lid`);
        finalText = finalText.replace(new RegExp(`@${number}`, 'g'), `@${realJid.split('@')[0]}`);
      });
    }

    const msg = conn.cMod(
      m.chat,
      generateWAMessageFromContent(
        m.chat,
        { [quoted.mtype || 'extendedTextMessage']: quoted.message || { text: finalText } },
        { quoted: m, userJid: conn.user.id }
      ),
      finalText,
      conn.user.jid,
      { mentions: users }
    );
    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });

  } catch {
    const quoted = m.quoted || m;
    const users = participants.map(u => resolveLidToId(u.id));
    const mime = quoted.mimetype || '';
    const isMedia = /image|video|sticker|audio/.test(mime);
    const spacer = String.fromCharCode(8206).repeat(850);
    let htextos = text || quoted.text || '*Hola :D*';

    const mentionMatches = htextos.match(/@(\d+)/g);
    if (mentionMatches) {
      mentionMatches.forEach(match => {
        const number = match.substring(1);
        const realJid = resolveLidToId(`${number}@lid`);
        htextos = htextos.replace(new RegExp(`@${number}`, 'g'), `@${realJid.split('@')[0]}`);
      });
    }

    if (isMedia) {
      const mediaBuffer = await quoted.download?.();
      if (/image/.test(mime)) await conn.sendMessage(m.chat, { image: mediaBuffer, mentions: users, caption: htextos }, { quoted: m });
      else if (/video/.test(mime)) await conn.sendMessage(m.chat, { video: mediaBuffer, mentions: users, mimetype: 'video/mp4', caption: htextos }, { quoted: m });
      else if (/audio/.test(mime)) await conn.sendMessage(m.chat, { audio: mediaBuffer, mentions: users, mimetype: 'audio/mpeg', fileName: 'Hidetag.mp3' }, { quoted: m });
      else if (/sticker/.test(mime)) await conn.sendMessage(m.chat, { sticker: mediaBuffer, mentions: users }, { quoted: m });
    } else {
      await conn.relayMessage(
        m.chat,
        {
          extendedTextMessage: {
            text: `${spacer}\n${htextos}\n`,
            contextInfo: { mentionedJid: users }
          }
        },
        {}
      );
    }
  }
};

handler.command = /^(hidetag|notificar|notify)$/i;
handler.group = true;

export default handler;
