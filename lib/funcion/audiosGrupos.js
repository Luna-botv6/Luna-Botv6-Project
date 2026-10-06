import fs from 'fs';
import path from 'path';

const GROUP_PATH = './database/audios-grupos.json';
const GROUP_DIR = './database';
const LIB_PATH = './src/audios/index.json';

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5000;

function ensureFile() {
  if (!fs.existsSync(GROUP_DIR)) fs.mkdirSync(GROUP_DIR, { recursive: true });
  if (!fs.existsSync(GROUP_PATH)) fs.writeFileSync(GROUP_PATH, JSON.stringify({}, null, 2));
}

function readGroups() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(GROUP_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeGroups(data) {
  ensureFile();
  fs.writeFileSync(GROUP_PATH, JSON.stringify(data, null, 2));
}

export function getAudiosDelGrupo(chatId) {
  const now = Date.now();
  if (!cache || (now - cacheTime) > CACHE_TTL) {
    cache = readGroups();
    cacheTime = now;
  }
  return cache[chatId] || {};
}

export function setAudioEnGrupo(chatId, triggerKey, entry) {
  const data = readGroups();
  if (!data[chatId]) data[chatId] = {};
  data[chatId][triggerKey] = entry;
  writeGroups(data);
  cache = data;
  cacheTime = Date.now();
}

export function quitarAudioDelGrupo(chatId, triggerKey) {
  const data = readGroups();
  if (!data[chatId] || !(triggerKey in data[chatId])) return false;
  delete data[chatId][triggerKey];
  writeGroups(data);
  cache = data;
  cacheTime = Date.now();
  return true;
}

export function quitarAudioDeTodosLosGrupos(triggerKey) {
  const data = readGroups();
  let tocados = 0;
  for (const chatId of Object.keys(data)) {
    if (data[chatId] && (triggerKey in data[chatId])) {
      delete data[chatId][triggerKey];
      tocados++;
    }
  }
  if (tocados > 0) {
    writeGroups(data);
    cache = data;
    cacheTime = Date.now();
  }
  return tocados;
}

export function archivoEnUso(filename, exceptoTrigger) {
  try {
    const lib = JSON.parse(fs.readFileSync(LIB_PATH, 'utf8'));
    for (const [k, v] of Object.entries(lib)) {
      if (k !== exceptoTrigger && v && v.file === filename) return true;
    }
  } catch {}
  const data = readGroups();
  for (const audios of Object.values(data)) {
    for (const [k, v] of Object.entries(audios || {})) {
      if (k !== exceptoTrigger && v && v.file === filename) return true;
    }
  }
  return false;
}

export function limpiarCacheGrupos() {
  cache = null;
  cacheTime = 0;
}
