import { sticker } from '../src/libraries/sticker.js';
import { getConfig } from '../lib/funcConfig.js';

const handler = async (m, { conn }) => {
  if (!m.isGroup) return false;
  if (m.fromMe) return false;
  const msg = m.message || {};
  const imgMsg = msg.imageMessage;
  if (!imgMsg) return false;
  if ((imgMsg.caption || '').trim()) return false;
  let cfg = null;
  try { cfg = getConfig(m.chat); } catch { return false; }
  if (cfg?.autosticker !== true) return false;
  try {
    const buf = await m.download();
    if (!buf?.length) return false;
    const stiker = await sticker(buf, false, global.packname, global.author, ['✨'], { isAiSticker: true });
    if (!stiker) return false;
    const out = Buffer.isBuffer(stiker) ? stiker : Buffer.from(stiker);
    await conn.sendMessage(m.chat, { sticker: out }, { quoted: m });
    return true;
  } catch {
    return false;
  }
};

handler.before = handler;
export default handler;
