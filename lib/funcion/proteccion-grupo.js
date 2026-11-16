import fs from 'fs';
import path from 'path';
import { resolveJidToPhone } from './lid-resolver.js';

const STORE = './database/proteccion.json';
const CACHE_MS = 2000;

const AVISO_INMUNIDAD = {
  titulo: '🛡️ *ACCIÓN BLOQUEADA POR INMUNIDAD* 🛡️',
  texto: '{emoji} Lo siento, no puedo {accion} @{tag} porque tiene inmunidad otorgada por {por}{fecha}.',
  accion_mute: 'silenciar',
  accion_warn: 'advertir',
  accion_kick: 'expulsar',
  accion_ban: 'expulsar',
  accion_del: 'borrar los mensajes de',
  accion_generica: 'hacer eso con',
  emoji_mute: '🔇',
  emoji_warn: '⚠️',
  emoji_kick: '🚪',
  emoji_ban: '⛔',
  emoji_del: '🗑️',
  emoji_generica: '🚫',
  por_desconocido: 'un administrador',
  quitar: '🔓 Si querés hacerlo igual, primero quitale la inmunidad:\n👉 `{prefix}inmunidad quitar @{tag}`'
};

let _cache = { data: null, mtime: 0, checked: 0 };

function lectura(ruta) {
  const raw = fs.readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('formato invalido');
  return data;
}

