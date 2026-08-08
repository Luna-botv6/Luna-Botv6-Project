import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, renameSync } from 'fs';
import { join } from 'path';

// Cada cuánto chequea si hay una versión nueva (en ms). Tocá esto para
// cambiar la frecuencia — ej. 10 * 60 * 1000 para cada 10 minutos.
const AUTO_UPDATE_INTERVAL_MS = 30 * 60 * 1000;

const AUTO_UPDATE_PATH = join(process.cwd(), 'src/libraries/base/auto-update.json');
const PROTECTED_FILES = ['config.js'];

function readAutoUpdateConfig() {
  try {
    return JSON.parse(readFileSync(AUTO_UPDATE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeAutoUpdateConfig(data) {
  const tmpPath = AUTO_UPDATE_PATH + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  renameSync(tmpPath, AUTO_UPDATE_PATH);
}

export function hasAutoUpdateDecision() {
  return !!readAutoUpdateConfig();
}

export function isAutoUpdateEnabled() {
  return !!readAutoUpdateConfig()?.enabled;
}

export function setAutoUpdateEnabled(enabled) {
  writeAutoUpdateConfig({ enabled: !!enabled, decidedAt: Date.now() });
}

export function hasGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function checkCanAutoUpdate() {
  if (!hasGitRepo()) {
    return { ok: false, reason: 'No hay un repositorio Git vinculado todavía (usá *.restart* una vez primero para vincularlo).' };
  }
  try {
    execSync('git remote get-url origin', { stdio: 'ignore', timeout: 10000 });
  } catch {
    return { ok: false, reason: 'No hay un remoto "origin" configurado en el repositorio.' };
  }
  try {
    execSync('git ls-remote --exit-code origin', { stdio: 'ignore', timeout: 15000 });
  } catch {
    return { ok: false, reason: 'No pude conectarme al repositorio remoto (revisá la conexión a internet del servidor).' };
  }
  return { ok: true };
}

function backupProtectedFiles() {
  const backups = {};
  for (const file of PROTECTED_FILES) {
    const filePath = join(process.cwd(), file);
    if (existsSync(filePath)) backups[file] = readFileSync(filePath, 'utf8');
  }
  return backups;
}

function restoreProtectedFiles(backups) {
  for (const [file, content] of Object.entries(backups)) {
    writeFileSync(join(process.cwd(), file), content, 'utf8');
  }
}

async function performAutoUpdateCheck() {
  if (!isAutoUpdateEnabled() || !hasGitRepo()) return;

  try {
    const backups = backupProtectedFiles();
    const gitOutput = execSync('git pull origin main', { encoding: 'utf8', timeout: 30000 });
    restoreProtectedFiles(backups);

    if (gitOutput.includes('Already up to date')) return;

    execSync('npm install --silent', { encoding: 'utf8', timeout: 60000 });

    setTimeout(() => {
      if (global.gc) global.gc();
      process.kill(process.ppid, 'SIGTERM');
    }, 3000);
  } catch {
    // Silencioso a propósito: ni le avisa al owner ni reintenta ahora,
    // el próximo chequeo programado lo vuelve a intentar solo.
  }
}

let schedulerStarted = false;

export function startAutoUpdateScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(performAutoUpdateCheck, AUTO_UPDATE_INTERVAL_MS);
}
