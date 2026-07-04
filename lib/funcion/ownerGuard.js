export function isProtectedOwner(jid, phoneNumber) {
  if (!jid && !phoneNumber) return false;
  const jidNum = jid ? String(jid).replace(/[^0-9]/g, '') : null;
  const phoneNum = phoneNumber ? String(phoneNumber).replace(/[^0-9]/g, '') : null;
  const candidates = [jidNum, phoneNum].filter(Boolean);
  const owners = (global.owner || []).map(o => String(Array.isArray(o) ? o[0] : o).replace(/[^0-9]/g, ''));
  const lidOwners = (global.lidOwners || []).map(o => String(o).replace(/[^0-9]/g, ''));
  const lidList = (global.lid || []).map(o => String(o).replace(/[^0-9]/g, ''));
  return candidates.some(n => owners.includes(n) || lidOwners.includes(n) || lidList.includes(n));
}

export function resolveTargetForOwnerCheck(jid, participants) {
  if (!jid) return { jid: null, phoneNumber: null };
  if (!String(jid).includes('@lid')) return { jid, phoneNumber: jid };
  const found = (participants || []).find(p => p.id === jid || p.lid === jid);
  return { jid, phoneNumber: found?.phoneNumber || found?.id || null };
}
