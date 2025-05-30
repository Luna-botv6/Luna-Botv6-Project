import fs from 'fs';
import path from 'path';

const dir = './database';
const configPath = path.join(dir, 'configuracion.json');

// 🟩 Asegurarse de que exista la carpeta y el archivo antes de usarlos
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log('🟩 Carpeta "database" creada.');
}
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({}));
  console.log('🟩 Archivo "configuracion.json" creado con un JSON vacío.');
}

export function getConfig(chatId) {
  const data = JSON.parse(fs.readFileSync(configPath));
  return data[chatId] || {};
}

export function setConfig(chatId, newConfig) {
  let data = {};
  if (fs.existsSync(configPath)) {
    data = JSON.parse(fs.readFileSync(configPath));
  }
  data[chatId] = newConfig;
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

export function restaurarConfiguraciones() {
  const defaultConfig = {}; // Cambia esto si quieres valores por defecto
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log('⚙️ Configuraciones restauradas a valores por defecto.');
}
