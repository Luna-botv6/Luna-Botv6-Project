import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { resolveJidToPhone } from './lid-resolver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYSTEM_OWNERS_FILE = path.join(__dirname, '..', '..', 'system-owner.json');

const NOTA = '👑 ¿CÓMO SER OWNER? 👑\n1. Completá un renglón por owner: {"numero":"5491112223333","nombre":"Tu nombre"} (número con código de país, sin +). Hay 10 lugares; dejá vacíos los que no uses.\n2. Desde el panel: sección Owners.\n3. Por comando: .agregarowner @numero desde un número que ya sea owner.\nLos cambios se aplican solos, sin reiniciar.';

const LUGARES = 10;

let cache = null;
let watcherIniciado = false;

export function recargarOwners() {
  if (!fs.existsSync(SYSTEM_OWNERS_FILE)) return getOwners();
  loadFromDisk();
  if (!cache) cache = [];
  mirrorToGlobals(cache);
  return getOwners();
}

function iniciarWatcher() {
  if (watcherIniciado) return;
  watcherIniciado = true;
  try {
    fs.watchFile(SYSTEM_OWNERS_FILE, { interval: 2000, persistent: false }, (actual, previo) => {
      if (actual.mtimeMs === previo.mtimeMs) return;
      try {
        const antes = firmaOwners();
        recargarOwners();
        if (firmaOwners() !== antes) {
          console.log(chalk.cyan(`[ 👑 ] Owners actualizados desde system-owner.json (TOTAL: ${cache.length})`));
        }
      } catch {}
    });
  } catch {}
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEntry(entry) {
  if (Array.isArray(entry)) {
    return { numero: onlyDigits(entry[0]), nombre: String(entry[1] || 'OWNER').slice(0, 40) };
  }
  if (entry && typeof entry === 'object') {
    return { numero: onlyDigits(entry.numero), nombre: String(entry.nombre || 'OWNER').slice(0, 40) };
  }
  return { numero: onlyDigits(entry), nombre: 'OWNER' };
}

function firmaOwners() {
  return JSON.stringify(cache || []);
}

function mirrorToGlobals(owners) {
  global.owner = owners.map((o) => [o.numero, o.nombre, true]);
  global.lidOwners = [];
}

function loadFromDisk() {
  try {
    const raw = fs.readFileSync(SYSTEM_OWNERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    const owners = Array.isArray(data?.owners)
      ? data.owners.map(normalizeEntry).filter((o) => o.numero.length >= 7)
      : [];
    cache = owners;
  } catch {
    cache = null;
  }
  return cache;
}

function saveToDisk() {
  const tmp = SYSTEM_OWNERS_FILE + '.tmp';
  const visibles = [...cache];
  while (visibles.length < LUGARES) visibles.push({ numero: '', nombre: '' });
  fs.writeFileSync(tmp, JSON.stringify({ _nota: NOTA, version: 1, owners: visibles }, null, 2), 'utf8');
  fs.renameSync(tmp, SYSTEM_OWNERS_FILE);
}

function avisarSiVacio() {
  if (cache.length === 0) console.log(chalk.red('[owners] ATENCION: no hay owners registrados. Agregá tu número en system-owner.json, desde el panel (sección Owners) o reiniciá con el JSON ya editado.'));
}

export function ensureSystemOwners() {
  if (fs.existsSync(SYSTEM_OWNERS_FILE)) {
    loadFromDisk();
    if (!cache) cache = [];
    mirrorToGlobals(cache);
    let tieneNota = false;
    try {
      tieneNota = typeof JSON.parse(fs.readFileSync(SYSTEM_OWNERS_FILE, 'utf8'))._nota === 'string';
    } catch {}
    if (!tieneNota) {
      try { saveToDisk(); } catch {}
    }
    avisarSiVacio();
    iniciarWatcher();
    return { migrated: false, total: cache.length };
  }
  const legacy = Array.isArray(global.owner) ? global.owner : [];
  const legacyLids = Array.isArray(global.lidOwners) ? global.lidOwners : [];
  const owners = legacy.map(normalizeEntry).filter((o) => o.numero.length >= 7);
  for (const raw of legacyLids) {
    const digits = onlyDigits(raw);
    if (digits.length >= 7) owners.push({ numero: digits, nombre: 'LID-MIGRADO' });
  }
  const seen = new Set();
  cache = owners.filter((o) => (seen.has(o.numero) ? false : (seen.add(o.numero), true)));
  saveToDisk();
  mirrorToGlobals(cache);
  avisarSiVacio();
  iniciarWatcher();
  return { migrated: true, total: cache.length };
}

export function getOwners() {
  if (!cache) {
    if (fs.existsSync(SYSTEM_OWNERS_FILE)) {
      loadFromDisk();
      if (!cache) cache = [];
    } else {
      ensureSystemOwners();
    }
  }
  return cache.map((o) => ({ ...o }));
}

export function getOwnerNumbers() {
  return getOwners().map((o) => o.numero).filter(Boolean);
}

export function listOwners() {
  return getOwners().map(({ numero, nombre }) => ({ numero, nombre }));
}

export function resolveOwnerPhone(jid, conn) {
  if (!jid) return null;
  try {
    const phone = resolveJidToPhone(String(jid), conn);
    if (phone && onlyDigits(phone).length >= 7) return onlyDigits(phone);
  } catch {}
  const digits = onlyDigits(String(jid).split('@')[0]);
  return digits.length >= 7 ? digits : null;
}

export function isOwnerJid(jid, conn) {
  const phone = resolveOwnerPhone(jid, conn);
  if (!phone) return false;
  return getOwnerNumbers().includes(phone);
}

export function addOwner(numero, nombre) {
  const numeroLimpio = onlyDigits(numero);
  if (!numeroLimpio || numeroLimpio.length < 10) {
    return { success: false, error: 'El número debe tener al menos 10 dígitos.' };
  }
  const owners = getOwners();
  if (owners.some((o) => o.numero === numeroLimpio)) {
    return { success: false, error: 'Este número ya es owner.' };
  }
  const nombreFinal = String(nombre || '').trim().slice(0, 40) || 'OWNER-AGREGADO';
  cache = [...owners, { numero: numeroLimpio, nombre: nombreFinal }];
  try {
    saveToDisk();
  } catch {
    cache = owners;
    return { success: false, error: 'No se pudo guardar system-owner.json.' };
  }
  mirrorToGlobals(cache);
  console.log(`[ 👑 ] Owner agregado: +${numeroLimpio} (${nombreFinal}) (TOTAL: ${cache.length})`);
  return { success: true, owners: listOwners() };
}

export function removeOwner(numero) {
  const numeroLimpio = onlyDigits(numero);
  const owners = getOwners();
  const index = owners.findIndex((o) => o.numero === numeroLimpio);
  if (index === -1) return { success: false, error: 'Este número no está registrado como owner.' };
  if (owners.length === 1) return { success: false, error: 'No podés quitar el último owner.' };
  const next = owners.filter((o) => o.numero !== numeroLimpio);
  const prev = cache;
  cache = next;
  try {
    saveToDisk();
  } catch {
    cache = prev;
    return { success: false, error: 'No se pudo guardar system-owner.json.' };
  }
  mirrorToGlobals(cache);
  console.log(`[ 👑 ] Owner quitado: -${numeroLimpio} (TOTAL: ${cache.length})`);
  return { success: true, owners: listOwners() };
}
