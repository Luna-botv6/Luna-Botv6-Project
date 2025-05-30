import fs from 'fs';
const path = './database/configuracion.json';

export function getConfig(chatId) {
  if (!fs.existsSync(path)) return {};
  const data = JSON.parse(fs.readFileSync(path));
  return data[chatId] || {};
}

export function setConfig(chatId, newConfig) {
  let data = {};
  if (fs.existsSync(path)) {
    data = JSON.parse(fs.readFileSync(path));
  }
  data[chatId] = newConfig;
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

export function restaurarConfiguraciones() {
  const defaultConfig = {}; // Cambia esto si quieres valores por defecto
  fs.writeFileSync(path, JSON.stringify(defaultConfig, null, 2));
  console.log('⚙️ Configuraciones restauradas a valores por defecto.');
}