function escribir(data) {
  const dir = path.dirname(STORE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${STORE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  try {
    if (fs.existsSync(STORE)) {
      lectura(STORE);
      fs.copyFileSync(STORE, `${STORE}.bak`);
    }
  } catch {}
  fs.renameSync(tmp, STORE);
  const st = fs.statSync(STORE);
  _cache = { data, mtime: st.mtimeMs, checked: Date.now() };
}

function cargar() {
  const ahora = Date.now();
  if (_cache.data && ahora - _cache.checked < CACHE_MS) return _cache.data;
  _cache.checked = ahora;
  try {
    const st = fs.statSync(STORE);
    if (!_cache.data || st.mtimeMs !== _cache.mtime) {
      try {
        _cache.data = lectura(STORE);
      } catch {
        try {
          _cache.data = lectura(`${STORE}.bak`);
        } catch {
          _cache.data = {};
        }
      }
      _cache.mtime = st.mtimeMs;
    }
  } catch {
    if (!_cache.data) {
      try {
        _cache.data = lectura(`${STORE}.bak`);
      } catch {
        _cache.data = {};
      }
      _cache.mtime = 0;
    }
  }
  return _cache.data;
}

function entrada(data, chat) {
  const id = String(chat || '');
  if (!data[id] || typeof data[id] !== 'object' || Array.isArray(data[id])) data[id] = {};
  const e = data[id];
  if (!Array.isArray(e.inmunes)) e.inmunes = [];
  if (!Array.isArray(e.permitidos)) e.permitidos = [];
  return e;
}

export function soloDigitos(valor) {
  return String(valor ?? '').split('@')[0].replace(/\D/g, '');
}

export function numerosDeJid(jid, conn, participants = []) {
  const numeros = new Set();
  const candidatos = [];
  if (jid && typeof jid === 'object') {
    candidatos.push(jid.id, jid.lid, jid.phoneNumber, jid.jid);
  } else {
    candidatos.push(jid);
  }
  const texto = String(candidatos.filter(Boolean)[0] ?? '');
  if (texto) {
    const encontrado = (participants || []).find(p =>
      p && (p.id === texto || p.lid === texto || p.phoneNumber === texto)
    );
    if (encontrado) candidatos.push(encontrado.id, encontrado.lid, encontrado.phoneNumber);
  }
  for (const c of candidatos) {
    if (!c) continue;
    const d = soloDigitos(c);
    if (d) numeros.add(d);
  }
  try {
    const resuelto = resolveJidToPhone(texto, conn || global.conn);
    const d = soloDigitos(resuelto);
    if (d) numeros.add(d);
  } catch {}
  return numeros;
}

export function numerosInmunes(chat) {
  const data = cargar();
  const e = data[String(chat || '')];
  const set = new Set();
  for (const item of e?.inmunes || []) {
    const d = soloDigitos(item?.numero ?? item);
    if (d) set.add(d);
  }
  return set;
}

export function numerosPermitidos(chat) {
  const data = cargar();
  const e = data[String(chat || '')];
  const set = new Set();
  for (const item of e?.permitidos || []) {
    const d = soloDigitos(item?.numero ?? item);
    if (d) set.add(d);
  }
  return set;
}

export function esInmune(chat, jid, conn, participants = []) {
  const set = numerosInmunes(chat);
  if (!set.size) return false;
  for (const n of numerosDeJid(jid, conn, participants)) {
    if (set.has(n)) return true;
  }
  return false;
}

export function esInmuneDigitos(chat, digitos) {
  const set = numerosInmunes(chat);
  for (const d of digitos || []) {
    if (d && set.has(String(d))) return true;
  }
  return false;
}

export function esNumeroPermitido(chat, jid, conn, participants = []) {
  const set = numerosPermitidos(chat);
  if (!set.size) return false;
  for (const n of numerosDeJid(jid, conn, participants)) {
    if (set.has(n)) return true;
  }
  return false;
}

export function listarInmunes(chat) {
  const data = cargar();
  const e = data[String(chat || '')];
  return (e?.inmunes || []).map(item => ({ ...item }));
}

export function listarPermitidos(chat) {
  const data = cargar();
  const e = data[String(chat || '')];
  return (e?.permitidos || []).map(item => ({ ...item }));
}

export function agregarInmune(chat, { numero, nombre = '', por = '' } = {}) {
  const n = soloDigitos(numero);
  if (!n) return null;
  const data = cargar();
  const e = entrada(data, chat);
  const existente = e.inmunes.find(item => soloDigitos(item?.numero ?? item) === n);
  if (existente) return existente;
  const item = { numero: n, nombre: String(nombre || ''), por: String(por || ''), fecha: Date.now() };
  e.inmunes.push(item);
  escribir(data);
  return item;
}

export function quitarInmune(chat, numero) {
  const n = soloDigitos(numero);
  if (!n) return false;
  const data = cargar();
  const e = entrada(data, chat);
  const antes = e.inmunes.length;
  e.inmunes = e.inmunes.filter(item => soloDigitos(item?.numero ?? item) !== n);
  if (e.inmunes.length === antes) return false;
  escribir(data);
  return true;
}

export function agregarPermitido(chat, { numero, nombre = '', por = '' } = {}) {
  const n = soloDigitos(numero);
  if (!n) return null;
  const data = cargar();
  const e = entrada(data, chat);
  const existente = e.permitidos.find(item => soloDigitos(item?.numero ?? item) === n);
  if (existente) return existente;
  const item = { numero: n, nombre: String(nombre || ''), por: String(por || ''), fecha: Date.now() };
  e.permitidos.push(item);
  escribir(data);
  return item;
}

export function quitarPermitido(chat, numero) {
  const n = soloDigitos(numero);
  if (!n) return false;
  const data = cargar();
  const e = entrada(data, chat);
  const antes = e.permitidos.length;
  e.permitidos = e.permitidos.filter(item => soloDigitos(item?.numero ?? item) !== n);
  if (e.permitidos.length === antes) return false;
  escribir(data);
  return true;
}

export function entradaInmune(chat, jid, conn, participants = []) {
  const numeros = numerosDeJid(jid, conn, participants);
  if (!numeros.size) return null;
  return listarInmunes(chat).find(item => numeros.has(soloDigitos(item.numero))) || null;
}

export function jidParaMencion(valor, conn, participants = []) {
  const d = soloDigitos(valor);
  if (!d) return null;
  const p = (participants || []).find(x =>
    x && (soloDigitos(x.id) === d || soloDigitos(x.lid) === d || soloDigitos(x.phoneNumber) === d)
  );
  if (p?.id && !String(p.id).includes('@lid')) return p.id;
  try {
    const tel = resolveJidToPhone(valor, conn || global.conn);
    if (tel) return `${tel}@s.whatsapp.net`;
  } catch {}
  return String(valor).includes('@') ? String(valor) : `${d}@s.whatsapp.net`;
}

export function avisoInmunidad({ chat, jid, conn, participants = [], accion = 'generica', prefix = '.' } = {}) {
  const entry = entradaInmune(chat, jid, conn, participants);
  if (!entry) return null;
  const jidTexto = typeof jid === 'string' ? jid : (jid?.id || jid?.phoneNumber || jid?.lid || '');
  const tag = soloDigitos(jidTexto);
  const porNum = soloDigitos(entry.por);
  const porTexto = porNum ? `@${porNum}` : AVISO_INMUNIDAD.por_desconocido;
  let fecha = '';
  if (entry.fecha) {
    try {
      fecha = ` 📅 el ${new Date(entry.fecha).toLocaleDateString('es-AR')}`;
    } catch {}
  }
  const accionTexto = AVISO_INMUNIDAD[`accion_${accion}`] || AVISO_INMUNIDAD.accion_generica;
  const emoji = AVISO_INMUNIDAD[`emoji_${accion}`] || AVISO_INMUNIDAD.emoji_generica;
  const cuerpo = AVISO_INMUNIDAD.texto
    .replace(/{emoji}/g, emoji)
    .replace(/{accion}/g, accionTexto)
    .replace(/{tag}/g, tag)
    .replace(/{por}/g, porTexto)
    .replace(/{fecha}/g, fecha);
  const quitar = AVISO_INMUNIDAD.quitar
    .replace(/{prefix}/g, prefix)
    .replace(/{tag}/g, tag);
  const mentions = [jidParaMencion(jidTexto, conn, participants)];
  if (porNum) mentions.push(jidParaMencion(entry.por, conn, participants));
  return {
    texto: `${AVISO_INMUNIDAD.titulo}\n\n${cuerpo}\n\n${quitar}`,
    mentions: [...new Set(mentions.filter(Boolean))],
    entry
  };
}
