import fs from 'fs';
import path from 'path';

const file = './database/config-cleaner.json';
let config = { enabled: true };

// Crear directorio si no existe
function ensureDirectoryExists() {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[cleaner-config] Directorio creado: ${dir}`);
  }
}

// Cargar configuración
export function loadCleanerConfig() {
  try {
    // Asegurar que el directorio existe
    ensureDirectoryExists();
    
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      config = JSON.parse(data);
      console.log('[cleaner-config] Configuración cargada exitosamente');
    } else {
      // Si el archivo no existe, crear uno con la configuración por defecto
      console.log('[cleaner-config] Archivo de configuración no encontrado, creando uno nuevo...');
      saveCleanerConfig();
    }
  } catch (e) {
    console.error('[cleaner-config] Error leyendo configuración:', e.message);
    console.log('[cleaner-config] Usando configuración por defecto');
    // En caso de error, usar configuración por defecto y intentar guardarla
    config = { enabled: true };
    try {
      saveCleanerConfig();
    } catch (saveError) {
      console.error('[cleaner-config] Error guardando configuración por defecto:', saveError.message);
    }
  }
}

// Guardar configuración
export function saveCleanerConfig() {
  try {
    // Asegurar que el directorio existe antes de guardar
    ensureDirectoryExists();
    
    fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf8');
    console.log('[cleaner-config] Configuración guardada exitosamente');
  } catch (e) {
    console.error('[cleaner-config] Error guardando configuración:', e.message);
    throw e; // Re-lanzar el error para que el código que llama pueda manejarlo
  }
}

// Activar/desactivar
export function setCleanerStatus(status) {
  config.enabled = Boolean(status);
  try {
    saveCleanerConfig();
    console.log(`[cleaner-config] Estado del limpiador cambiado a: ${config.enabled}`);
  } catch (e) {
    console.error('[cleaner-config] Error al cambiar estado del limpiador:', e.message);
  }
}

// Obtener estado actual
export function isCleanerEnabled() {
  return config.enabled;
}

// Obtener configuración completa (útil para debugging)
export function getCleanerConfig() {
  return { ...config };
}

// Cargar al iniciar
loadCleanerConfig();
