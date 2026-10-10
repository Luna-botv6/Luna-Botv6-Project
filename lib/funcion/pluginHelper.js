import fs from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import { registerLidMapping, getLidMapping } from '../stats.js';
import { registerLidToJid } from './userManager.js';

const ADMIN_CACHE_PATH = './database/group_admins.json';
const ADMIN_CACHE_TTL  = 30 * 60 * 1000;
const GROUP_CACHE_TTL  = 5 * 60 * 1000;

const _pendingMetadata = new Map();

let _adminCache = null;
let _adminCacheDirty = false;

function ensureAdminCacheDir() {
  const dir = path.dirname(ADMIN_CACHE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isValidJid(key) {
  return typeof key === 'string' && key.includes('@');
}

function migrateGroupEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (!entry.admins || typeof entry.admins !== 'object') return null;

  const keys = Object.keys(entry.admins);
  if (keys.length === 0) return entry;

  const hasOldFormat = keys.some(k => !isValidJid(k));
  if (!hasOldFormat) return entry;

  const migratedAdmins = {};
  for (const key of keys) {
    const normalKey = isValidJid(key) ? key : `${key}@lid`;
    migratedAdmins[normalKey] = true;
  }

  return { admins: migratedAdmins, timestamp: 0 };
}

function loadAndValidateAdminCache() {
  ensureAdminCacheDir();

  let raw = {};
  let needsRewrite = false;

  try {
    if (fs.existsSync(ADMIN_CACHE_PATH)) {
      const content = fs.readFileSync(ADMIN_CACHE_PATH, 'utf8').trim();
      if (content) {
        raw = JSON.parse(content);
        if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('bad root');
      }
    }
  } catch {
    console.warn('[pluginHelper] JSON de admins corrupto o inválido — limpiando y empezando de cero');
    raw = {};
    needsRewrite = true;
  }

  const validated = {};
  for (const [chatId, entry] of Object.entries(raw)) {
    const migrated = migrateGroupEntry(entry);
    if (!migrated) {
      needsRewrite = true;
      continue;
    }
    if (migrated !== entry) needsRewrite = true;
    validated[chatId] = migrated;
  }

  if (needsRewrite) {
    try {
      fs.writeFileSync(ADMIN_CACHE_PATH, JSON.stringify(validated, null, 2));
    } catch (e) {
      console.error('[pluginHelper] Error reescribiendo cache migrado:', e.message);
    }
  }

  return validated;
}

function getAdminCache() {
  if (_adminCache) return _adminCache;
  _adminCache = loadAndValidateAdminCache();
  return _adminCache;
}

function persistAdminCache() {
  if (!_adminCacheDirty) return;
  _adminCacheDirty = false;
  try {
    ensureAdminCacheDir();
    const data = JSON.stringify(_adminCache, null, 2);
    writeFile(ADMIN_CACHE_PATH, data).catch(e => {
      console.error('[pluginHelper] Error guardando cache:', e.message);
      _adminCacheDirty = true;
    });
  } catch (e) {
    console.error('[pluginHelper] Error en persistAdminCache:', e.message);
    _adminCacheDirty = true;
  }
}

setInterval(persistAdminCache, 10_000);

function normalizeJid(jid) {
  if (!jid) return '';
  try {
    return jidNormalizedUser(jid);
  } catch {
    return jid.replace(/:[0-9]+(@)/, '$1');
  }
}

export function nombreDeParticipante(p) {
  const crudo = p.name || p.notify || p.pushName || p.pushname || p.displayName || p.verifiedName || '';
  const nombre = String(crudo).replace(/\s+/g, ' ').trim();
  if (!nombre) return '';
  if (!/[@\d]/.test(nombre)) return nombre.slice(0, 40);
  if (p.name && !/@/.test(p.name)) return String(p.name).slice(0, 40);
  if (p.notify && !/@/.test(p.notify)) return String(p.notify).slice(0, 40);
  if (p.verifiedName) return String(p.verifiedName).slice(0, 40);
  return '';
}

function resolveRealJid(senderId, participants) {
  if (!senderId.includes('@lid')) return senderId;
  const match = participants.find(p => p.lid && normalizeJid(p.lid) === normalizeJid(senderId));
  return match?.id ? match.id : senderId;
}

function candidatosDeRemitente(senderId, participants) {
  const lista = [];
  const ver = (j) => { if (j && !lista.includes(j)) lista.push(j); };
  ver(senderId);
  try { ver(resolveRealJid(senderId, participants)); } catch {}
  try { ver(resolveLidToJid(senderId)); } catch {}
  return lista;
}

function buscarEntradaUsuario(participants, senderId) {
  if (!senderId) return undefined;
  const normales = new Set(candidatosDeRemitente(senderId, participants).map(normalizeJid));
  return (participants || []).find(p => p && (
    normales.has(normalizeJid(p.id || '')) ||
    (p.lid && normales.has(normalizeJid(p.lid))) ||
    (p.phoneNumber && normales.has(normalizeJid(p.phoneNumber)))
  ));
}

function normalizarEntrante(p) {
  if (typeof p === 'string') return { id: p, lid: p.endsWith('@lid') ? p : null, phoneNumber: null };
  const jid = p.id || p.phoneNumber || '';
  return { id: jid, lid: p.lid || (typeof jid === 'string' && jid.endsWith('@lid') ? jid : null), phoneNumber: p.phoneNumber || null };
}

export function mezclarParticipantes(actuales, action, entrantes) {
  const base = Array.isArray(actuales) ? [...actuales] : [];
  const lista = (Array.isArray(entrantes) ? entrantes : [entrantes]).map(normalizarEntrante).filter(e => e.id);
  const sinDispositivo = (j) => String(j || '').replace(/:[0-9]+(@)/, '$1');
  const expandir = (j) => {
    const out = [j];
    try {
      if (typeof j === 'string' && j.endsWith('@lid')) {
        const m = resolveLidToJid(j);
        if (m && m !== j) out.push(m);
      }
    } catch {}
    return out;
  };
  const esMismo = (p, e) => {
    if (!p || !e) return false;
    const a = [p.id, p.lid, p.phoneNumber].filter(Boolean).flatMap(expandir).map(sinDispositivo);
    const b = [e.id, e.lid, e.phoneNumber].filter(Boolean).flatMap(expandir).map(sinDispositivo);
    return a.some(x => b.includes(x));
  };
  if (action === 'add') {
    const esLid = (j) => typeof j === 'string' && j.endsWith('@lid');
    let resto = base;
    const nuevas = [];
    for (const e of lista) {
      const previas = resto.filter(p => esMismo(p, e));
      resto = resto.filter(p => !esMismo(p, e));
      const vieja = previas.find(p => p.lid || p.phoneNumber || p.name) || previas[0];
      nuevas.push({
        id: e.id,
        lid: e.lid || vieja?.lid || (esLid(vieja?.id) ? vieja.id : null) || null,
        phoneNumber: e.phoneNumber || vieja?.phoneNumber || (!esLid(vieja?.id) && vieja?.id ? vieja.id : null) || null,
        admin: null,
        name: vieja?.name || ''
      });
    }
    return [...resto, ...nuevas];
  }
  if (action === 'remove' || action === 'leave') {
    let resto = base;
    for (const e of lista) resto = resto.filter(p => !esMismo(p, e));
    return resto;
  }
  if (action === 'promote') return base.map(p => (lista.some(e => esMismo(p, e)) ? { ...p, admin: 'admin' } : p));
  if (action === 'demote') return base.map(p => (lista.some(e => esMismo(p, e)) ? { ...p, admin: null } : p));
  return base;
}

function isAdminCacheStale(group) {
  if (!group?.timestamp) return true;
  return (Date.now() - group.timestamp) >= ADMIN_CACHE_TTL;
}

export async function updateGroupAdmins(chatId, participants) {
  try {
    const cache = getAdminCache();
    const admins = {};

    for (const p of participants) {
      const rawId = p.id || p.jid;
      if (!rawId) continue;
      const normalId = normalizeJid(rawId);
      if (!isValidJid(normalId)) continue;
      if (p.admin === 'admin' || p.admin === 'superadmin') {
        admins[normalId] = true;
      }
    }

    cache[chatId] = { admins, timestamp: Date.now() };
    _adminCacheDirty = true;
  } catch (e) {
    console.error('[pluginHelper] Error updating group admins:', e.message);
  }
}

export function addAdminToCache(chatId, userId) {
  try {
    const cache = getAdminCache();
    const resolved = resolveLidToJid(userId);
    const normalId = normalizeJid(resolved);
    if (!isValidJid(normalId)) return;
    if (!cache[chatId]) cache[chatId] = { admins: {}, timestamp: Date.now() };
    cache[chatId].admins[normalId] = true;
    cache[chatId].timestamp = Date.now();
    _adminCacheDirty = true;
  } catch (e) {
    console.error('[pluginHelper] Error adding admin to cache:', e.message);
  }
}

export function removeAdminFromCache(chatId, userId) {
  try {
    const cache = getAdminCache();
    const resolved = resolveLidToJid(userId);
    const normalId = normalizeJid(resolved);
    if (cache[chatId]?.admins) {
      delete cache[chatId].admins[normalId];
      cache[chatId].timestamp = Date.now();
      _adminCacheDirty = true;
    }
  } catch (e) {
    console.error('[pluginHelper] Error removing admin from cache:', e.message);
  }
}

export function isUserAdminInCache(chatId, userId) {
  try {
    const cache = getAdminCache();
    const group = cache[chatId];
    if (!group || isAdminCacheStale(group)) return false;
    const resolved = resolveLidToJid(userId);
    const normalId = normalizeJid(resolved);
    return group.admins?.[normalId] === true;
  } catch (e) {
    console.error('[pluginHelper] Error checking admin in cache:', e.message);
    return false;
  }
}

function resolveLidToJid(userId) {
  if (!userId?.includes('@lid')) return userId;
  return getLidMapping(userId) || userId;
}

export function resolveRealJidDeLid(userId) {
  try {
    return resolveLidToJid(userId);
  } catch {
    return userId;
  }
}

export function buscarNombreEnParticipantes(participants, jid) {
  if (!jid) return '';
  const objetivo = String(jid);
  const digitos = objetivo.split('@')[0];
  const p = participants.find(x => x && (x.id === objetivo || x.lid === objetivo))
    || participants.find(x => x && String(x.id || '').split('@')[0] === digitos)
    || participants.find(x => x && String(x.lid || '').split('@')[0] === digitos);
  return nombreDeParticipante(p || {});
}

export function isAdminNoTTL(chatId, userId) {
  try {
    const cache = getAdminCache();
    const group = cache[chatId];
    if (!group?.admins) return false;
    const resolved = resolveLidToJid(userId);
    const normalId = normalizeJid(resolved);
    return group.admins?.[normalId] === true;
  } catch {
    return false;
  }
}

export function clearGroupAdminCache(chatId) {
  try {
    const cache = getAdminCache();
    if (cache[chatId]) {
      delete cache[chatId];
      _adminCacheDirty = true;
    }
  } catch (e) {
    console.error('[pluginHelper] Error clearing group admin cache:', e.message);
  }
}

function isAdminFromCache(chatId, normalSender) {
  try {
    const cache = getAdminCache();
    const group = cache[chatId];
    if (!group?.admins) return false;
    return group.admins[normalSender] === true;
  } catch {
    return false;
  }
}

function liveIsBotAdmin(chatId, botJid) {
  try {
    const cache = getAdminCache();
    const group = cache[chatId];
    if (!group?.admins) return null;
    const normalBot = normalizeJid(botJid);
    return group.admins[normalBot] === true;
  } catch {
    return null;
  }
}

function fetchMetadata(conn, chatId) {
  if (_pendingMetadata.has(chatId)) return _pendingMetadata.get(chatId);
  const promise = Promise.resolve(
    conn.chats?.[chatId]?.metadata || global.groupCache?.get(chatId)?.data?.groupMetadata || null
  ).then(cached => cached || conn.groupMetadata(chatId))
    .catch(() => null)
    .finally(() => _pendingMetadata.delete(chatId));
  _pendingMetadata.set(chatId, promise);
  return promise;
}

export async function getGroupDataForPlugin(conn, chatId, senderId) {
  try {
    if (!global.groupCache) global.groupCache = new Map();

    const cached = global.groupCache.get(chatId);
    if (cached && (Date.now() - cached.timestamp) < GROUP_CACHE_TTL) {
      const { participants } = cached.data;
      const normalBotC     = normalizeJid(conn.user.jid);
      const userEntryC     = buscarEntradaUsuario(participants, senderId);
      const botEntryC      = participants.find(p => normalizeJid(p.id) === normalBotC);
      const liveBotAdminC  = liveIsBotAdmin(chatId, normalBotC);
      return {
        ...cached.data,
        isAdmin:    userEntryC?.admin === 'admin' || userEntryC?.admin === 'superadmin',
        isBotAdmin: liveBotAdminC !== null ? liveBotAdminC : (botEntryC?.admin === 'admin' || botEntryC?.admin === 'superadmin'),
      };
    }

    const metadata = await fetchMetadata(conn, chatId);

    if (!metadata) {
      const realSenderFallback = resolveLidToJid(senderId);
      const normalSenderFallback = normalizeJid(realSenderFallback);
      const isAdminFallback = isAdminFromCache(chatId, normalSenderFallback);
      const normalBotFallback = normalizeJid(conn.user?.jid || '');
      const isBotAdminFallback = isAdminFromCache(chatId, normalBotFallback);

      return {
        groupMetadata: {},
        participants: [],
        isAdmin: isAdminFallback,
        isBotAdmin: isBotAdminFallback,
      };
    }

    const participants = (metadata.participants || []).map(p => {
      const rawId = p.id || p.jid || '';
      const isLid = rawId.includes('@lid');
      const phoneJid = p.phoneNumber || (!isLid ? rawId : null);
      const lidJid   = p.lid || (isLid ? rawId : null);
      return {
        id:    phoneJid || rawId,
        lid:   lidJid   || null,
        admin: p.admin  || null,
        name:  nombreDeParticipante(p),
      };
    });


    for (const p of participants) {
      if (p.lid && p.id) {
        registerLidMapping(p.lid, p.id);
        registerLidToJid(p.lid, p.id);
      }
    }

    await updateGroupAdmins(chatId, participants);

    const normalBot     = normalizeJid(conn.user.jid);

    const userEntry = buscarEntradaUsuario(participants, senderId);
    const botEntry  = participants.find(p => normalizeJid(p.id) === normalBot);

    const baseData = { groupMetadata: metadata, participants };
    global.groupCache.set(chatId, { data: baseData, timestamp: Date.now() });

    const liveBotAdmin = liveIsBotAdmin(chatId, normalBot);

    const groupData = {
      ...baseData,
      isAdmin:    userEntry?.admin === 'admin' || userEntry?.admin === 'superadmin',
      isBotAdmin: liveBotAdmin !== null ? liveBotAdmin : (botEntry?.admin === 'admin' || botEntry?.admin === 'superadmin'),
    };

    return groupData;
  } catch (e) {
    console.error('[pluginHelper] Error getting group data:', e.message);
    return { groupMetadata: {}, participants: [], isAdmin: false, isBotAdmin: false };
  }
}

export function resolveIsAdmin(chatId, senderId, groupData) {
  const cachedAdmin = hasAdminCacheForGroup(chatId) ? isAdminNoTTL(chatId, senderId) : false;
  if (cachedAdmin) return true;
  return groupData?.isAdmin || false;
}

export function resolveIsSuperAdmin(senderId, groupData) {
  const participants = groupData?.participants || [];
  const normalSender = normalizeJid(senderId);
  const match = participants.find(p =>
    normalizeJid(p.id) === normalSender || (p.lid && normalizeJid(p.lid) === normalSender)
  );
  return match?.admin === 'superadmin';
}

export function hasAdminCacheForGroup(chatId) {
  try {
    const cache = getAdminCache();
    const group = cache[chatId];
    if (!group?.admins) return false;
    if (isAdminCacheStale(group)) return false;
    return Object.keys(group.admins).length > 0;
  } catch {
    return false;
  }
}

export function clearGroupCache(chatId, conn) {
  try {
    global.groupCache?.delete(chatId);
    if (conn?.chats?.[chatId]?.metadata) {
      delete conn.chats[chatId].metadata;
    }
  } catch (e) {
    console.error('[pluginHelper] Error clearing group cache:', e.message);
  }
}