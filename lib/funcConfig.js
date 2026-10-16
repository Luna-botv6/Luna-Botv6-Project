import fs from 'fs';
import path from 'path';
import { idSubbotActual } from './funcion/db-scope.js';

const configPath = './database/configuracion.json';
const configDir = './database';

function rutaActual() {
  const id = idSubbotActual();
  return id ? path.join('./sub-lunabot/', id, 'configuracion.json') : configPath;
}

function dirActual() {
  const id = idSubbotActual();
  return id ? path.join('./sub-lunabot/', id) : configDir;
}

const DEFAULT_CHAT_CONFIG = {
  welcome: true,
  sWelcome: '',
  sBye: '',
  audios: true,
  agaudios: false,
  antiLink: false,
  antiLink2: false,
  detect: false,
  detect2: false,
  simi: false,
  antiporno: false,
  delete: false,
  antidelete: false,
  antiviewonce: false,
  anti18: false,
  modohorny: false,
  modoadmin: false,
  autosticker: false,
  antiToxic: false,
  antiTraba: false,
  antiArab: false,
  antiArab2: false,
  afkAllowed: true,
  game: true,
  inactivos: false,
  inactivosHoras: 24
};

const CONFIG_CACHE_TTL_MS = 30 * 1000;
const caches = new Map();

function cacheDe(ruta) {
  let c = caches.get(ruta);
  if (!c) {
    c = { data: null, loadedAt: 0 };
    caches.set(ruta, c);
  }
  return c;
}

function invalidateConfigCache() {
  const c = caches.get(rutaActual());
  if (c) {
    c.data = null;
    c.loadedAt = 0;
  }
}

function readConfigFileCached() {
  const ruta = rutaActual();
  const c = cacheDe(ruta);
  const now = Date.now();
  if (c.data && now - c.loadedAt < CONFIG_CACHE_TTL_MS) {
    return c.data;
  }
  const data = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  c.data = data;
  c.loadedAt = now;
  return data;
}

function ensureConfigExists() {
  try {
    const dir = dirActual();
    const ruta = rutaActual();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('📁 Directorio database creado automáticamente.');
    }

    if (!fs.existsSync(ruta)) {
      const defaultConfig = {};
      fs.writeFileSync(ruta, JSON.stringify(defaultConfig, null, 2));
      console.log('📄 Archivo configuracion.json creado automáticamente.');
    }
  } catch (error) {
    console.error('❌ Error al crear la estructura de configuración:', error.message);
    throw error;
  }
}

export function getConfig(chatId) {
  try {
    if (!chatId || typeof chatId !== 'string') {
      console.warn('⚠️ chatId inválido');
      return { ...DEFAULT_CHAT_CONFIG };
    }

    ensureConfigExists();
    const data = readConfigFileCached();
    const chatConfig = data[chatId] || {};
    return { ...DEFAULT_CHAT_CONFIG, ...chatConfig };
  } catch (error) {
    console.error('❌ Error al leer configuración:', error.message);
    return { ...DEFAULT_CHAT_CONFIG };
  }
}

export function setConfig(chatId, newConfig) {
  try {
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('chatId inválido');
    }

    if (!newConfig || typeof newConfig !== 'object') {
      throw new Error('newConfig debe ser un objeto válido');
    }

    ensureConfigExists();
    const ruta = rutaActual();
    let data = {};

    if (fs.existsSync(ruta)) {
      try {
        const fileContent = fs.readFileSync(ruta, 'utf8');
        data = JSON.parse(fileContent);
      } catch {
        console.warn('⚠️ Archivo corrupto, creando nuevo...');
        data = {};
      }
    }

    const existingConfig = data[chatId] || {};
    const filteredConfig = Object.fromEntries(
      Object.entries(newConfig).filter(([_, v]) => v !== undefined)
    );
    data[chatId] = { ...existingConfig, ...filteredConfig };

    fs.writeFileSync(ruta, JSON.stringify(data, null, 2));
    invalidateConfigCache();
    console.log(`✅ Configuración guardada para chat: ${chatId}`);

    return true;
  } catch (error) {
    console.error('❌ Error al guardar configuración:', error.message);
    throw error;
  }
}

export function getConfigChatIds() {
  try {
    ensureConfigExists();
    const data = readConfigFileCached();
    return Object.keys(data || {});
  } catch {
    return [];
  }
}

export function isAfkAllowed(chatId) {
  try {
    return getConfig(chatId).afkAllowed !== false
  } catch {
    return true
  }
}

export function restaurarConfiguraciones(conn) {
  try {
    if (!global.db || !global.db.data || !global.db.data.chats) {
      console.warn('⚠️ global.db no está inicializado, restauración omitida');
      return false;
    }

    ensureConfigExists();
    const raw = fs.readFileSync(rutaActual(), 'utf8');
    const data = JSON.parse(raw);

    for (const [chatId, config] of Object.entries(data)) {
      if (!global.db.data.chats[chatId]) global.db.data.chats[chatId] = {};
      Object.assign(global.db.data.chats[chatId], config);
    }

    console.log('✅ Configuraciones restauradas desde configuracion.json');
    return true;
  } catch (error) {
    console.error('❌ Error al restaurar configuraciones:', error.message);
    return false;
  }
}

export function checkConfigStatus() {
  const dirExists = fs.existsSync(dirActual());
  const fileExists = fs.existsSync(rutaActual());

  console.log(`📁 Directorio database: ${dirExists ? '✅ Existe' : '❌ No existe'}`);
  console.log(`📄 Archivo configuracion.json: ${fileExists ? '✅ Existe' : '❌ No existe'}`);

  if (fileExists) {
    try {
      const stats = fs.statSync(rutaActual());
      console.log(`📊 Tamaño del archivo: ${stats.size} bytes`);
      console.log(`🕒 Última modificación: ${stats.mtime}`);
    } catch (error) {
      console.error('❌ Error al obtener información del archivo:', error.message);
    }
  }

  return { dirExists, fileExists };
}

export function backupConfig() {
  try {
    const ruta = rutaActual();
    if (!fs.existsSync(ruta)) {
      console.warn('⚠️ No hay archivo de configuración para respaldar.');
      return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(dirActual(), `configuracion_backup_${timestamp}.json`);

    fs.copyFileSync(ruta, backupPath);
    console.log(`💾 Backup creado: ${backupPath}`);
    return true;
  } catch (error) {
    console.error('❌ Error al crear backup:', error.message);
    return false;
  }
}

export function cleanupOldConfigs(activeChatIds = []) {
  try {
    const ruta = rutaActual();
    if (!fs.existsSync(ruta)) return false;

    if (!Array.isArray(activeChatIds) || activeChatIds.length === 0) {
      console.warn('⚠️ activeChatIds debe ser un array válido');
      return false;
    }

    const data = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    const cleanedData = {};

    activeChatIds.forEach(chatId => {
      if (data[chatId]) {
        cleanedData[chatId] = data[chatId];
      }
    });

    fs.writeFileSync(ruta, JSON.stringify(cleanedData, null, 2));
    invalidateConfigCache();
    console.log(`🧹 Configuraciones limpiadas. Mantenidos ${activeChatIds.length} chats.`);
    return true;
  } catch (error) {
    console.error('❌ Error al limpiar configuraciones:', error.message);
    return false;
  }
}
