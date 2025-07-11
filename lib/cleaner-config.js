import fs from 'fs';
import path from 'path';

const file = './database/config-cleaner.json';
let config = { 
  enabled: true,
  autoClean: false,
  intervalHours: 6,
  lastCleanTime: null
};

// Función para asegurar que el directorio existe
function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Cargar configuración
export function loadCleanerConfig() {
  if (fs.existsSync(file)) {
    try {
      const loadedConfig = JSON.parse(fs.readFileSync(file, 'utf8'));
      config = { ...config, ...loadedConfig };
    } catch (e) {
      console.error('[cleaner-config] Error leyendo configuración:', e.message);
    }
  } else {
    saveCleanerConfig();
  }
}

// Guardar configuración
export function saveCleanerConfig() {
  try {
    ensureDirectoryExists(file);
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('[cleaner-config] Error guardando configuración:', e.message);
  }
}

// Activar/desactivar limpieza manual
export function setCleanerStatus(status) {
  config.enabled = status;
  saveCleanerConfig();
}

// Obtener estado actual
export function isCleanerEnabled() {
  return config.enabled;
}

// Configurar limpieza automática
export function setAutoClean(enabled, intervalHours = 6) {
  config.autoClean = enabled;
  config.intervalHours = intervalHours;
  if (enabled) {
    config.lastCleanTime = Date.now();
  }
  saveCleanerConfig();
}

// Obtener configuración de limpieza automática
export function getAutoCleanConfig() {
  return {
    enabled: config.autoClean,
    intervalHours: config.intervalHours,
    lastCleanTime: config.lastCleanTime
  };
}

// Verificar si es hora de limpiar
export function shouldAutoClean() {
  if (!config.autoClean) return false;
  
  const now = Date.now();
  const intervalMs = config.intervalHours * 60 * 60 * 1000;
  
  if (!config.lastCleanTime) {
    config.lastCleanTime = now;
    saveCleanerConfig();
    return true;
  }
  
  return (now - config.lastCleanTime) >= intervalMs;
}

// Actualizar tiempo de última limpieza
export function updateLastCleanTime() {
  config.lastCleanTime = Date.now();
  saveCleanerConfig();
}

// Cargar al iniciar
loadCleanerConfig();
