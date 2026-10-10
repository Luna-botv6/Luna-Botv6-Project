import { resolveJid, registerLid } from '../lidMap.js';

const ATTEMPT_TTL_MS = 30 * 60 * 1000;
const _lidToPhoneCache = new Map();
const _groupAttempts = new Map();
const _contactAttempts = new Map();

function recallAttempt(map, lid) {
  const entry = map.get(lid);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > ATTEMPT_TTL_MS) {
    map.delete(lid);
    return undefined;
  }
  return entry.found;
}

function rememberAttempt(map, lid, found) {
  map.set(lid, { found: found || null, ts: Date.now() });
}

export function registerLidPhone(lid, phoneJid) {
  if (lid && phoneJid) {
    _lidToPhoneCache.set(lid, phoneJid.split('@')[0]);
    _groupAttempts.delete(lid);
    _contactAttempts.delete(lid);
    registerLid(lid, phoneJid);
  }
}

export function isLidJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@lid');
}

export function isPhoneJid(jid) {
  return typeof jid === 'string' && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us'));
}

function resolveFromGroupCache(lid) {
  const cached = recallAttempt(_groupAttempts, lid);
  if (cached !== undefined) return cached;
  const cache = global.groupCache;
  let found = null;
  if (cache) {
    for (const { data } of cache.values()) {
      if (!Array.isArray(data?.participants)) continue;
      const match = data.participants.find(p => p.lid === lid);
      if (match?.id) {
        const phone = match.id.split('@')[0];
        _lidToPhoneCache.set(lid, phone);
        registerLid(lid, match.id);
        found = phone;
        break;
      }
    }
  }
  rememberAttempt(_groupAttempts, lid, found);
  return found;
}

function resolveFromContacts(lid, conn) {
  const cached = recallAttempt(_contactAttempts, lid);
  if (cached !== undefined) return cached;
  const sources = [conn?.contacts, conn?.store?.contacts, global?.conn?.contacts];
  let found = null;
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const [contactJid, contact] of Object.entries(source)) {
      if (contactJid.endsWith('@s.whatsapp.net') && (contact?.lid === lid || contact?.lidJid === lid)) {
        const phone = contactJid.split('@')[0];
        _lidToPhoneCache.set(lid, phone);
        registerLid(lid, contactJid);
        found = phone;
        break;
      }
    }
    if (found) break;
  }
  rememberAttempt(_contactAttempts, lid, found);
  return found;
}

export function resolveJidToPhone(jid, conn) {
  if (!jid) return null;
  if (isPhoneJid(jid)) return jid.split('@')[0];
  if (isLidJid(jid)) {
    if (_lidToPhoneCache.has(jid)) return _lidToPhoneCache.get(jid);
    const mapped = resolveJid(jid);
    if (mapped) {
      const phone = mapped.split('@')[0];
      _lidToPhoneCache.set(jid, phone);
      return phone;
    }
    const found = resolveFromGroupCache(jid);
    if (found) return found;
    return resolveFromContacts(jid, conn);
  }
  return jid.split('@')[0];
}

export function resolveUserId(jid, conn, fallback = null) {
  return resolveJidToPhone(jid, conn) ?? fallback ?? null;
}

export function resolveToPhoneJid(jid, conn) {
  const phone = resolveJidToPhone(jid, conn);
  return phone ? `${phone}@s.whatsapp.net` : null;
}

export function etiquetaUsuarioParaLog(jid, conn) {
  try {
    const tel = resolveJidToPhone(jid, conn);
    if (tel) return tel;
  } catch {}
  return String(jid || '').replace(/[^0-9]/g, '') || 'desconocido';
}

export function etiquetaChatParaLog(chatId, conn) {
  const id = String(chatId || '');
  if (!id) return 'desconocido';
  if (id.endsWith('@g.us')) {
    try {
      const c = conn?.chats?.[id] || global?.conn?.chats?.[id] || null;
      const gc = global.groupCache?.get(id);
      const nombre = c?.subject || c?.name || gc?.data?.groupMetadata?.subject || gc?.data?.groupMetadata?.name || gc?.data?.subject || '';
      if (nombre) return String(nombre).slice(0, 40);
    } catch {}
    return id.split('@')[0];
  }
  return id.replace(/[^0-9]/g, '') || id;
}