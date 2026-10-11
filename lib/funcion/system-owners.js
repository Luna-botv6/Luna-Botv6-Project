import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { resolveJidToPhone } from './lid-resolver.js';

global.owner = Array.isArray(global.owner) ? global.owner : [];
global.lidOwners = Array.isArray(global.lidOwners) ? global.lidOwners : [];
global.subowners = Array.isArray(global.subowners) ? global.subowners : [];
global.lidSubowners = Array.isArray(global.lidSubowners) ? global.lidSubowners : [];
const lidsNoOwner = new Set();
const lidsNoSubOwner = new Set();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYSTEM_OWNERS_FILE = path.join(__dirname, '..', '..', 'system-owner.json');

const NOTA = '👑 ¿CÓMO SER OWNER? 👑\n1. Completá un renglón por owner: {"numero":"5491112223333","nombre":"Tu nombre"} (número con código de país, sin +). Hay 10 lugares; dejá vacíos los que no uses.\n2. Desde el panel: sección Owners.\n3. Por comando: .agregarowner @numero desde un número que ya sea owner.\n4. El campo "systemlid" lo completa el bot solo (es el ID interno de WhatsApp de ese número). No hace falta tocarlo.\nLos cambios se aplican solos, sin reiniciar.\n\n🤝 SUBOWNERS (dueños de segunda línea) 🤝\nMisma idea en la sección "subowners" (20 lugares): moderan grupos/usuarios y prenden/apagan funciones, pero NO tocan server, panel, config, archivos, owners ni economía. Se gestionan con .agregarsubowner / .quitarsubowner o desde el panel. Solo un owner real puede agregarlos o quitarlos.';

const LUGARES = 10;
const LUGARES_SUBOWNER = 20;

let cache = null;
let subownersCache = null;
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
    return { numero: onlyDigits(entry[0]), systemlid: '', nombre: String(entry[1] || 'OWNER').slice(0, 40) };
  }
  if (entry && typeof entry === 'object') {
    return { numero: onlyDigits(entry.numero), systemlid: onlyDigits(entry.systemlid), nombre: String(entry.nombre || 'OWNER').slice(0, 40) };
  }
  return { numero: onlyDigits(entry), systemlid: '', nombre: 'OWNER' };
}

function firmaOwners() {
  return JSON.stringify({ owners: cache || [], subowners: subownersCache || [] });
}

function mirrorToGlobals(owners) {
  const subs = subownersCache || [];
  global.owner = owners.map((o) => [o.numero, o.nombre, true]);
  global.lidOwners = owners.map((o) => o.systemlid).filter(Boolean);
  global.subowners = subs.map((o) => [o.numero, o.nombre, true]);
  global.lidSubowners = subs.map((o) => o.systemlid).filter(Boolean);
  lidsNoOwner.clear();
}

