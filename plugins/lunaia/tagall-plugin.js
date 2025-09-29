import * as fs from 'fs';

const TAGALL_KEYWORDS = ['invoca', 'invocar', 'invocacion', 'todos', 'invocación', 'mencionar todos'];
const cooldowns = new Map();

function canHandle(text) {
  const lowerText = text.toLowerCase();
  return TAGALL_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

async function handle(inputText, context) {
  const { conn, msg, jid, isGroup } = context;
  
  if (!isGroup) {
    await conn.sendMessage(jid, { text: '⚠️ Este comando solo funciona en grupos.' }, { quoted: msg });
    return;
  }

  const chatId = jid;
  const cooldownTime = 2 * 60 * 1000;
  const now = Date.now();
  
  if (cooldowns.has(chatId)) {
    const expirationTime = cooldowns.get(chatId) + cooldownTime;
    if (now < expirationTime) {
      const timeLeft = Math.ceil((expirationTime - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      await conn.sendMessage(jid, { text: `⏰ Debes esperar ${minutes}m ${seconds}s antes de usar este comando nuevamente.` }, { quoted: msg });
      return;
    }
  }

  try {
    const groupMetadata = await conn.groupMetadata(jid);
    const participants = groupMetadata.participants;
    
    const message = inputText.replace(/^(tagall|invocar|invocacion|todos|invocación)/i, '').trim();
    const customMessage = message || 'Atención todos';
    
    let teks = `🌙 *Luna-Botv6-Project*\n\n📢 ${customMessage}\n\n👥 *Participantes:*\n`;
    
    for (const participant of participants) {
      teks += `┣➥ @${participant.id.split('@')[0]}\n`;
    }
    
    teks += `*└* Luna-Botv6-Project 🌙\n\n*▌│█║▌║▌║║▌║▌║▌║█*`;
    
    cooldowns.set(chatId, now);
    
    await conn.sendMessage(jid, {
      text: teks,
      mentions: participants.map((a) => a.id)
    }, { quoted: msg });

  } catch (error) {
    console.error('Error en tagall:', error.message);
    await conn.sendMessage(jid, { text: '⚠️ Error ejecutando el comando. Verifica que soy admin del grupo.' }, { quoted: msg });
  }
}

export default {
  canHandle,
  handle,
  name: 'tagall',
  description: 'Plugin para mencionar todos los miembros del grupo'
};