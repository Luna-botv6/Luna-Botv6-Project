export function datosLlamadaGrupo(call) {
  if (!call || call.status !== 'offer') return null;
  const grupoJid = call.groupJid || (call.isGroup ? call.chatId : null);
  if (!call.isGroup || !grupoJid) return null;
  return {
    grupoJid,
    autorJid: call.from || null,
    autorNumero: String(call.callerPn || '').replace(/\D/g, '') || null,
    tipo: call.isVideo ? 'video' : 'voz',
    callId: call.id || null
  };
}

export function llamadaAGolpear(config, call) {
  const datos = datosLlamadaGrupo(call);
  if (!datos) return null;
  if (!config?.grupcall) return null;
  return datos;
}
