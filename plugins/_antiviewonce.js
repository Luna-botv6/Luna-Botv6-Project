import { readFile } from 'fs/promises';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export async function before(m, {conn}) {
  if (m.isBaileys || !m.message) return;
  if (!m.message.viewOnceMessageV2 && !m.message.viewOnceMessage) return;
  
  let ownerConfig = {};
  try {
    const configData = await readFile('./database/funciones-owner.json', 'utf8');
    ownerConfig = JSON.parse(configData);
  } catch (e) {
    console.error('Error leyendo funciones-owner.json:', e.message);
    return;
  }
  
  if (!ownerConfig.vierwimage) return;
  
  try {
    const msg = m.message.viewOnceMessageV2?.message || m.message.viewOnceMessage?.message;
    if (!msg) return;
    
    const type = Object.keys(msg)[0];
    const media = msg[type];
    
    let buffer;
    if (type === 'imageMessage') {
      buffer = await downloadContentFromMessage(media, 'image');
    } else if (type === 'videoMessage') {
      buffer = await downloadContentFromMessage(media, 'video');
    } else {
      return;
    }
    
    const chunks = [];
    for await (const chunk of buffer) {
      chunks.push(chunk);
    }
    const fullBuffer = Buffer.concat(chunks);
    
    const caption = media.caption || '👁️ *Mensaje de una sola vista capturado*';
    const sender = m.sender.split('@')[0];
    const chat = m.isGroup ? (await conn.groupMetadata(m.chat).catch(() => ({subject: 'Grupo'}))).subject : 'Chat privado';
    
    const messageText = `🔍 *ANTI VIEW ONCE*\n\n👤 *De:* @${sender}\n📍 *En:* ${chat}\n📅 *Fecha:* ${new Date().toLocaleString('es-ES')}\n\n📝 *Mensaje:*\n${caption}`;
    
    for (const [num] of global.owner) {
      const ownerJid = num + '@s.whatsapp.net';
      if (type === 'imageMessage') {
        await conn.sendMessage(ownerJid, {
          image: fullBuffer,
          caption: messageText,
          mentions: [m.sender]
        });
      } else if (type === 'videoMessage') {
        await conn.sendMessage(ownerJid, {
          video: fullBuffer,
          caption: messageText,
          mentions: [m.sender]
        });
      }
    }
    
    console.log(`👁️ View once capturado de: ${sender}`);
  } catch (error) {
    console.error('Error capturando view once:', error.message);
  }
}