import fs from 'fs';
import path from 'path';

const dbDir = path.join('./database');
const dbPath = path.join(dbDir, 'subowner-permisos.json');

export const PERM_DEFAULT = {
  ban_grupos: true,
  ban_usuarios: true,
  bloqueos: true,
  ver_listas: true,
  salir_grupo: true,
  enable_grupo: true,
  enable_agaudios: true,
  ignorarbot: true,
  actualizacion: true,
  restart: true
};

export const PERM_META = {
  ban_grupos: { label: 'Banear grupos', desc: '.banchat / .unbanchat / .banid / .unbanid' },
  ban_usuarios: { label: 'Banear usuarios', desc: '.banuser / .unbanuser' },
  bloqueos: { label: 'Bloqueos', desc: '.block / .unblock / .desbloquear' },
  ver_listas: { label: 'Ver listas', desc: '.banlist / .blocklist / .verbaneados' },
  salir_grupo: { label: 'Salir de grupos', desc: '.leavegc / .out / .salir' },
  enable_grupo: { label: 'Prender funciones de grupo', desc: '.enable / .disable de grupo (welcome, antilink, etc.)' },
  enable_agaudios: { label: 'Prender agaudios', desc: '.enable / .disable agaudios' },
  ignorarbot: { label: 'Ignorar bots', desc: '.ignorarbot' },
  actualizacion: { label: 'Ver actualizaciones', desc: '.actualizacion / .update' },
  restart: { label: 'Reiniciar', desc: '.restart / .reiniciar' }
};

let cachedData = null;

function ensureDB() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(PERM_DEFAULT, null, 2));
  }
}

function readDB() {
  if (cachedData !== null) return cachedData;
  ensureDB();
  try {
    const raw = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    cachedData = { ...PERM_DEFAULT, ...(raw && typeof raw === 'object' ? raw : {}) };
    return cachedData;
  } catch (e) {
    cachedData = { ...PERM_DEFAULT };
    return cachedData;
  }
}

function writeDB(data) {
  ensureDB();
  cachedData = data;
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function getSubOwnerPerms() {
  return { ...readDB() };
}

export function setSubOwnerPerm(key, value) {
  if (!(key in PERM_DEFAULT)) return false;
  const data = readDB();
  data[key] = !!value;
  writeDB(data);
  return true;
}

export function tienePoder(key) {
  if (!key || key === true) return true;
  const data = readDB();
  if (!(key in data)) return PERM_DEFAULT[key] !== false;
  return data[key] === true;
}

export function getValidPermKeys() {
  return Object.keys(PERM_DEFAULT);
}
