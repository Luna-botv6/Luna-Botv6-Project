import { execSync } from 'child_process';
import { writeFileSync, readFileSync, renameSync, rmSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

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

function getConflictInfo(output) {
  const trackedMarker = 'Your local changes to the following files would be overwritten by merge:';
  const untrackedMarker = 'The following untracked working tree files would be overwritten by merge:';

  let marker = trackedMarker;
  let tracked = true;
  if (!output.includes(trackedMarker) && output.includes(untrackedMarker)) {
    marker = untrackedMarker;
    tracked = false;
  }

  const idx = output.indexOf(marker);
  if (idx === -1) return { tracked, files: [] };

  const after = output.slice(idx + marker.length).split('\n');
  const files = [];
  for (const line of after) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(please|aborting|error:)/i.test(trimmed)) break;
    files.push(trimmed);
  }
  return { tracked, files };
}

export async function gitPullWithAutoRepair(notify) {
  try {
    return execSync('git pull origin main', { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const output = String(e.stdout || '') + String(e.stderr || '');
    const { tracked, files: conflictingFiles } = getConflictInfo(output);
    if (!conflictingFiles.length) throw e;

    if (notify) await notify(
      '😅 *Uy, veo que hubo un conflicto en mi actualización*\n\n' +
      `Un archivo local (${conflictingFiles.join(', ')}) fue modificado acá y choca con lo nuevo del repositorio.\n\n` +
      '🔧 _Dame un momento, activo el modo autorreparación..._'
    );

    const backups = {};
    for (const file of conflictingFiles) {
      if (existsSync(file)) backups[file] = readFileSync(file, 'utf8');
      if (tracked) {
        execSync(`git checkout -- "${file}"`, { encoding: 'utf8' });
      } else {
        unlinkSync(file);
      }
    }

    const result = execSync('git pull origin main', { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });

    for (const [file, content] of Object.entries(backups)) {
      writeFileSync(file, content, 'utf8');
    }

    if (notify) await notify(
      '✨ *Listo, pude solucionarlo yo sola*\n\n' +
      'La actualización nueva ya está disponible. Tus datos locales (owners, config) quedaron intactos 🫶🏻🌙'
    );

    return result;
  }
}

async function performAutoUpdateCheck() {
  if (!isAutoUpdateEnabled() || !hasGitRepo()) return;

  try {
    ensureConfigSkipWorktree();
    const prevPkg = readPkgJson();
    const gitOutput = await gitPullWithAutoRepair();

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
