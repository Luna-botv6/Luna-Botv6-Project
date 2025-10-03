import fs from 'fs';
import path from 'path';

const configPath = './database/configuracion.json';
const configDir = './database';

const DEFAULT_CHAT_CONFIG = {
  welcome: true,
  sWelcome: '',   
  sBye: '',       
  audios: true,
  antiLink: false,
  antiLink2: false,
  detect: false,
  detect2: false,
  simi: false,
  antiporno: false,
  delete: false,
  antidelete: false,
  antiviewonce: false,
  modohorny: false,
  modoadmin: '',
  autosticker: false,
  antiToxic: false,
  antiTraba: false,
  antiArab: false,
  antiArab2: false,
  game: true
};

function ensureConfigExists() {
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log('📁 Directorio database creado automáticamente.');
    }

    if (!fs.existsSync(configPath)) {
      const defaultConfig = {};
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('📄 Archivo configuracion.json creado automáticamente.');
    }
  } catch (error) {
    console.error('❌ Error al crear la estructura de configuración:', error.message);
    throw error;
  }
}

export function getConfig(chatId) {
  try {
    ensureConfigExists();

    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const chatConfig = data[chatId] || {};
    return { ...DEFAULT_CHAT_CONFIG, ...chatConfig };
  } catch (error) {
    console.error('❌ Error al leer configuración:', error.message);
    return { ...DEFAULT_CHAT_CONFIG };
  }
}

export function setConfig(chatId, newConfig) {
  try {
    ensureConfigExists();

    let data = {};

    if (fs.existsSync(configPath)) {
      try {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        data = JSON.parse(fileContent);
      } catch {
        console.warn('⚠️ Archivo corrupto, creando nuevo...');
        data = {};
      }
    }

    const existingConfig = data[chatId] || {};
    data[chatId] = { ...existingConfig, ...newConfig };

    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    
    if (global.db && global.db.data && global.db.data.chats) {
      if (!global.db.data.chats[chatId]) {
        global.db.data.chats[chatId] = {};
      }
      
      Object.assign(global.db.data.chats[chatId], newConfig);
      
      console.log(`✅ Configuración guardada y sincronizada para chat: ${chatId}`);
      console.log(`📌 Modo admin actualizado a: ${newConfig.modoadmin !== undefined ? newConfig.modoadmin : 'sin cambios'}`);
    } else {
      console.log(`✅ Configuración guardada para chat: ${chatId} (sin sincronización activa)`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error al guardar configuración:', error.message);
    throw error;
  }
}

export function restaurarConfiguraciones(conn) {
  try {
    ensureConfigExists();

    const raw = fs.readFileSync(configPath, 'utf8');
    const data = JSON.parse(raw);

    for (const [chatId, config] of Object.entries(data)) {
      if (!global.db.data.chats[chatId]) global.db.data.chats[chatId] = {};
      Object.assign(global.db.data.chats[chatId], config);
    }

    console.log('✅ Configuraciones restauradas desde configuracion.json');
  } catch (error) {
    console.error('❌ Error al restaurar configuraciones:', error.message);
  }
}

export function checkConfigStatus() {
  const dirExists = fs.existsSync(configDir);
  const fileExists = fs.existsSync(configPath);

  console.log(`📁 Directorio database: ${dirExists ? '✅ Existe' : '❌ No existe'}`);
  console.log(`📄 Archivo configuracion.json: ${fileExists ? '✅ Existe' : '❌ No existe'}`);

  if (fileExists) {
    try {
      const stats = fs.statSync(configPath);
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
    if (!fs.existsSync(configPath)) {
      console.warn('⚠️ No hay archivo de configuración para respaldar.');
      return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./database/configuracion_backup_${timestamp}.json`;

    fs.copyFileSync(configPath, backupPath);
    console.log(`💾 Backup creado: ${backupPath}`);
    return true;
  } catch (error) {
    console.error('❌ Error al crear backup:', error.message);
    return false;
  }
}

export function cleanupOldConfigs(activeChatIds = []) {
  try {
    if (!fs.existsSync(configPath)) return;

    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const cleanedData = {};

    activeChatIds.forEach(chatId => {
      if (data[chatId]) {
        cleanedData[chatId] = data[chatId];
      }
    });

    fs.writeFileSync(configPath, JSON.stringify(cleanedData, null, 2));
    console.log(`🧹 Configuraciones limpiadas. Mantenidos ${activeChatIds.length} chats.`);
  } catch (error) {
    console.error('❌ Error al limpiar configuraciones:', error.message);
  }
}