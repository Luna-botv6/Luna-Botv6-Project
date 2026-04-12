import { isUserMuted } from './gc-mute.js';

export const all = async (m, { conn }) => {
  try {
    if (!m.key?.remoteJid?.endsWith('@g.us')) return;
    if (m.key?.fromMe) return;
    const chat = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    if (!isUserMuted(chat, sender)) return;
    const _ownerNums = (global.owner || []).map(o => String(Array.isArray(o) ? o[0] : o));
    const _lidOwners = (global.lidOwners || []).map(x => String(x));
    const _isOwner = _ownerNums.some(n => sender.includes(n)) || _lidOwners.some(n => sender.includes(n));
    if (_isOwner) return;
    await conn.sendMessage(chat, { delete: m.key });
  } catch (e) {}
};
