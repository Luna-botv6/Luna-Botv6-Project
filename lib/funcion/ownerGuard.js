import { isOwnerJid, isSubOwnerJid } from './system-owners.js';

export function isProtectedOwner(jid, phoneNumber, conn) {
  if (!jid && !phoneNumber) return false;
  return Boolean(isOwnerJid(jid || phoneNumber, conn || global.conn));
}

export function rolProtegido(jid, phoneNumber, conn) {
  const j = jid || phoneNumber;
  if (!j) return null;
  const c = conn || global.conn;
  if (isOwnerJid(j, c)) return 'owner';
  if (isSubOwnerJid(j, c)) return 'subowner';
  return null;
}

export function resolveTargetForOwnerCheck(jid, participants) {
  if (!jid) return { jid: null, phoneNumber: null };
  if (!String(jid).includes('@lid')) return { jid, phoneNumber: jid };
  const found = (participants || []).find(p => p.id === jid || p.lid === jid);
  return { jid, phoneNumber: found?.phoneNumber || found?.id || null };
}
