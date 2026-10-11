import fs from 'fs';
import { getConfig, getConfigChatIds } from '../lib/funcConfig.js';
import { getOwnerNumbers, getSubOwnerNumbers } from '../lib/funcion/system-owners.js';
import { marcarMotivo } from '../lib/funcion/leave-reason.js';
import { resolveRealJidDeLid } from '../lib/funcion/pluginHelper.js';
import {
  loadInactivos, getVisto, getAvisados, marcarAvisado, quitarAvisado,
  quitarVisto, limpiarGrupo, borrarGrupo, horaKey, contarKicksHora,
  sumarKickHora, flushInactivos
} from '../lib/funcion/inactivosDB.js';

export const INACTIVOS_GRACIA_MS = 60 * 60 * 1000;
export const INACTIVOS_CAP_HORA = 5;
export const INACTIVOS_MIN_H = 24;
export const INACTIVOS_MAX_H = 168;
const INTERVALO_MS = 5 * 60 * 1000;

export function validarHorasInactivos(v) {
  const h = parseInt(v, 10);
  if (!Number.isFinite(h)) return null;
  if (h < INACTIVOS_MIN_H || h > INACTIVOS_MAX_H) return null;
  if (h % 24 !== 0) return null;
  return h;
}

export function soloDigitos(v) {
  return String(v || '').split('@')[0].replace(/\D/g, '');
}

export function digitosExentos(participants, { ownerNums = [], subNums = [], botJid = '', activador = '' } = {}) {
  const set = new Set();
  for (const n of [...ownerNums, ...subNums]) {
    const d = String(n).replace(/\D/g, '');
    if (d) set.add(d);
  }
  const db = soloDigitos(botJid);
  if (db) set.add(db);
  const da = soloDigitos(activador);
  if (da) set.add(da);
  for (const p of participants || []) {
    if (p?.admin === 'admin' || p?.admin === 'superadmin') {
      for (const cand of [p.id, p.lid, p.phoneNumber]) {
        const d = soloDigitos(cand);
        if (d) set.add(d);
      }
    }
  }
  return set;
}

export function digitosDe(p) {
  const set = new Set();
  if (typeof p === 'string') {
    const d = soloDigitos(p);
    if (d) set.add(d);
    return set;
  }
  for (const cand of [p?.id, p?.lid, p?.phoneNumber]) {
    const d = soloDigitos(cand);
    if (d) set.add(d);
  }
  return set;
}

export function jidVisible(p) {
  if (typeof p === 'string') {
    if (!p.includes('@lid')) return p;
    try {
      const r = resolveRealJidDeLid(p);
      if (r && String(r).includes('@') && !String(r).includes('@lid')) return r;
    } catch {}
    return p;
  }
  const pn = p?.phoneNumber ? (String(p.phoneNumber).includes('@') ? String(p.phoneNumber) : soloDigitos(p.phoneNumber) + '@s.whatsapp.net') : '';
  if (pn && !pn.includes('@lid') && pn.includes('@')) return pn;
  const id = p?.id || '';
  if (id && !id.includes('@lid')) return id;
  try {
    const r = resolveRealJidDeLid(id || p?.lid || '');
    if (r && String(r).includes('@') && !String(r).includes('@lid')) return r;
  } catch {}
  return id;
}

export function etiquetaMencion(p) {
  const jid = jidVisible(p);
  const display = soloDigitos(jid);
  return { jid, display, tag: `@${display}` };
}

export function vistoDe(chatId, p) {
  let mejor = 0;
  const candidatos = typeof p === 'string' ? [p] : [p?.id, p?.lid, p?.phoneNumber].filter(Boolean);
  for (const c of candidatos) {
    const ts = getVisto(chatId, c);
    if (ts > mejor) mejor = ts;
  }
  return mejor;
}

export function decidirAccion({ vistoTs, warnTs, ahora, umbralMs, graciaMs, kicksHora, cap }) {
  const inactivo = (ahora - (vistoTs || 0)) > umbralMs;
  if (!inactivo) return warnTs ? 'perdonar' : 'nada';
  if (!warnTs) return 'avisar';
  if ((ahora - warnTs) < graciaMs) return 'nada';
  if (kicksHora >= cap) return 'nada';
  return 'expulsar';
}

