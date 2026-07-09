import fs from 'fs';
import path from 'path';

export const AUDIOS_DIR = './src/audios';
const INDEX_PATH = path.join(AUDIOS_DIR, 'index.json');

let writeLock = Promise.resolve();
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5000;

function ensureAudiosDir() {
  if (!fs.existsSync(AUDIOS_DIR)) fs.mkdirSync(AUDIOS_DIR, { recursive: true });
}

function readIndex() {
  ensureAudiosDir();
  try {
    const raw = fs.readFileSync(INDEX_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeIndex(index) {
  ensureAudiosDir();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}

export function getCustomAudios() {
  const now = Date.now();
  if (cache && (now - cacheTime) < CACHE_TTL) return cache;
  cache = readIndex();
  cacheTime = now;
  return cache;
}

export async function addCustomAudio(triggerKey, entry) {
  const task = writeLock.then(async () => {
    const index = readIndex();
    index[triggerKey] = entry;
    writeIndex(index);
    cache = index;
    cacheTime = Date.now();
    return index;
  });
  writeLock = task.catch(() => {});
  return task;
}

export async function removeCustomAudio(triggerKey) {
  const task = writeLock.then(async () => {
    const index = readIndex();
    if (!(triggerKey in index)) return false;
    delete index[triggerKey];
    writeIndex(index);
    cache = index;
    cacheTime = Date.now();
    return true;
  });
  writeLock = task.catch(() => {});
  return task;
}

export function getAudioFilePath(filename) {
  return path.join(AUDIOS_DIR, filename);
}

export function ensureDir() {
  ensureAudiosDir();
}
