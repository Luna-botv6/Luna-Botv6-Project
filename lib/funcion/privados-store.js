import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const dbDir = './database';
const dbPath = path.join(dbDir, 'privados.json');
const bakPath = `${dbPath}.bak`;
const MAX_REGISTROS = 300;
const RETENCION_MS = 45 * 24 * 60 * 60 * 1000;

let cachedItems = null;

function leerJson(ruta) {
  const raw = fs.readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('formato invalido');
  return data;
}

function escribirAtomico(items) {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const tmp = `${dbPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
  try {
    if (fs.existsSync(dbPath)) {
      leerJson(dbPath);
      fs.copyFileSync(dbPath, bakPath);
    }
  } catch {}
  fs.renameSync(tmp, dbPath);
}

function podar(items) {
  const ahora = Date.now();
  const vivos = items.filter((item) => {
    if (!item || !item.id) return false;
    if (item.estado === 'pendiente' || item.estado === 'enviando') return true;
    return ahora - Number(item.creadoEn || 0) < RETENCION_MS;
  });
  vivos.sort((a, b) => Number(a.creadoEn || 0) - Number(b.creadoEn || 0));
  return vivos.slice(-MAX_REGISTROS);
}

function leerItems() {
  if (cachedItems !== null) return cachedItems;
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  try {
    cachedItems = leerJson(dbPath);
    return cachedItems;
  } catch (e) {
    if (fs.existsSync(dbPath)) console.error('[privados-store] No se pudo leer privados.json:', e.message);
  }
  try {
    cachedItems = leerJson(bakPath);
    escribirAtomico(cachedItems);
    console.error('[privados-store] Recuperado desde privados.json.bak');
    return cachedItems;
  } catch {}
  cachedItems = [];
  return cachedItems;
}

function guardarItems(items) {
  const podados = podar(items);
  escribirAtomico(podados);
  cachedItems = podados;
  return podados;
}

export function nuevoIdPrivado() {
  return 'pv' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
}

export function listarPrivados() {
  return leerItems().map((item) => ({ ...item }));
}

export function obtenerPrivado(id) {
  const item = leerItems().find((x) => x.id === id);
  return item ? { ...item } : null;
}

export function crearPrivado(datos) {
  const ahora = Date.now();
  const item = {
    id: datos.id || nuevoIdPrivado(),
    numero: datos.numero,
    jid: datos.jid,
    pais: datos.pais || '',
    nombreDestino: datos.nombreDestino || '',
    texto: datos.texto || '',
    fechaLocal: datos.fechaLocal || '',
    zona: datos.zona || 'America/Argentina/Buenos_Aires',
    enviarEn: Number(datos.enviarEn),
    estado: datos.estado || 'pendiente',
    media: datos.media || null,
    creadoEn: ahora,
    enviadoEn: null,
    ultimoIntentoEn: null,
    intentos: 0,
    error: '',
    mediaEliminada: !datos.media
  };
  const items = leerItems();
  items.push(item);
  guardarItems(items);
  return { ...item };
}

export function actualizarPrivado(id, cambios) {
  const items = leerItems();
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...cambios, id };
  guardarItems(items);
  return { ...items[idx] };
}

export function borrarPrivado(id) {
  const items = leerItems();
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  guardarItems(items);
  return true;
}

export function enviadosDesde(desdeMs) {
  return leerItems().filter((item) => item.estado === 'enviado' && Number(item.enviadoEn || 0) >= desdeMs);
}

export function ultimoEnvioANumero(numero) {
  let ultimo = 0;
  for (const item of leerItems()) {
    if (item.numero !== numero) continue;
    if (item.estado !== 'enviado') continue;
    ultimo = Math.max(ultimo, Number(item.enviadoEn || 0));
  }
  return ultimo;
}

export function pendientesDeNumero(numero) {
  return leerItems().filter((item) => item.numero === numero && item.estado === 'pendiente');
}

export function hayDuplicado(numero, texto, enviarEn, ventanaMs) {
  const ventana = Number(ventanaMs || 5 * 60 * 1000);
  return leerItems().some((item) => {
    if (item.estado !== 'pendiente') return false;
    if (item.numero !== numero) return false;
    if (Math.abs(Number(item.enviarEn || 0) - Number(enviarEn || 0)) > ventana) return false;
    return String(item.texto || '') === String(texto || '');
  });
}

export function limpiarFinalizados() {
  const items = leerItems();
  const antes = items.length;
  const podados = guardarItems(items);
  return antes - podados.length;
}
