import fs from 'fs';

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
  anti18: false,
  modohorny: false,
  modoadmin: false,
  autosticker: false,
  antiToxic: false,
  antiTraba: false,
  antiArab: false,
  antiArab2: false,
  afkAllowed: false,
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
    if (!chatId || typeof chatId !== 'string') {
      console.warn('⚠️ chatId inválido');
      return { ...DEFAULT_CHAT_CONFIG };
    }

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
    if (!chatId || typeof chatId !== 'string') {
      throw new Error('chatId inválido');
    }

    if (!newConfig || typeof newConfig !== 'object') {
      throw new Error('newConfig debe ser un objeto válido');
    }

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
    const filteredConfig = Object.fromEntries(
      Object.entries(newConfig).filter(([_, v]) => v !== undefined)
    );
    data[chatId] = { ...existingConfig, ...filteredConfig };

    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    console.log(`✅ Configuración guardada para chat: ${chatId}`);

    return true;
  } catch (error) {
    console.error('❌ Error al guardar configuración:', error.message);
    throw error;
  }
}

export function restaurarConfiguraciones(conn) {
  try {
    if (!global.db || !global.db.data || !global.db.data.chats) {
      console.warn('⚠️ global.db no está inicializado, restauración omitida');
      return false;
    }

    ensureConfigExists();
    const raw = fs.readFileSync(configPath, 'utf8');
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
    if (!fs.existsSync(configPath)) return false;

    if (!Array.isArray(activeChatIds) || activeChatIds.length === 0) {
      console.warn('⚠️ activeChatIds debe ser un array válido');
      return false;
    }

    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const cleanedData = {};

    activeChatIds.forEach(chatId => {
      if (data[chatId]) {
        cleanedData[chatId] = data[chatId];
      }
    });

    fs.writeFileSync(configPath, JSON.stringify(cleanedData, null, 2));
    console.log(`🧹 Configuraciones limpiadas. Mantenidos ${activeChatIds.length} chats.`);
    return true;
  } catch (error) {
    console.error('❌ Error al limpiar configuraciones:', error.message);
    return false;
  }
}