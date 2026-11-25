import { resolveJidToPhone } from './lid-resolver.js';

const TTL_MS = 3 * 60 * 1000;
const pendientes = new Map();

function digitos(valor) {
  return String(valor || '').split('@')[0].replace(/\D/g, '');
}

function mismosDigitos(a, b) {
  const da = digitos(a);
  const db = digitos(b);
  return !!da && !!db && da === db;
}

function clavesDe(key) {
  return [key?.participant, key?.participantAlt, key?.remoteJidAlt, key?.remoteJid].filter(Boolean);
}

export function mismoAutor(conn, key, senderId, senderRaw) {
  const objetivos = [senderId, senderRaw].filter(Boolean);
  for (const clave of clavesDe(key)) {
    for (const objetivo of objetivos) {
      if (mismosDigitos(clave, objetivo)) return true;
      try {
        const resueltoClave = resolveJidToPhone(clave, conn);
        if (mismosDigitos(resueltoClave, objetivo)) return true;
      } catch {}
      try {
        const resueltoObjetivo = resolveJidToPhone(objetivo, conn);
        if (mismosDigitos(clave, resueltoObjetivo)) return true;
      } catch {}
    }
  }
  return false;
}

function clavesPendiente(chatId, senderId, senderRaw) {
  const salida = [];
  for (const valor of [senderId, senderRaw]) {
    const d = digitos(valor);
    if (d) salida.push(`${chatId}|${d}`);
  }
  return salida;
}

function limpiarVencidos() {
  const ahora = Date.now();
  for (const [clave, vence] of pendientes) {
    if (vence <= ahora) pendientes.delete(clave);
  }
}

export function marcarConfirmacionPendiente(chatId, senderId, senderRaw) {
  limpiarVencidos();
  const vence = Date.now() + TTL_MS;
  for (const clave of clavesPendiente(chatId, senderId, senderRaw)) pendientes.set(clave, vence);
}

export function limpiarConfirmacionPendiente(chatId, senderId, senderRaw) {
  for (const clave of clavesPendiente(chatId, senderId, senderRaw)) pendientes.delete(clave);
}

export function hayConfirmacionPendiente(chatId, senderId, senderRaw, texto) {
  const limpio = String(texto || '').trim().toLowerCase();
  if (!['si', 'sí', 'yes', 'confirmar', 'no', 'cancelar', 'restaurar', 'restore'].includes(limpio)) return false;
  limpiarVencidos();
  return clavesPendiente(chatId, senderId, senderRaw).some((clave) => pendientes.has(clave));
}

export function esperarConfirmacion(conn, { chatId, senderId, senderRaw, timeout = 30000 } = {}) {
  marcarConfirmacionPendiente(chatId, senderId, senderRaw);
  return new Promise((resolve) => {
    let terminado = false;
    const terminar = (valor) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(timer);
      try { conn.ev.off('messages.upsert', handler); } catch {}
      limpiarConfirmacionPendiente(chatId, senderId, senderRaw);
      resolve(valor);
    };
    const handler = (update) => {
      try {
        for (const message of update?.messages || []) {
          if (!message?.message) continue;
          if (message.key?.remoteJid !== chatId) continue;
          if (!mismoAutor(conn, message.key, senderId, senderRaw)) continue;
          const texto = message.message.conversation || message.message.extendedTextMessage?.text || '';
          if (!texto) continue;
          terminar(texto.trim());
          return;
        }
      } catch {}
    };
    const timer = setTimeout(() => terminar(null), timeout);
    conn.ev.on('messages.upsert', handler);
  });
}
