import { execSync } from 'child_process';
import { writeFileSync, readFileSync, renameSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { repairAndPull, ensureCriticalFiles } from './git-repair.js';

export function readPkgJson() {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

export function pkgJsonChanged(prev, next) {
  return JSON.stringify(prev) !== JSON.stringify(next);
}

export function baileysChanged(prev, next) {
  const dep = '@whiskeysockets/baileys';
  return (prev?.dependencies?.[dep] || prev?.optionalDependencies?.[dep])
    !== (next?.dependencies?.[dep] || next?.optionalDependencies?.[dep]);
}

export function safeNpmInstall() {
  try {
    execSync('npm install --silent', { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    rmSync(join(process.cwd(), 'node_modules'), { recursive: true, force: true });
    rmSync(join(process.cwd(), 'package-lock.json'), { force: true });
    execSync('npm install --silent', { encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] });
  }
}

function prepareAfterUpdate(prevPkg) {
  const nextPkg = readPkgJson();
  if (prevPkg && nextPkg && pkgJsonChanged(prevPkg, nextPkg) && baileysChanged(prevPkg, nextPkg)) {
    rmSync(join(process.cwd(), 'node_modules/@whiskeysockets'), { recursive: true, force: true });
    rmSync(join(process.cwd(), 'node_modules/@lunabotv6'), { recursive: true, force: true });
  }
}

export function applyDepsAfterUpdate(prevPkg) {
  prepareAfterUpdate(prevPkg);
  safeNpmInstall();
}

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
    ensureCriticalFiles(['config.js']);
    const prevPkg = readPkgJson();
    const { output: gitOutput } = await repairAndPull();

    if (gitOutput.includes('Already up to date')) return;

    console.log(chalk.cyan('🔄 [AutoUpdate] Nueva versión encontrada, actualizando...'));

    applyDepsAfterUpdate(prevPkg);

    console.log(chalk.green('✅ [AutoUpdate] Actualización aplicada, reiniciando...'));

    setTimeout(() => {
      if (global.gc) global.gc();
      process.kill(process.ppid, 'SIGTERM');
    }, 3000);
  } catch (e) {
    console.error(chalk.red('❌ [AutoUpdate] Falló el chequeo automático:'), e.message);
  }
}

let schedulerStarted = false;

export function startAutoUpdateScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(performAutoUpdateCheck, AUTO_UPDATE_INTERVAL_MS);
}
