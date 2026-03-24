import fs from 'fs';
import path from 'path';
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import { registerLidMapping } from '../stats.js';

const ADMIN_CACHE_PATH = './database/group_admins.json';
const ADMIN_CACHE_TTL  = 30 * 60 * 1000;
const GROUP_CACHE_TTL  = 60 * 1000;

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
    const normalKey = isValidJid(key) ? key : `${key}@s.whatsapp.net`;
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
  try {
    ensureAdminCacheDir();
    fs.writeFileSync(ADMIN_CACHE_PATH, JSON.stringify(_adminCache, null, 2));
    _adminCacheDirty = false;
  } catch (e) {
    console.error('[pluginHelper] Error guardando cache:', e.message);
  }
}

setInterval(persistAdminCache, 10_000);

function normalizeJid(jid) {
  if (!jid) return '';
  try {
    return jidNormalizedUser(jid);
  } catch {
    return jid.replace(/:[0-9]+(@)/, '$1').replace('@lid', '@s.whatsapp.net');
  }
}

function resolveRealJid(senderId, participants) {
  if (!senderId.includes('@lid')) return senderId;
  const match = participants.find(p => p.lid && normalizeJid(p.lid) === normalizeJid(senderId));
  return match?.id ? match.id : senderId;
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
    const normalId = normalizeJid(userId);
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
    const normalId = normalizeJid(userId);
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
    const normalId = normalizeJid(userId);
    return group.admins?.[normalId] === true;
  } catch (e) {
    console.error('[pluginHelper] Error checking admin in cache:', e.message);
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

function fetchMetadata(conn, chatId) {
  if (_pendingMetadata.has(chatId)) return _pendingMetadata.get(chatId);
  const promise = Promise.resolve(conn.chats?.[chatId]?.metadata || null)
    .then(cached => cached || conn.groupMetadata(chatId))
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
      return cached.data;
    }

    const metadata = await fetchMetadata(conn, chatId);

    if (!metadata) {
      const realSenderFallback = senderId.includes('@lid') ? senderId : senderId;
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

    const participants = (metadata.participants || []).map(p => ({
      id:    p.id  || p.jid,
      lid:   p.lid  || null,
      admin: p.admin || null,
    }));

    for (const p of participants) {
      if (p.lid && p.id) registerLidMapping(p.lid, p.id);
    }

    await updateGroupAdmins(chatId, participants);

    const realSenderJid = resolveRealJid(senderId, participants);
    const normalSender  = normalizeJid(realSenderJid);
    const normalBot     = normalizeJid(conn.user.jid);

    const userEntry = participants.find(p => normalizeJid(p.id) === normalSender);
    const botEntry  = participants.find(p => normalizeJid(p.id) === normalBot);

    const groupData = {
      groupMetadata: metadata,
      participants,
      isAdmin:    userEntry?.admin === 'admin' || userEntry?.admin === 'superadmin',
      isBotAdmin: botEntry?.admin  === 'admin' || botEntry?.admin  === 'superadmin',
    };

    global.groupCache.set(chatId, { data: groupData, timestamp: Date.now() });

    return groupData;
  } catch (e) {
    console.error('[pluginHelper] Error getting group data:', e.message);
    return { groupMetadata: {}, participants: [], isAdmin: false, isBotAdmin: false };
  }
}

export function clearGroupCache(chatId) {
  global.groupCache?.delete(chatId);
}
