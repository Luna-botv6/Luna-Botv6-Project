const cooldowns = new Map();
const handler = async (m, { conn, participants, args, isOwner }) => {
  const chatId = m.chat;
  const cooldownTime = 2 * 60 * 1000;
  const now = Date.now();
  const groupMetadata = await conn.groupMetadata(chatId);
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
  let realUserJid = m.sender;
  if (m.sender.includes('@lid')) {
    const pdata = groupMetadata.participants.find(p => p.lid === m.sender);
    if (pdata && pdata.id) realUserJid = pdata.id;
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
  cooldowns.set(chatId, now);
  const messageText = args.join(' ') || '*¡Atención!*';
  let teks = `┏━━━ ⸢ Tag All ⸣ ━━━\n`;
  teks += `${messageText}\n\n`;
  
  const mentions = [];
  for (const mem of groupMetadata.participants) {
    const memberId = mem.id;
    if (memberId) {
      const memberNum = memberId.split('@')[0];
      teks += `┣➥ @${memberNum}\n`;
      mentions.push(memberId);
    }
  }
  
  teks += `┗━━━━━━━━━━━━━━━━\n`;
  teks += `*└* Luna-Botv6 - 𝐁𝐨𝐭\n\n*▌│█║▌║▌║║▌║▌║▌║█*`;
  
  await conn.sendMessage(chatId, { text: teks, mentions: mentions });
};
handler.help = ['tagall <mensaje>'];
handler.tags = ['group'];
handler.command = /^(tagall|invocar|invocacion|todos|invocación)$/i;
handler.group = true;
export default handler;