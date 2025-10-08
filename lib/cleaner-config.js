import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';

const CONFIG_FILE = './database/config-cleaner.json';

const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  autoClean: false,
  intervalHours: 6,
  lastCleanTime: null
});

let config = { ...DEFAULT_CONFIG };
let saveTimeout = null;
let isLoaded = false;

async function ensureDirectory(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
    try {
      await ensureDirectory(CONFIG_FILE);
      await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
      console.error('[cleaner-config] Error guardando:', error.message);
    }
  }, 500);
}

export async function loadCleanerConfig() {
  if (isLoaded) return config;
  
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = await readFile(CONFIG_FILE, 'utf8');
      const loaded = JSON.parse(data);
      config = { ...DEFAULT_CONFIG, ...loaded };
    } else {
      await saveCleanerConfig();
    }
  } catch (error) {
    console.error('[cleaner-config] Error cargando:', error.message);
    config = { ...DEFAULT_CONFIG };
  }
  
  isLoaded = true;
  return config;
}

export async function saveCleanerConfig() {
  try {
    await ensureDirectory(CONFIG_FILE);
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('[cleaner-config] Error guardando:', error.message);
  }
}

export function setCleanerStatus(status) {
  config.enabled = Boolean(status);
  debouncedSave();
  return config.enabled;
}

export function isCleanerEnabled() {
  return config.enabled;
}

export function setAutoClean(enabled, intervalHours = 6) {
  config.autoClean = Boolean(enabled);
  config.intervalHours = Math.max(1, Math.min(168, intervalHours));
  
  if (enabled && !config.lastCleanTime) {
    config.lastCleanTime = Date.now();
  }
  
  debouncedSave();
  return getAutoCleanConfig();
}

export function getAutoCleanConfig() {
  return Object.freeze({
    enabled: config.autoClean,
    intervalHours: config.intervalHours,
    lastCleanTime: config.lastCleanTime
  });
}

export function shouldAutoClean() {
  if (!config.autoClean) return false;
  
  const now = Date.now();
  const intervalMs = config.intervalHours * 3600000;
  
  if (!config.lastCleanTime) {
    config.lastCleanTime = now;
    debouncedSave();
    return true;
  }
  
  return (now - config.lastCleanTime) >= intervalMs;
}

export function updateLastCleanTime() {
  config.lastCleanTime = Date.now();
  debouncedSave();
}

export function getNextCleanTime() {
  if (!config.autoClean || !config.lastCleanTime) return null;
  return config.lastCleanTime + (config.intervalHours * 3600000);
}

export function getTimeUntilNextClean() {
  const next = getNextCleanTime();
  if (!next) return null;
  
  const remaining = next - Date.now();
  return remaining > 0 ? remaining : 0;
}

loadCleanerConfig().catch(console.error);