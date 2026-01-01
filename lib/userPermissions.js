export function checkUserPermissions(m, conn) {
  const senderJid = conn.decodeJid(m.sender || '');
  const senderNum = senderJid.replace(/[^0-9]/g, '');
  
  const ownerNums = (global.owner || []).map(([num]) => String(num || '').replace(/\D/g, '')).filter(Boolean);
  const lidNums = (global.lidOwners || []).map(x => String(x || '').replace(/\D/g, '')).filter(Boolean);
  
  const isROwner = ownerNums.includes(senderNum) || lidNums.includes(senderNum);
  const isOwner = isROwner || m.fromMe;
  const isMods = isOwner || global.mods?.map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')?.includes(m.sender);
  const isPrems = isROwner || isOwner || isMods || global.db.data.users[m.sender]?.premiumTime > 0;

  return { isROwner, isOwner, isMods, isPrems };
}