export function cleanMessageText(text, msg, botNumber) {
  let cleaned = String(text || '');
  cleaned = cleaned.replace(/@\d+:\d+/g, ' ');
  if (botNumber) {
    cleaned = cleaned.replace(new RegExp('@' + botNumber + '\\b', 'g'), ' ');
  }
  const mentionedJid = msg?.['message']?.['extendedTextMessage']?.['contextInfo']?.['mentionedJid'] || [];
  for (const jid of mentionedJid) {
    if (!jid) continue;
    const digits = String(jid).replace(/[^0-9]/g, '');
    if (digits) {
      cleaned = cleaned.replace(new RegExp('@' + digits + '\\b', 'g'), ' ');
    }
  }
  cleaned = cleaned.replace(/@\d{8,}(?::\d+)?/g, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}

export function esMencionSinContenido(limpio) {
  if (!limpio) return true;
  const sinTags = limpio.replace(/@[\p{L}\p{N}._-]+/gu, ' ').trim();
  return !/[\p{L}\p{N}]/u.test(sinTags);
}

export function tieneMencionPosible(msg) {
  const m = msg?.['message'] || {};
  const ctx = m['extendedTextMessage']?.['contextInfo']
    || m['imageMessage']?.['contextInfo']
    || m['videoMessage']?.['contextInfo']
    || m['audioMessage']?.['contextInfo']
    || m['documentMessage']?.['contextInfo']
    || null;
  if (ctx?.['mentionedJid']?.['length']) return true;
  const texto = m['conversation'] || m['extendedTextMessage']?.['text'] || m['imageMessage']?.['caption'] || m['videoMessage']?.['caption'] || m['documentMessage']?.['caption'] || '';
  return typeof texto === 'string' && texto.includes('@');
}
