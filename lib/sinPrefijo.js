import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(__dirname, '../database');
const dataPath = path.join(databaseDir, 'sinPrefijo.json');

let sinPrefijoData = { chats: {} };

function ensureDatabaseDir() {
  try {
    if (!fs.existsSync(databaseDir)) {
      fs.mkdirSync(databaseDir, { recursive: true });
      console.log('📁 Carpeta database/ creada automáticamente');
    }
  } catch (e) {
    console.error('Error creando carpeta database/:', e.message);
  }
}

export function loadSinPrefijoData() {
  try {
    ensureDatabaseDir();
    
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      sinPrefijoData = JSON.parse(data);
    } else {
      saveSinPrefijoData();
      console.log('📄 Archivo sinPrefijo.json creado automáticamente');
    }
  } catch (e) {
    console.error('Error cargando sinPrefijo.json:', e.message);
    sinPrefijoData = { chats: {} };
  }
  return sinPrefijoData;
}

export function saveSinPrefijoData() {
  try {
    ensureDatabaseDir();
    fs.writeFileSync(dataPath, JSON.stringify(sinPrefijoData, null, 2));
  } catch (e) {
    console.error('Error guardando sinPrefijo.json:', e.message);
  }
}

export function setSinPrefijo(chatId, value) {
  if (!sinPrefijoData.chats) {
    sinPrefijoData.chats = {};
  }
  sinPrefijoData.chats[chatId] = value;
  saveSinPrefijoData();
}

export function getSinPrefijo(chatId) {
  if (!sinPrefijoData.chats) {
    sinPrefijoData.chats = {};
  }
  return sinPrefijoData.chats[chatId] || false;
}

export function getAllSinPrefijo() {
  return sinPrefijoData.chats || {};
}

loadSinPrefijoData();