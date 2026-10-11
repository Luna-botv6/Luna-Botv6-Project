import { isOwnerJid, isSubOwnerJid } from './system-owners.js';

export function checkUserPermissions(m, conn) {
  const isROwner = isOwnerJid(m.sender, conn);
  const isOwner = isROwner || m.fromMe;
  const isSubOwner = isROwner ? false : isSubOwnerJid(m.sender, conn);
  const isMods = isOwner || global.mods?.map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')?.includes(m.sender);
  const isPrems = isROwner || isOwner || isMods || global.db?.data?.users?.[m.sender]?.premiumTime > 0;

  return { isROwner, isOwner, isSubOwner, isMods, isPrems };
}
