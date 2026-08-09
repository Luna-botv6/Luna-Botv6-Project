import { execSync } from 'child_process';
import { writeFileSync, readFileSync, renameSync } from 'fs';
import { join } from 'path';

const AUTO_UPDATE_INTERVAL_MS = 30 * 60 * 1000;

const AUTO_UPDATE_PATH = join(process.cwd(), 'src/libraries/base/auto-update.json');

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

export function ensureConfigSkipWorktree() {
  try {
    execSync('git update-index --skip-worktree config.js', { stdio: 'ignore' });
  } catch {}
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

async function performAutoUpdateCheck() {
  if (!isAutoUpdateEnabled() || !hasGitRepo()) return;

  try {
    ensureConfigSkipWorktree();
    const gitOutput = execSync('git pull origin main', { encoding: 'utf8', timeout: 30000 });

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
