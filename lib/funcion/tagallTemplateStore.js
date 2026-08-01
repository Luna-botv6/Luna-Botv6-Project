import fs from 'fs';
import path from 'path';

const DB_PATH = './database/tagall-templates.json';
const IMG_DIR = './database/users/tagall';

function ensureDirs() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
}

function loadDB() {
  ensureDirs();
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveDB(db) {
  ensureDirs();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function getCustomTemplate(chatId) {
  const db = loadDB();
  return db[chatId]?.active || null;
}

export function getPendingTemplate(chatId) {
  const db = loadDB();
  return db[chatId]?.pending || null;
}

export function setPendingTemplate(chatId, text, imageBuffer) {
  const db = loadDB();
  if (!db[chatId]) db[chatId] = { active: null, pending: null };

  let imagePath = db[chatId].pending?.image || null;
  if (imageBuffer) {
    imagePath = path.join(IMG_DIR, `${chatId.split('@')[0]}.jpg`);
    fs.writeFileSync(imagePath, imageBuffer);
  }

  const prevText = db[chatId].pending?.text || null;
  db[chatId].pending = {
    text: text !== null && text !== undefined ? text : prevText,
    image: imagePath
  };
  saveDB(db);
  return db[chatId].pending;
}

export function confirmPendingTemplate(chatId) {
  const db = loadDB();
  if (!db[chatId]?.pending) return null;
  db[chatId].active = db[chatId].pending;
  db[chatId].pending = null;
  saveDB(db);
  return db[chatId].active;
}

export function clearPendingTemplate(chatId) {
  const db = loadDB();
  if (db[chatId]) db[chatId].pending = null;
  saveDB(db);
}

export function resetCustomTemplate(chatId) {
  const db = loadDB();
  if (db[chatId]) {
    const imgPath = db[chatId].active?.image;
    if (imgPath && fs.existsSync(imgPath)) {
      try { fs.unlinkSync(imgPath); } catch {}
    }
    db[chatId].active = null;
    db[chatId].pending = null;
  }
  saveDB(db);
}
