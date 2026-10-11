import fs from 'fs';

const PATH = './database/inactivos.json';
const INTERVALO_MS = 15000;
const MAX_GRUPOS = 500;
const VISTO_TTL_MS = 30 * 24 * 3600 * 1000;
const AVISO_TTL_MS = 7 * 24 * 3600 * 1000;
const KICKS_TTL_MS = 2 * 3600 * 1000;

try {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true });
  if (!fs.existsSync(PATH)) fs.writeFileSync(PATH, JSON.stringify({}));
} catch {}

let cache = null;
let pendiente = false;
let ultimoGuardado = 0;

function leerDisco() {
  try {
    const d = JSON.parse(fs.readFileSync(PATH, 'utf8'));
    return d && typeof d === 'object' ? d : {};
  } catch {
    return {};
  }
}

function grupo(chatId) {
  if (!cache[chatId]) cache[chatId] = { visto: {}, avisados: {}, kicks: {} };
  const g = cache[chatId];
  if (!g.visto || typeof g.visto !== 'object') g.visto = {};
  if (!g.avisados || typeof g.avisados !== 'object') g.avisados = {};
  if (!g.kicks || typeof g.kicks !== 'object') g.kicks = {};
  return g;
}

function purgar() {
  if (!cache) return false;
  const antes = JSON.stringify(cache).length;
  const ahora = Date.now();
  for (const [chatId, g] of Object.entries(cache)) {
    if (!g || typeof g !== 'object') { delete cache[chatId]; continue; }
    for (const [jid, ts] of Object.entries(g.visto || {})) {
      if (!Number.isFinite(ts) || ahora - ts > VISTO_TTL_MS) delete g.visto[jid];
    }
    for (const [jid, ts] of Object.entries(g.avisados || {})) {
      if (!Number.isFinite(ts) || ahora - ts > AVISO_TTL_MS) delete g.avisados[jid];
    }
    for (const [bucket, info] of Object.entries(g.kicks || {})) {
      if (!info || ahora - (info.ts || 0) > KICKS_TTL_MS) delete g.kicks[bucket];
    }
    if (!Object.keys(g.visto).length && !Object.keys(g.avisados).length && !Object.keys(g.kicks).length) delete cache[chatId];
  }
  const chats = Object.keys(cache);
  if (chats.length > MAX_GRUPOS) {
    chats.sort((a, b) => maxVisto(cache[a]) - maxVisto(cache[b]));
    for (const c of chats) {
      if (Object.keys(cache).length <= MAX_GRUPOS) break;
      delete cache[c];
    }
  }
  return JSON.stringify(cache).length !== antes;
}

function maxVisto(g) {
  let m = 0;
  for (const ts of Object.values(g?.visto || {})) if (Number.isFinite(ts) && ts > m) m = ts;
  return m;
}

function guardarDisco() {
  purgar();
  try {
    fs.writeFileSync(PATH, JSON.stringify(cache, null, 2));
    ultimoGuardado = Date.now();
    pendiente = false;
  } catch {}
}

function marcarYPuedeGuardar() {
  pendiente = true;
  if (Date.now() - ultimoGuardado >= INTERVALO_MS) guardarDisco();
}

export function loadInactivos() {
  if (!cache) {
    cache = leerDisco();
    if (purgar()) pendiente = true;
    ultimoGuardado = Date.now();
  }
  return cache;
}

export function registrarActividad(chatId, jid) {
  if (!chatId || !jid) return;
  loadInactivos();
  grupo(chatId).visto[jid] = Date.now();
}

export function sembrarGrupo(chatId, jids) {
  if (!chatId || !Array.isArray(jids)) return;
  loadInactivos();
  const g = grupo(chatId);
  const ahora = Date.now();
  for (const jid of jids) {
    if (!jid) continue;
    if (!g.visto[jid]) g.visto[jid] = ahora;
  }
  marcarYPuedeGuardar();
}

export function sembrarIngreso(chatId, jid) {
  if (!chatId || !jid) return;
  loadInactivos();
  grupo(chatId).visto[jid] = Date.now();
  marcarYPuedeGuardar();
}

export function getVisto(chatId, jid) {
  loadInactivos();
  const ts = cache[chatId]?.visto?.[jid];
  return Number.isFinite(ts) ? ts : 0;
}

export function getAvisados(chatId) {
  loadInactivos();
  return { ...(cache[chatId]?.avisados || {}) };
}

export function marcarAvisado(chatId, jid) {
  if (!chatId || !jid) return;
  loadInactivos();
  grupo(chatId).avisados[jid] = Date.now();
  marcarYPuedeGuardar();
}

export function quitarAvisado(chatId, jid) {
  if (!chatId || !jid) return;
  loadInactivos();
  if (cache[chatId]?.avisados) delete cache[chatId].avisados[jid];
  marcarYPuedeGuardar();
}

export function quitarVisto(chatId, jid) {
  if (!chatId || !jid) return;
  loadInactivos();
  if (cache[chatId]?.visto) delete cache[chatId].visto[jid];
  marcarYPuedeGuardar();
}

export function limpiarGrupo(chatId, jidsValidos) {
  if (!chatId || !Array.isArray(jidsValidos)) return;
  loadInactivos();
  const validos = new Set(jidsValidos.filter(Boolean));
  const g = grupo(chatId);
  for (const jid of Object.keys(g.visto)) if (!validos.has(jid)) delete g.visto[jid];
  for (const jid of Object.keys(g.avisados)) if (!validos.has(jid)) delete g.avisados[jid];
  marcarYPuedeGuardar();
}

export function borrarGrupo(chatId) {
  if (!chatId) return;
  loadInactivos();
  delete cache[chatId];
  marcarYPuedeGuardar();
}

export function horaKey(ts) {
  return new Date(ts || Date.now()).toISOString().slice(0, 13);
}

export function contarKicksHora(chatId, bucket) {
  loadInactivos();
  const info = cache[chatId]?.kicks?.[bucket];
  return info && Number.isFinite(info.n) ? info.n : 0;
}

export function sumarKickHora(chatId, bucket) {
  if (!chatId || !bucket) return 0;
  loadInactivos();
  const g = grupo(chatId);
  const info = g.kicks[bucket] || { n: 0, ts: Date.now() };
  info.n = (Number.isFinite(info.n) ? info.n : 0) + 1;
  info.ts = Date.now();
  g.kicks[bucket] = info;
  marcarYPuedeGuardar();
  return info.n;
}

export function flushInactivos() {
  if (pendiente) guardarDisco();
}

try {
  const intervalo = setInterval(() => {
    if (!cache) return;
    if (pendiente || purgar()) guardarDisco();
  }, INTERVALO_MS);
  if (typeof intervalo.unref === 'function') intervalo.unref();
} catch {}
