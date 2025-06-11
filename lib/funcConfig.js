import fs from 'fs';
import path from 'path';

const configPath = './database/configuracion.json';
const configDir = './database';

// Función para asegurar que el directorio y archivo existen
function ensureConfigExists() {
  try {
    // Crear directorio si no existe
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log('📁 Directorio database creado automáticamente.');
    }
    
    // Crear archivo si no existe
    if (!fs.existsSync(configPath)) {
      const defaultConfig = {}; // Configuración vacía por defecto
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
    // Asegurar que existe la estructura
    ensureConfigExists();
    
    if (!fs.existsSync(configPath)) return {};
    
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return data[chatId] || {};
  } catch (error) {
    console.error('❌ Error al leer configuración:', error.message);
    return {};
  }
}

export function setConfig(chatId, newConfig) {
  try {
    // Asegurar que existe la estructura
    ensureConfigExists();
    
    let data = {};
    
    if (fs.existsSync(configPath)) {
      try {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        data = JSON.parse(fileContent);
      } catch (parseError) {
        console.warn('⚠️ Archivo de configuración corrupto, creando uno nuevo...');
        data = {};
      }
    }
    
    data[chatId] = newConfig;
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    console.log(`✅ Configuración guardada para chat: ${chatId}`);
  } catch (error) {
    console.error('❌ Error al guardar configuración:', error.message);
    throw error;
  }
}

export function restaurarConfiguraciones() {
  try {
    // Asegurar que existe la estructura
    ensureConfigExists();
    
    const defaultConfig = {}; // Cambia esto si quieres valores por defecto
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('⚙️ Configuraciones restauradas a valores por defecto.');
  } catch (error) {
    console.error('❌ Error al restaurar configuraciones:', error.message);
    throw error;
  }
}

// Función adicional para verificar el estado de la configuración
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

// Función para hacer backup de la configuración
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
