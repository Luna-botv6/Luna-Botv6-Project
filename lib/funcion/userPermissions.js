import { isOwnerJid, isSubOwnerJid } from './system-owners.js';
import { esSubbot } from './subbot-seguridad.js';

export function checkUserPermissions(m, conn) {
  if (esSubbot(conn)) {
    const prems = global.db?.data?.users?.[m.sender]?.premiumTime > 0;
    return { isROwner: false, isOwner: false, isSubOwner: false, isMods: false, isPrems: !!prems, isDuenoSubbot: m?.fromMe === true };
  }
  const isROwner = isOwnerJid(m.sender, conn);
  const isOwner = isROwner || m.fromMe;
  const isSubOwner = isROwner ? false : isSubOwnerJid(m.sender, conn);
  const isMods = isOwner || global.mods?.map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')?.includes(m.sender);
  const isPrems = isROwner || isOwner || isMods || global.db?.data?.users?.[m.sender]?.premiumTime > 0;

  return { isROwner, isOwner, isSubOwner, isMods, isPrems };
}
