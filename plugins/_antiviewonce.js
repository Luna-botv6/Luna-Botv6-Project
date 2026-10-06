import { readFile } from 'fs/promises';
import { getOwnerNumbers } from '../lib/funcion/system-owners.js';

export async function all(m, { conn }) {
  if (m.isBaileys) return;
  const isVO = !!(m.key?.isViewOnce || m.message?.viewOnceMessage || m.message?.viewOnceMessageV2 || m.message?.viewOnceMessageV2Extension)
  if (!isVO) return;
    console.log('[AVO] ejecutado | isVO:', isVO, '| _isViewOnce:', m._isViewOnce, '| message:', !!m.message)

  let ownerConfig = {};
  try {
    const configData = await readFile('./database/funciones-owner.json', 'utf8');
    ownerConfig = JSON.parse(configData);
  } catch (e) {
    return;
  }
  if (!ownerConfig.vierwimage) return;

  try {
    const full = m.message ? m : await conn.loadMessage(m.key?.id)
    if (!full?.message) return;

    const voMsg =
      full.message?.viewOnceMessage?.message ||
      full.message?.viewOnceMessageV2?.message ||
      full.message?.viewOnceMessageV2Extension?.message
    if (!voMsg) return;

    const innerType = Object.keys(voMsg)[0]
    const innerMsg = voMsg[innerType]
    if (!innerMsg) return;

    const data = await conn.downloadM(
      { [innerType]: innerMsg },
      innerType.replace(/message/i, ''),
      false
    )
    if (!data) return;

    const mime = innerMsg?.mimetype || ''
    const caption = innerMsg?.caption || '👁️ *Mensaje de una sola vista capturado*'
    const sender = m.key?.participant || m.key?.remoteJid || ''
    const senderNum = sender.split('@')[0]
    const chat = m.isGroup
      ? (await conn.groupMetadata(m.chat).catch(() => ({ subject: 'Grupo' }))).subject
      : 'Chat privado'

    const messageText =
      `🔍 *ANTI VIEW ONCE*\n\n` +
      `👤 *De:* @${senderNum}\n` +
      `📍 *En:* ${chat}\n` +
      `📅 *Fecha:* ${new Date().toLocaleString('es-ES')}\n\n` +
      `📝 *Mensaje:*\n${caption}`

    for (const num of getOwnerNumbers()) {
      const ownerJid = num + '@s.whatsapp.net'
      if (/video/.test(mime)) {
        await conn.sendMessage(ownerJid, { video: data, mimetype: 'video/mp4', caption: messageText, mentions: [sender] })
      } else {
        await conn.sendMessage(ownerJid, { image: data, mimetype: 'image/jpeg', caption: messageText, mentions: [sender] })
      }
    }
  } catch (e) {
    console.error('[_antiviewonce] error:', e.message)
  }
}