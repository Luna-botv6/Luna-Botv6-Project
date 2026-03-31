import { isFunctionEnabled } from '../lib/owner-funciones.js';

export async function before(m, { conn, isOwner, isROwner }) {
  if (m.fromMe) return false;
  if (m.isGroup) return false;
  if (!m.message) return false;
  if (!isFunctionEnabled('antiprivado')) return false;

  const sender = m.sender || m.key?.remoteJid || '';
  const ownerNums = (global.owner || []).map(o => String(Array.isArray(o) ? o[0] : o));
  const lidOwners = (global.lidOwners || []).map(x => String(x));

  const _isOwner = isOwner || isROwner
    || ownerNums.some(n => sender.includes(n))
    || lidOwners.some(n => sender.includes(n));

  if (_isOwner) return false;

  m.text = '';
  m.commandSinPrefijo = '';
  m.isMentionedBot = false;
  try { await conn.updateBlockStatus(sender, 'block'); } catch {}
  return true;
}