import fs from 'fs';
import path from 'path';

const DIR = './database';
const ARCHIVO = path.join(DIR, 'numeros-eliminados.json');
const MAX_POR_GRUPO = 300;
const DIAS = 30;

let cache = null;

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
  try {
    const data = cache || vacio();
    const tmp = ARCHIVO + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, ARCHIVO);
  } catch {}
}

export function soloDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

export function numeroValido(valor) {
  const digitos = soloDigitos(valor);
  return digitos.length >= 8 ? digitos : null;
}

function horaDe(timestamp) {
  const d = new Date(timestamp);
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

function grupoDe(data, chatId) {
  const chat = String(chatId || '');
  if (!data.grupos[chat] || typeof data.grupos[chat] !== 'object') data.grupos[chat] = {};
  return data.grupos[chat];
}

function purgar(grupo, ahora) {
  const limite = ahora - DIAS * 24 * 60 * 60 * 1000;
  for (const [k, entrada] of Object.entries(grupo)) {
    if (!entrada || (entrada.fecha || 0) < limite) delete grupo[k];
  }
  const claves = Object.keys(grupo);
  if (claves.length > MAX_POR_GRUPO) {
    claves
      .sort((a, b) => (grupo[a].fecha || 0) - (grupo[b].fecha || 0))
      .slice(0, claves.length - MAX_POR_GRUPO)
      .forEach((k) => delete grupo[k]);
  }
}

export function registrarEliminado({ chatId, jid, lid, numero, nombre, motivo, origen, autor, autorNombre } = {}) {
  const chat = String(chatId || '');
  if (!chat) return null;
  const lidDig = numeroValido(lid) || '';
  let num = numeroValido(numero) || numeroValido(jid);
  if (!num && lidDig) num = lidDig;
  if (!num) return null;

  const data = cargar();
  const grupo = grupoDe(data, chat);
  const ahora = Date.now();
  const previo = grupo[num];
  grupo[num] = {
    numero: num,
    jid: jid ? String(jid) : (num + '@s.whatsapp.net'),
    lid: lidDig && lidDig !== num ? lidDig : (previo?.lid || ''),
    nombre: String(nombre || previo?.nombre || '').slice(0, 40),
    motivo: String(motivo || 'sin motivo').slice(0, 120),
    origen: String(origen || 'bot').slice(0, 30),
    autor: String(autor || '').slice(0, 30),
    autorNombre: String(autorNombre || '').slice(0, 40),
    grupo: chat,
    fecha: ahora,
    fechaTexto: horaDe(ahora),
    veces: (previo?.veces || 0) + 1
  };
  purgar(grupo, ahora);
  persistir();
  return grupo[num];
}

export function listarEliminados(chatId) {
  const data = cargar();
  const grupo = data.grupos[String(chatId || '')];
  if (!grupo || typeof grupo !== 'object') return [];
  return Object.values(grupo)
    .filter(Boolean)
    .sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
}

export function listarTodos() {
  const data = cargar();
  const salida = [];
  for (const [chat, grupo] of Object.entries(data.grupos || {})) {
    if (!grupo || typeof grupo !== 'object') continue;
    for (const entrada of Object.values(grupo)) {
      if (entrada) salida.push({ ...entrada, grupo: entrada.grupo || chat });
    }
  }
  return salida.sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
}

function coincide(entrada, valor) {
  const digitos = soloDigitos(valor);
  if (!digitos) return false;
  if (digitos === soloDigitos(entrada?.numero)) return true;
  if (digitos === soloDigitos(entrada?.jid)) return true;
  if (digitos === soloDigitos(entrada?.lid)) return true;
  return false;
}

export function buscarEliminado(chatId, valor) {
  const grupo = cargar().grupos[String(chatId || '')];
  if (!grupo) return null;
  for (const entrada of Object.values(grupo)) {
    if (coincide(entrada, valor)) return entrada;
  }
  return null;
}

export function quitarEliminado(chatId, valor) {
  const data = cargar();
  const grupo = data.grupos[String(chatId || '')];
  if (!grupo) return false;
  let quitado = false;
  for (const [clave, entrada] of Object.entries(grupo)) {
    if (!coincide(entrada, valor)) continue;
    delete grupo[clave];
    quitado = true;
  }
  if (!quitado) return false;
  if (!Object.keys(grupo).length) delete data.grupos[String(chatId || '')];
  persistir();
  return true;
}

export function limpiarEliminados(chatId) {
  const data = cargar();
  const chat = String(chatId || '');
  const n = Object.keys(data.grupos[chat] || {}).length;
  delete data.grupos[chat];
  if (n) persistir();
  return n;
}

export const numerosEliminados = {
  registrarEliminado,
  listarEliminados,
  listarTodos,
  buscarEliminado,
  quitarEliminado,
  limpiarEliminados,
  numeroValido,
  soloDigitos,
  ARCHIVO
};

export default numerosEliminados;
