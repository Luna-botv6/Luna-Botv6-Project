export function datosLlamada(call) {
  if (!call || call.status !== 'offer' || !call.isGroup) return null;
  return {
    autorJid: call.from || null,
    autorNumero: String(call.callerPn || '').replace(/\D/g, '') || null,
    tipo: call.isVideo ? 'video' : 'voz',
    callId: call.id || null
  };
}

export function soloDigitos(jid) {
  return String(jid || '').split('@')[0].replace(/\D/g, '');
}

export function participanteEsAutor(participantes, autorJid, autorNumero) {
  const autor = soloDigitos(autorJid);
  const numero = String(autorNumero || '').replace(/\D/g, '');
  if (!autor && !numero) return null;
  for (const p of participantes || []) {
    const ids = [p?.phoneNumber, p?.id, p?.lid, p?.jid].filter(Boolean).map(soloDigitos);
    if (autor && ids.includes(autor)) return p;
    if (numero && ids.includes(numero)) return p;
  }
  return null;
}
