function digitos(jid) {
  return String(jid || '').split('@')[0].replace(/\D/g, '');
}
export function esMiembroDelGrupo(participants, userJid) {
  const yo = digitos(userJid);
  if (!yo || !Array.isArray(participants)) return false;
  return participants.some((p) => {
    if (!p) return false;
    if (typeof p === 'string') return digitos(p) === yo;
    return (p.id && digitos(p.id) === yo) || (p.lid && digitos(p.lid) === yo) || (p.phoneNumber && digitos(p.phoneNumber) === yo);
  });
}
export function etiquetaConexion(via, numero) {
  if (!via) return 'principal';
  return 'subbot ' + (numero || via);
}
