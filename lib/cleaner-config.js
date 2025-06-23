import fs from 'fs';

const file = './database/config-cleaner.json';
let config = { enabled: true };

// Cargar configuración
export function loadCleanerConfig() {
  if (fs.existsSync(file)) {
    try {
      config = JSON.parse(fs.readFileSync(file));
    } catch (e) {
      console.error('[cleaner-config] Error leyendo configuración:', e.message);
    }
  } else {
    saveCleanerConfig();
  }
}

// Guardar configuración
export function saveCleanerConfig() {
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
}

// Activar/desactivar
export function setCleanerStatus(status) {
  config.enabled = status;
  saveCleanerConfig();
}

// Obtener estado actual
export function isCleanerEnabled() {
  return config.enabled;
}

// Cargar al iniciar
loadCleanerConfig();
