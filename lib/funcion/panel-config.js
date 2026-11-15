import fs from 'fs';
import path from 'path';

const dbDir = './database';
const dbPath = path.join(dbDir, 'panel-config.json');
const bakPath = `${dbPath}.bak`;

const defaultData = {
  avisarFunciones: true
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
    console.log('[panel-config] Archivo faltante, reconstruido desde el respaldo');
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
    console.error('[panel-config] No se pudo leer panel-config.json:', e.message);
  }
  try {
    cachedData = { ...defaultData, ...leerJson(bakPath) };
    escribirAtomico(cachedData);
    console.error('[panel-config] Recuperado desde panel-config.json.bak');
    return cachedData;
  } catch {}
  return { ...defaultData };
}

function writeDB(data) {
  ensureDB();
  escribirAtomico(data);
  cachedData = data;
}

export function getPanelConfig() {
  return { ...readDB() };
}

export function setPanelConfig(key, value) {
  const data = { ...readDB() };
  if (!(key in defaultData)) return false;
  data[key] = value;
  writeDB(data);
  return true;
}

export function avisarFuncionesPanel() {
  return readDB().avisarFunciones !== false;
}

export function getPanelConfigKeys() {
  return Object.keys(defaultData);
}
