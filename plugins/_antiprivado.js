import { isFunctionEnabled } from '../lib/owner-funciones.js';
import { isProtectedOwner } from '../lib/funcion/ownerGuard.js';

export async function before(m, { conn, isOwner, isROwner }) {
  if (m.fromMe) return false;
  if (m.isGroup) return false;
  if (!m.message) return false;
  if (!isFunctionEnabled('antiprivado')) return false;

  const sender = m.sender || m.key?.remoteJid || '';
  const _isOwner = isOwner || isROwner || isProtectedOwner(sender, null, conn);

  if (_isOwner) return false;

  m.text = '';
  m.commandSinPrefijo = '';
  m.isMentionedBot = false;
  try { await conn.updateBlockStatus(sender, 'block'); } catch {}
  return true;
}