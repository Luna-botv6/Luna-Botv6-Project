import fs from 'fs';

const filePath = './database/tagall_modes.json';
let cache = null;

fs.mkdirSync('./database', { recursive: true });

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    cache = {};
  }
  return cache;
}

function save() {
  fs.writeFileSync(filePath, JSON.stringify(cache, null, 2));
}

export function getTagallMode(chatId) {
  return load()[chatId] || null;
}

export function setTagallMode(chatId, modo) {
  const data = load();
  data[chatId] = modo;
  save();
}

export function resetTagallMode(chatId) {
  const data = load();
  delete data[chatId];
  save();
}
