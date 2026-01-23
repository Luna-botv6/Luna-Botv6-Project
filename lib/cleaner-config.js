import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';

const CONFIG_FILE = './database/config-cleaner.json';

const DEFAULT_CONFIG = Object.freeze({
  enabled: false,
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
    } catch (error) {}
  }, 500);
}

export async function loadCleanerConfig() {
  if (isLoaded) return config;
  
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = await readFile(CONFIG_FILE, 'utf8');
      const loaded = JSON.parse(data);
      config = { 
        ...DEFAULT_CONFIG, 
        enabled: false,
        autoClean: false,
        intervalHours: loaded.intervalHours || 6,
        lastCleanTime: loaded.lastCleanTime || null
      };
    } else {
      config = { ...DEFAULT_CONFIG };
      await saveCleanerConfig();
    }
  } catch (error) {
    config = { ...DEFAULT_CONFIG };
  }
  
  isLoaded = true;
  return config;
}

export async function saveCleanerConfig() {
  try {
    await ensureDirectory(CONFIG_FILE);
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {}
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
  config.autoClean = false;
  config.intervalHours = Math.max(1, Math.min(168, intervalHours));
  
  debouncedSave();
  return getAutoCleanConfig();
}

export function getAutoCleanConfig() {
  return Object.freeze({
    enabled: false,
    intervalHours: config.intervalHours,
    lastCleanTime: config.lastCleanTime
  });
}

export function shouldAutoClean() {
  return false;
}

export function updateLastCleanTime() {
  config.lastCleanTime = Date.now();
  debouncedSave();
}

export function getNextCleanTime() {
  return null;
}

export function getTimeUntilNextClean() {
  return null;
}

loadCleanerConfig().catch(() => {});