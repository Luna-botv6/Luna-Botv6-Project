import { isRamAvailable, getRamStatus } from './connection-manager.js';

export const MAX_SUBBOTS = 40;
export const COOLDOWN_MS = 12000;
export const MAX_QR = 3;
export const QR_MS = 45000;
export const MAX_REINTENTOS = 5;
export const RAM_MS = 60000;

const registros = new Map();
const qrIntentos = new Map();
const timers = new Map();
const ramAvisos = new Map();
const eventos = new Map();
const MAX_EVENTOS = 50;
let ramVigilando = false;

export function registrarEvento(userId, texto) {
  if (!eventos.has(userId)) eventos.set(userId, []);
  const lista = eventos.get(userId);
  lista.push({ ts: Date.now(), texto: String(texto) });
  while (lista.length > MAX_EVENTOS) lista.shift();
}

export function ultimosEventos(userId, n = 10) {
  return (eventos.get(userId) || []).slice(-n);
}

export function backoffMs(intento) {
  return Math.min(1000 * Math.pow(2, intento), 30000) + Math.random() * 1000;
}

export function registrar(userId, parche = {}) {
  registros.set(userId, { isConnecting: false, isConnected: false, reintentos: 0, ultimoCambio: Date.now(), ...parche });
}

export function obtener(userId) {
  return registros.get(userId) || null;
}

export function marcar(userId, parche = {}) {
  const actual = registros.get(userId) || {};
  registros.set(userId, { ...actual, ...parche, ultimoCambio: Date.now() });
}

export function conectando(userId) {
  return registros.get(userId)?.isConnecting === true;
}

export function conectado(userId) {
  return registros.get(userId)?.isConnected === true;
}

export function ponerSocket(userId, sock) {
  marcar(userId, { sock });
}

export function socketDe(userId) {
  return registros.get(userId)?.sock || null;
}

export function cerrarSocket(sock) {
  try { sock?.ws?.close(); } catch {}
  try { sock?.ev?.removeAllListeners(); } catch {}
}

export function temporizador(userId, timer) {
  if (!timers.has(userId)) timers.set(userId, new Set());
  timers.get(userId).add(timer);
}

function limpiarTimers(userId) {
  const set = timers.get(userId);
  if (!set) return;
  for (const t of set) {
    try { clearTimeout(t); } catch {}
    try { clearInterval(t); } catch {}
  }
  timers.delete(userId);
}

export function quitar(userId) {
  limpiarTimers(userId);
  cerrarSocket(socketDe(userId));
  registros.delete(userId);
  qrIntentos.delete(userId);
  ramAvisos.delete(userId);
}

export function conteoActivos() {
  let n = 0;
  for (const r of registros.values()) {
    if (r.isConnected && r.sock?.user) n++;
  }
  return n;
}

export function listaIds() {
  return [...registros.keys()];
}

export function intentosQr(userId) {
  return qrIntentos.get(userId) || 0;
}

export function sumarQr(userId) {
  const n = intentosQr(userId) + 1;
  qrIntentos.set(userId, n);
  return n;
}

export function resetQr(userId) {
  qrIntentos.delete(userId);
}

export function alLimiteRam(userId, fn) {
  ramAvisos.set(userId, fn);
  iniciarVigilanciaRam();
}

function iniciarVigilanciaRam() {
  if (ramVigilando) return;
  ramVigilando = true;
  const id = setInterval(async () => {
    if (ramAvisos.size === 0) return;
    if (await isRamAvailable()) return;
    const { heapUsedMB, heapTotalMB } = await getRamStatus();
    for (const [userId, fn] of ramAvisos) {
      if (!conectado(userId)) {
        ramAvisos.delete(userId);
        continue;
      }
      try { await fn({ heapUsedMB, heapTotalMB }); } catch {}
    }
  }, RAM_MS);
  if (id.unref) id.unref();
}

export async function hayEspacio() {
  if (conteoActivos() >= MAX_SUBBOTS) return false;
  return await isRamAvailable();
}
