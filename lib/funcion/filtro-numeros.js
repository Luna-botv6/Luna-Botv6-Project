import { resolveJidToPhone } from './lid-resolver.js';
import { isProtectedOwner, rolProtegido } from './ownerGuard.js';

export const PREFIJOS_ANTIARABES = [
  '20', '212', '213', '216', '218', '249',
  '961', '962', '963', '964', '965', '966', '967', '968',
  '970', '971', '973', '974'
];

export function normalizarPrefijo(valor) {
  const limpio = String(valor ?? '').replace(/\D/g, '');
  if (!limpio || limpio.length > 7) return null;
  return limpio;
}

export function parsearPrefijos(valores) {
  const lista = [];
  const entrada = Array.isArray(valores) ? valores : [valores];
  for (const valor of entrada) {
    const prefijo = normalizarPrefijo(valor);
    if (prefijo && !lista.includes(prefijo)) lista.push(prefijo);
  }
  return lista;
}

export function prefijosPropios(config = {}) {
  const guardados = Array.isArray(config?.antinumeroPrefijos) ? config.antinumeroPrefijos : [];
  return parsearPrefijos(guardados);
}

export function filtrosActivos(config = {}) {
  const filtros = [];
  if (config?.antinumero) {
    const prefijos = prefijosPropios(config);
    if (prefijos.length) filtros.push({ tipo: 'antinumero', prefijos });
  }
  if (config?.antiarabes) filtros.push({ tipo: 'antiarabes', prefijos: PREFIJOS_ANTIARABES });
  return filtros;
}

export function numerosDe(participante, conn) {
  const jids = typeof participante === 'string'
    ? [participante]
    : [participante?.phoneNumber, participante?.id, participante?.lid, participante?.jid];
  const numeros = new Set();
  for (const jid of jids) {
    if (!jid) continue;
    const crudo = String(jid).split('@')[0].replace(/\D/g, '');
    if (crudo) numeros.add(crudo);
    try {
      const resuelto = String(resolveJidToPhone(jid, conn) || '').replace(/\D/g, '');
      if (resuelto) numeros.add(resuelto);
    } catch {}
  }
  return [...numeros];
}

export function prefijoQueCoincide(numeros, prefijos) {
  for (const numero of numeros) {
    for (const prefijo of prefijos) {
      if (numero.startsWith(prefijo)) return { prefijo, numero };
    }
  }
  return null;
}

export function numeroBloqueado(participante, filtros, conn) {
  if (!filtros?.length) return null;
  const numeros = numerosDe(participante, conn);
  if (!numeros.length) return null;
  for (const filtro of filtros) {
    const match = prefijoQueCoincide(numeros, filtro.prefijos);
    if (match) return { tipo: filtro.tipo, prefijos: filtro.prefijos, ...match, numeros };
  }
  return null;
}

export function esProtegido(participante, conn, esAdmin = false) {
  if (esAdmin === true) return true;
  const datos = participante && typeof participante === 'object' ? participante : {};
  if (datos.admin === 'admin' || datos.admin === 'superadmin') return true;
  const jids = [
    datos.phoneNumber,
    datos.id,
    datos.lid,
    datos.jid,
    typeof participante === 'string' ? participante : null
  ].filter(Boolean);
  for (const jid of jids) {
    try {
      if (isProtectedOwner(jid, jid, conn)) return true;
      if (rolProtegido(jid, jid, conn)) return true;
    } catch {}
  }
  return false;
}

export function jidParaExpulsar(participante, fallback) {
  const datos = participante && typeof participante === 'object' ? participante : {};
  const candidatos = [datos.phoneNumber, datos.id, datos.jid, datos.lid, fallback].filter(Boolean);
  const conArroba = candidatos.filter((jid) => String(jid).includes('@'));
  const sinLid = conArroba.find((jid) => !String(jid).includes('@lid'));
  return sinLid || conArroba[0] || candidatos[0] || null;
}

export function jidDeMencion(participante, fallbackJid) {
  const numero = numerosDe(participante, null)[0];
  if (numero) return `${numero}@s.whatsapp.net`;
  return fallbackJid || null;
}
