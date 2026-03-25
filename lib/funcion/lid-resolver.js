const _lidToPhoneCache = new Map();

export function registerLidPhone(lid, phoneJid) {
  if (lid && phoneJid) _lidToPhoneCache.set(lid, phoneJid.split("@")[0]);
}

export function isLidJid(jid) {
  return typeof jid === "string" && jid.endsWith("@lid");
}

export function isPhoneJid(jid) {
  return typeof jid === "string" && (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@c.us"));
}

function resolveFromGroupCache(lid) {
  const cache = global.groupCache;
  if (!cache) return null;
  for (const { data } of cache.values()) {
    if (!Array.isArray(data?.participants)) continue;
    const match = data.participants.find(p => p.lid === lid);
    if (match?.id) {
      const phone = match.id.split("@")[0];
      _lidToPhoneCache.set(lid, phone);
      return phone;
    }
  }
  return null;
}

function resolveFromContacts(lid, conn) {
  const sources = [conn?.contacts, conn?.store?.contacts, global?.conn?.contacts];
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const [contactJid, contact] of Object.entries(source)) {
      if (!contactJid.endsWith("@s.whatsapp.net")) continue;
      if (contact?.lid === lid || contact?.lidJid === lid) {
        const phone = contactJid.split("@")[0];
        _lidToPhoneCache.set(lid, phone);
        return phone;
      }
    }
  }
  return null;
}

export function resolveJidToPhone(jid, conn) {
  if (!jid) return null;

  if (isPhoneJid(jid)) return jid.split("@")[0];

  if (isLidJid(jid)) {
    if (_lidToPhoneCache.has(jid)) return _lidToPhoneCache.get(jid);

    return resolveFromGroupCache(jid)
      ?? resolveFromContacts(jid, conn)
      ?? null;
  }

  return jid.split("@")[0];
}

export function resolveUserId(jid, conn, fallback = null) {
  return resolveJidToPhone(jid, conn) ?? fallback ?? null;
}

export function resolveToPhoneJid(jid, conn) {
  const phone = resolveJidToPhone(jid, conn);
  return phone ? `${phone}@s.whatsapp.net` : null;
}
