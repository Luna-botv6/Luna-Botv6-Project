import fs from 'fs';
import path from 'path';

const DIR = './database';
const ARCHIVO = path.join(DIR, 'kickbans.json');

const LIMPIEZA_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_POR_GRUPO = 500;
const MAX_MOTIVO = 200;

let cache = null;
let guardando = false;
let pendiente = false;

function asegurarArchivo() {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    if (!fs.existsSync(ARCHIVO)) fs.writeFileSync(ARCHIVO, JSON.stringify({ grupos: {} }, null, 2));
  } catch {}
}

function vacio() {
  return { grupos: {} };
}

function cargar() {
  if (cache) return cache;
  try {
    asegurarArchivo();
    const crudo = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
    if (!crudo || typeof crudo !== 'object' || !crudo.grupos || typeof crudo.grupos !== 'object') {
      cache = vacio();
      return cache;
    }
    cache = crudo;
  } catch {
    cache = vacio();
  }
  return cache;
}

function persistir() {
  if (guardando) {
    pendiente = true;
    return;
  }
  guardando = true;
  try {
    const data = cache || vacio();
    const tmp = ARCHIVO + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, ARCHIVO);
  } catch {}
  guardando = false;
  if (pendiente) {
    pendiente = false;
    persistir();
  }
}

function soloDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

export function normalizarNumero(valor) {
  const digitos = soloDigitos(valor);
  return digitos.length >= 8 ? digitos : null;
}

function grupoDe(data, chatId) {
  if (!data.grupos[chatId] || typeof data.grupos[chatId] !== 'object') data.grupos[chatId] = {};
  return data.grupos[chatId];
}

function horaDe(timestamp) {
  const d = new Date(timestamp);
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function registrarKickban({ chatId, jid, lid, numero, nombre, motivo, autor, autorNombre }) {
  const data = cargar();
  const grupo = grupoDe(data, chatId);
  const ahora = Date.now();
  const num = normalizarNumero(numero || jid);
  if (!num) return null;

  const previo = grupo[num];
  const veces = (previo?.veces || 0) + 1;
  grupo[num] = {
    numero: num,
    jid: jid || num + '@s.whatsapp.net',
    lid: lid && soloDigitos(lid) !== num ? lid : (previo?.lid || undefined),
    nombre: (nombre || previo?.nombre || num).slice(0, 40),
    motivo: String(motivo || 'sin motivo').slice(0, MAX_MOTIVO),
    autor: String(autor || '').slice(0, 30),
    autorNombre: String(autorNombre || '').slice(0, 40),
    grupo: chatId,
    fecha: ahora,
    fechaTexto: horaDe(ahora),
    veces
  };

  const claves = Object.keys(grupo);
  if (claves.length > MAX_POR_GRUPO) {
    claves
      .sort((a, b) => (grupo[a].fecha || 0) - (grupo[b].fecha || 0))
      .slice(0, claves.length - MAX_POR_GRUPO)
      .forEach((k) => delete grupo[k]);
  }

  persistir();
  return grupo[num];
}

function coincideCon(entrada, valor) {
  const digitos = soloDigitos(valor);
  if (!digitos) return null;
  if (digitos === soloDigitos(entrada?.numero)) return entrada;
  if (digitos === soloDigitos(entrada?.jid)) return entrada;
  if (digitos === soloDigitos(entrada?.lid)) return entrada;
  return null;
}

export function listarKickbans(chatId) {
  const data = cargar();
  const grupo = data.grupos[chatId];
  if (!grupo || typeof grupo !== 'object') return [];
  return Object.values(grupo)
    .filter(Boolean)
    .sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
}

export function obtenerKickban(chatId, numero) {
  const data = cargar();
  const digitos = soloDigitos(numero);
  if (!digitos || !data.grupos[chatId]) return null;
  if (data.grupos[chatId][digitos]) return data.grupos[chatId][digitos];
  for (const entrada of Object.values(data.grupos[chatId])) {
    const match = coincideCon(entrada, digitos);
    if (match) return match;
  }
  return null;
}

export function quitarKickban(chatId, numero) {
  const data = cargar();
  if (!data.grupos[chatId]) return null;

  const digitos = soloDigitos(numero);
  if (!digitos) return null;

  const directo = data.grupos[chatId][digitos];
  const byJid = !directo
    ? Object.entries(data.grupos[chatId]).find(([, e]) => coincideCon(e, digitos))
    : null;

  const claves = directo ? [digitos] : (byJid ? [byJid[0]] : []);
  if (!claves.length) return null;

  const clave = claves[0];
  const quitado = data.grupos[chatId][clave];
  delete data.grupos[chatId][clave];
  if (!Object.keys(data.grupos[chatId]).length) delete data.grupos[chatId];
  persistir();
  return quitado;
}

export function limpiarKickban(chatId) {
  const data = cargar();
  const n = Object.keys(data.grupos[chatId] || {}).length;
  delete data.grupos[chatId];
  persistir();
  return n;
}

export function contarPorNumero(numero) {
  const data = cargar();
  const num = normalizarNumero(numero);
  if (!num) return 0;
  let total = 0;
  for (const grupo of Object.values(data.grupos)) {
    if (grupo && grupo[num]) total++;
  }
  return total;
}

export function contarGrupos() {
  const data = cargar();
  return Object.keys(data.grupos || {}).length;
}

export function buscarEnGrupo(chatId, numero) {
  return obtenerKickban(chatId, numero);
}

export function valeLaPurgar() {
  const data = cargar();
  const limite = Date.now() - LIMPIEZA_MS;
  let cambios = 0;
  for (const [chatId, grupo] of Object.entries(data.grupos)) {
    if (!grupo || typeof grupo !== 'object') {
      delete data.grupos[chatId];
      cambios++;
      continue;
    }
    for (const [num, entrada] of Object.entries(grupo)) {
      if (!entrada || (entrada.fecha || 0) < limite) {
        delete grupo[num];
        cambios++;
      }
    }
    if (!Object.keys(grupo).length) delete data.grupos[chatId];
  }
  if (cambios) persistir();
  return cambios;
}

export const kickbanStore = {
  registrarKickban,
  listarKickbans,
  obtenerKickban,
  quitarKickban,
  limpiarKickban,
  contarPorNumero,
  contarGrupos,
  buscarEnGrupo,
  normalizarNumero,
  valeLaPurgar,
  horaDe,
  ARCHIVO
};

export default kickbanStore;
