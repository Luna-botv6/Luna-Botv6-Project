import { isOwnerJid } from './system-owners.js';

export function isProtectedOwner(jid, phoneNumber, conn) {
  if (!jid && !phoneNumber) return false;
  return Boolean(isOwnerJid(jid || phoneNumber, conn || global.conn));
}

export function resolveTargetForOwnerCheck(jid, participants) {
  if (!jid) return { jid: null, phoneNumber: null };
  if (!String(jid).includes('@lid')) return { jid, phoneNumber: jid };
  const found = (participants || []).find(p => p.id === jid || p.lid === jid);
  return { jid, phoneNumber: found?.phoneNumber || found?.id || null };
}
