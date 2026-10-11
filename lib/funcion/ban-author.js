export function rolActor({ isROwner, isOwner, isSubOwner } = {}) {
  if (isROwner || isOwner) return 'owner';
  if (isSubOwner) return 'subowner';
  return null;
}

export function puedeDesbanear(rol, bannedRole) {
  if (rol === 'owner') return true;
  if (rol !== 'subowner') return false;
  if (bannedRole === 'owner' || bannedRole === undefined || bannedRole === null || bannedRole === '') return false;
  return true;
}
