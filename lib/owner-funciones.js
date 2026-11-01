import fs from 'fs';
import path from 'path';

const dbDir = path.join('./database');
const dbPath = path.join(dbDir, 'funciones-owner.json');
const bakPath = `${dbPath}.bak`;

const defaultData = {
  auread: false,
  modopublico: true,
  vierwimage: false,
  antiprivado: false,
  modogrupos: false
};

let cachedData = null;

function leerJson(ruta) {
  const raw = fs.readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('formato invalido');
  return data;
}

function escribirAtomico(data) {
  const tmp = `${dbPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  try {
    if (fs.existsSync(dbPath)) {
      leerJson(dbPath);
      fs.copyFileSync(dbPath, bakPath);
    }
  } catch {}
  fs.renameSync(tmp, dbPath);
}

function ensureDB() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  if (fs.existsSync(dbPath)) return;
  try {
    const respaldo = leerJson(bakPath);
    fs.writeFileSync(dbPath, JSON.stringify({ ...defaultData, ...respaldo }, null, 2));
    console.log('[owner-funciones] Archivo faltante, reconstruido desde el respaldo');
    return;
  } catch {}
  fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
}

function readDB() {
  if (cachedData !== null) return cachedData;
  ensureDB();
  try {
    cachedData = { ...defaultData, ...leerJson(dbPath) };
    return cachedData;
  } catch (e) {
    console.error('[owner-funciones] No se pudo leer funciones-owner.json:', e.message);
  }
  try {
    cachedData = { ...defaultData, ...leerJson(bakPath) };
    escribirAtomico(cachedData);
    console.error('[owner-funciones] Recuperado desde funciones-owner.json.bak');
    return cachedData;
  } catch {}
  return { ...defaultData };
}

function writeDB(data) {
  ensureDB();
  escribirAtomico(data);
  cachedData = data;
}

export function getOwnerFunction() {
  return readDB();
}

export function setOwnerFunction(key, value) {
  const data = readDB();
  if (key in defaultData) {
    data[key] = value;
    writeDB(data);
    return true;
  }
  return false;
}

export function enableFunction(key) {
  return setOwnerFunction(key, true);
}

export function disableFunction(key) {
  return setOwnerFunction(key, false);
}

export function isFunctionEnabled(key) {
  const data = readDB();
  return data[key] === true;
}

export function getValidKeys() {
  return Object.keys(defaultData);
}