function dormir(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function leerT(idioma) {
  const lang = idioma || global.defaultLenguaje || 'es';
  try {
    const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'))?.plugins?.admin_inactivos;
    if (t) return t;
  } catch {}
  try {
    return JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'))?.plugins?.admin_inactivos || {};
  } catch {}
  return {};
}

function fmtInactivo(ms) {
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `${Math.floor(h / 24)}d`;
  return `${h}h`;
}

export async function procesarGrupo(conn, chat, cfg) {
  const botJid = conn?.user?.jid;
  if (!botJid || !chat) return;
  const horas = validarHorasInactivos(cfg?.inactivosHoras) || 24;
  const umbralMs = horas * 3600 * 1000;
  let meta;
  try {
    meta = await conn.groupMetadata(chat);
  } catch {
    return;
  }
  const participants = meta?.participants || [];
  if (!participants.length) return;
  const yo = participants.find((p) => {
    const ds = digitosDe(p);
    const db = soloDigitos(botJid);
    return db && ds.has(db);
  });
  if (yo?.admin !== 'admin' && yo?.admin !== 'superadmin') return;
  const exentos = digitosExentos(participants, {
    ownerNums: getOwnerNumbers(),
    subNums: getSubOwnerNumbers(),
    botJid,
    activador: cfg?.inactivosPor || ''
  });
  const jidsValidos = [];
  for (const p of participants) {
    if (p?.id) jidsValidos.push(p.id);
    if (p?.lid && p.lid !== p.id) jidsValidos.push(p.lid);
    if (p?.phoneNumber && p.phoneNumber !== p.id) jidsValidos.push(p.phoneNumber);
  }
  limpiarGrupo(chat, jidsValidos);
  const avisados = getAvisados(chat);
  const ahora = Date.now();
  const bucket = horaKey(ahora);
  let kicks = contarKicksHora(chat, bucket);
  const idioma = global.db?.data?.chats?.[chat]?.language || global.defaultLenguaje || 'es';
  const t = leerT(idioma);
  for (const p of participants) {
    const jid = jidVisible(p);
    if (!jid) continue;
    const ds = digitosDe(p);
    let esExento = false;
    for (const d of ds) if (exentos.has(d)) { esExento = true; break; }
    if (esExento) {
      if (avisados[jid]) quitarAvisado(chat, jid);
      continue;
    }
    const vistoTs = vistoDe(chat, p);
    const warnTs = avisados[jid] || 0;
    const accion = decidirAccion({ vistoTs, warnTs, ahora, umbralMs, graciaMs: INACTIVOS_GRACIA_MS, kicksHora: kicks, cap: INACTIVOS_CAP_HORA });
    if (accion === 'perdonar') {
      quitarAvisado(chat, jid);
      continue;
    }
    if (accion === 'avisar') {
      const hace = fmtInactivo(ahora - vistoTs);
      const menc = etiquetaMencion(p);
      const texto = (t.aviso || '👋 Hola {tag}, hace {hace} que no escribís. Si seguís inactivo te saco del grupo en {gracia}; si escribís ahora, te saco de la lista.')
        .replace('{tag}', menc.tag)
        .replace('{hace}', hace)
        .replace('{gracia}', '1 hora')
        .replace('{umbral}', `${horas} h`);
      try {
        await conn.sendMessage(chat, { text: texto, mentions: [jid] });
        marcarAvisado(chat, jid);
      } catch {}
      continue;
    }
    if (accion === 'expulsar') {
      marcarMotivo(chat, [jid, p?.lid, p?.phoneNumber].filter(Boolean), { tipo: 'inactivo' });
      try {
        await conn.groupParticipantsUpdate(chat, [jid], 'remove');
      } catch {
        continue;
      }
      kicks = sumarKickHora(chat, bucket);
      quitarAvisado(chat, jid);
      quitarVisto(chat, jid);
      await dormir(5000 + Math.random() * 10000);
    }
  }
}

export async function pasarInactivos(conn) {
  if (!conn?.user?.jid) return;
  loadInactivos();
  let chats = [];
  try {
    chats = getConfigChatIds();
  } catch {
    return;
  }
  for (const chat of chats) {
    let cfg;
    try {
      cfg = getConfig(chat);
    } catch {
      continue;
    }
    if (!cfg?.inactivos) continue;
    if (!String(chat).endsWith('@g.us')) continue;
    try {
      await procesarGrupo(conn, chat, cfg);
    } catch {}
    await dormir(1000 + Math.random() * 1000);
  }
  flushInactivos();
}

let _started = false;

export function startInactivosChecker(conn) {
  if (_started) return;
  _started = true;
  const correr = () => pasarInactivos(conn).catch(() => {});
  setTimeout(correr, 30 * 1000);
  const intervalo = setInterval(correr, INTERVALO_MS);
  if (typeof intervalo.unref === 'function') intervalo.unref();
}

export function _resetCheckerForTest() {
  _started = false;
}
