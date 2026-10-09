const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRADAS = 800;

const store = new Map();

function soloDigitos(valor) {
  return String(valor || '').split('@')[0].replace(/\D/g, '');
}

function clavesDe(chatId, jids) {
  const lista = Array.isArray(jids) ? jids : [jids];
  const salida = [];
  for (const jid of lista) {
    const digitos = soloDigitos(jid);
    if (digitos.length >= 8) salida.push(`${chatId}_${digitos}`);
  }
  return [...new Set(salida)];
}

function limpiar() {
  const ahora = Date.now();
  for (const [clave, valor] of store) {
    if (!valor || ahora - (valor.ts || 0) > TTL_MS) store.delete(clave);
  }
  while (store.size > MAX_ENTRADAS) store.delete(store.keys().next().value);
}

export function candidatosParticipante(participant) {
  if (!participant) return [];
  if (typeof participant === 'string') return [participant];
  return [participant.phoneNumber, participant.id, participant.jid, participant.lid].filter(Boolean);
}

export function marcarMotivo(chatId, jids, datos = {}) {
  const registro = {
    tipo: String(datos.tipo || 'otro'),
    motivo: String(datos.motivo || '').slice(0, 200),
    autor: datos.autor ? String(datos.autor) : '',
    autorNombre: String(datos.autorNombre || '').slice(0, 40),
    ts: Date.now()
  };
  for (const clave of clavesDe(chatId, jids)) store.set(clave, registro);
  limpiar();
  return registro;
}

export function tomarMotivo(chatId, jids) {
  const claves = clavesDe(chatId, jids);
  for (const clave of claves) {
    const valor = store.get(clave);
    if (!valor) continue;
    for (const k of claves) store.delete(k);
    return valor;
  }
  return null;
}

export function mismosDigitos(a, b) {
  const da = soloDigitos(a);
  const db = soloDigitos(b);
  return !!da && da === db;
}

export const leaveReason = {
  marcarMotivo,
  tomarMotivo,
  mismosDigitos,
  candidatosParticipante
};

export default leaveReason;