function loadFromDisk() {
  try {
    const raw = fs.readFileSync(SYSTEM_OWNERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    const owners = Array.isArray(data?.owners)
      ? data.owners.map(normalizeEntry).filter((o) => o.numero.length >= 7)
      : [];
    cache = owners;
    subownersCache = Array.isArray(data?.subowners)
      ? data.subowners.map(normalizeEntry).filter((o) => o.numero.length >= 7)
      : [];
  } catch {
    cache = null;
    subownersCache = null;
  }
  return cache;
}

function saveToDisk() {
  const tmp = SYSTEM_OWNERS_FILE + '.tmp';
  const visibles = cache.map((o) => ({ numero: o.numero, systemlid: o.systemlid || '', nombre: o.nombre }));
  while (visibles.length < LUGARES) visibles.push({ numero: '', systemlid: '', nombre: '' });
  const subVisibles = (subownersCache || []).map((o) => ({ numero: o.numero, systemlid: o.systemlid || '', nombre: o.nombre }));
  while (subVisibles.length < LUGARES_SUBOWNER) subVisibles.push({ numero: '', systemlid: '', nombre: '' });
  fs.writeFileSync(tmp, JSON.stringify({ _nota: NOTA, version: 1, owners: visibles, subowners: subVisibles }, null, 2), 'utf8');
  fs.renameSync(tmp, SYSTEM_OWNERS_FILE);
}

function avisarSiVacio() {
  if (cache.length === 0) console.log(chalk.red('[owners] ATENCION: no hay owners registrados. Agregá tu número en system-owner.json, desde el panel (sección Owners) o reiniciá con el JSON ya editado.'));
}

export function ensureSystemOwners() {
  if (fs.existsSync(SYSTEM_OWNERS_FILE)) {
    loadFromDisk();
    if (!cache) cache = [];
    if (!subownersCache) subownersCache = [];
    mirrorToGlobals(cache);
    let tieneNota = false;
    let tieneSub = false;
    try {
      const _d = JSON.parse(fs.readFileSync(SYSTEM_OWNERS_FILE, 'utf8'));
      tieneNota = typeof _d._nota === 'string';
      tieneSub = Array.isArray(_d.subowners);
    } catch {}
    if (!tieneNota || !tieneSub) {
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
  if (!subownersCache) subownersCache = [];
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

export function getOwnerLids() {
  return getOwners().map((o) => o.systemlid).filter(Boolean);
}

export function listOwners() {
  return getOwners().map(({ numero, systemlid, nombre }) => ({ numero, systemlid, nombre }));
}

export function getSubOwners() {
  if (!subownersCache) {
    if (fs.existsSync(SYSTEM_OWNERS_FILE)) {
      loadFromDisk();
      if (!subownersCache) subownersCache = [];
    } else {
      ensureSystemOwners();
    }
  }
  return subownersCache.map((o) => ({ ...o }));
}

export function getSubOwnerNumbers() {
  return getSubOwners().map((o) => o.numero).filter(Boolean);
}

export function getSubOwnerLids() {
  return getSubOwners().map((o) => o.systemlid).filter(Boolean);
}

export function listSubOwners() {
  return getSubOwners().map(({ numero, systemlid, nombre }) => ({ numero, systemlid, nombre }));
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

function esLid(jid) {
  return String(jid || '').endsWith('@lid');
}

function lidDigits(jid) {
  return onlyDigits(String(jid || '').split('@')[0].split(':')[0]);
}

export function registrarLidOwner(jid, conn, altJid) {
  if (!esLid(jid)) return false;
  const lid = lidDigits(jid);
  if (lid.length < 7 || lidsNoOwner.has(lid)) return false;
  let phone = '';
  if (altJid && String(altJid).endsWith('@s.whatsapp.net')) {
    phone = onlyDigits(String(altJid).split('@')[0].split(':')[0]);
  }
  if (!phone) {
    try { phone = onlyDigits(resolveJidToPhone(String(jid), conn)); } catch {}
  }
  if (phone.length < 7 || phone === lid) return false;
  const owners = getOwners();
  const idxReal = owners.findIndex((o) => o.numero === phone);
  const idxLidComoNumero = owners.findIndex((o) => o.numero === lid);
  if (idxReal === -1 && idxLidComoNumero === -1) {
    if (lidsNoOwner.size > 2000) lidsNoOwner.clear();
    lidsNoOwner.add(lid);
    return false;
  }
  let next;
  if (idxReal !== -1) {
    if (owners[idxReal].systemlid === lid && idxLidComoNumero === -1) return false;
    next = owners
      .map((o, i) => (i === idxReal ? { ...o, systemlid: lid } : o))
      .filter((o, i) => i === idxReal || i !== idxLidComoNumero);
  } else {
    next = owners.map((o, i) => (i === idxLidComoNumero ? { ...o, numero: phone, systemlid: lid } : o));
  }
  const prev = cache;
  cache = next;
  try {
    saveToDisk();
  } catch {
    cache = prev;
    return false;
  }
  mirrorToGlobals(cache);
  console.log(chalk.yellow(`[ 👑 ] LID de owner aprendido: ${lid} -> +${phone}`));
  return true;
}

export function isOwnerJid(jid, conn, altJid) {
  const lid = esLid(jid) ? lidDigits(jid) : '';
  if (lid && !getOwnerLids().includes(lid)) registrarLidOwner(jid, conn, altJid);
  if (lid && getOwnerLids().includes(lid)) return true;
  const phone = resolveOwnerPhone(jid, conn);
  if (!phone) return false;
  return getOwnerNumbers().includes(phone);
}

export function registrarLidSubOwner(jid, conn, altJid) {
  if (!esLid(jid)) return false;
  const lid = lidDigits(jid);
  if (lid.length < 7 || lidsNoSubOwner.has(lid)) return false;
  let phone = '';
  if (altJid && String(altJid).endsWith('@s.whatsapp.net')) {
    phone = onlyDigits(String(altJid).split('@')[0].split(':')[0]);
  }
  if (!phone) {
    try { phone = onlyDigits(resolveJidToPhone(String(jid), conn)); } catch {}
  }
  if (phone.length < 7 || phone === lid) return false;
  const subs = getSubOwners();
  const idxReal = subs.findIndex((o) => o.numero === phone);
  const idxLidComoNumero = subs.findIndex((o) => o.numero === lid);
  if (idxReal === -1 && idxLidComoNumero === -1) {
    if (lidsNoSubOwner.size > 2000) lidsNoSubOwner.clear();
    lidsNoSubOwner.add(lid);
    return false;
  }
  let next;
  if (idxReal !== -1) {
    if (subs[idxReal].systemlid === lid && idxLidComoNumero === -1) return false;
    next = subs
      .map((o, i) => (i === idxReal ? { ...o, systemlid: lid } : o))
      .filter((o, i) => i === idxReal || i !== idxLidComoNumero);
  } else {
    next = subs.map((o, i) => (i === idxLidComoNumero ? { ...o, numero: phone, systemlid: lid } : o));
  }
  const prev = subownersCache;
  subownersCache = next;
  try {
    saveToDisk();
  } catch {
    subownersCache = prev;
    return false;
  }
  mirrorToGlobals(cache);
  console.log(chalk.magenta(`[ 🤝 ] LID de subowner aprendido: ${lid} -> +${phone}`));
  return true;
}

export function isSubOwnerJid(jid, conn, altJid) {
  const lid = esLid(jid) ? lidDigits(jid) : '';
  if (lid && !getSubOwnerLids().includes(lid)) registrarLidSubOwner(jid, conn, altJid);
  if (lid && getSubOwnerLids().includes(lid)) return true;
  const phone = resolveOwnerPhone(jid, conn);
  if (!phone) return false;
  return getSubOwnerNumbers().includes(phone);
}

export function addSubOwner(numero, nombre) {
  const numeroLimpio = onlyDigits(numero);
  if (!numeroLimpio || numeroLimpio.length < 10) {
    return { success: false, error: 'El número debe tener al menos 10 dígitos.' };
  }
  const subs = getSubOwners();
  if (subs.some((o) => o.numero === numeroLimpio || o.systemlid === numeroLimpio)) {
    return { success: false, error: 'Este número ya es subowner.' };
  }
  const nombreFinal = String(nombre || '').trim().slice(0, 40) || 'SUBOWNER-AGREGADO';
  subownersCache = [...subs, { numero: numeroLimpio, systemlid: '', nombre: nombreFinal }];
  try {
    saveToDisk();
  } catch {
    subownersCache = subs;
    return { success: false, error: 'No se pudo guardar system-owner.json.' };
  }
  mirrorToGlobals(cache);
  console.log(`[ 🤝 ] Subowner agregado: +${numeroLimpio} (${nombreFinal}) (TOTAL: ${subownersCache.length})`);
  return { success: true, subowners: listSubOwners() };
}

export function removeSubOwner(numero) {
  const numeroLimpio = onlyDigits(numero);
  const subs = getSubOwners();
  const index = subs.findIndex((o) => o.numero === numeroLimpio);
  if (index === -1) return { success: false, error: 'Este número no está registrado como subowner.' };
  const next = subs.filter((o) => o.numero !== numeroLimpio);
  const prev = subownersCache;
  subownersCache = next;
  try {
    saveToDisk();
  } catch {
    subownersCache = prev;
    return { success: false, error: 'No se pudo guardar system-owner.json.' };
  }
  mirrorToGlobals(cache);
  console.log(`[ 🤝 ] Subowner quitado: -${numeroLimpio} (TOTAL: ${subownersCache.length})`);
  return { success: true, subowners: listSubOwners() };
}

export function addOwner(numero, nombre) {
  const numeroLimpio = onlyDigits(numero);
  if (!numeroLimpio || numeroLimpio.length < 10) {
    return { success: false, error: 'El número debe tener al menos 10 dígitos.' };
  }
  const owners = getOwners();
  if (owners.some((o) => o.numero === numeroLimpio || o.systemlid === numeroLimpio)) {
    return { success: false, error: 'Este número ya es owner.' };
  }
  const nombreFinal = String(nombre || '').trim().slice(0, 40) || 'OWNER-AGREGADO';
  cache = [...owners, { numero: numeroLimpio, systemlid: '', nombre: nombreFinal }];
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
