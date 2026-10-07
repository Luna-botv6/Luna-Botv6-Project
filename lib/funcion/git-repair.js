import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, renameSync, rmSync } from 'fs';
import { join, resolve, relative, basename } from 'path';
import { pathToFileURL } from 'url';
import chalk from 'chalk';

export const TRACKED_MARKER = 'Your local changes to the following files would be overwritten by merge:';
export const UNTRACKED_MARKER = 'The following untracked working tree files would be overwritten by merge:';

export function parseConflictInfo(output) {
  const text = String(output || '');
  let marker = TRACKED_MARKER;
  let tracked = true;
  if (!text.includes(TRACKED_MARKER) && text.includes(UNTRACKED_MARKER)) {
    marker = UNTRACKED_MARKER;
    tracked = false;
  }
  const idx = text.indexOf(marker);
  if (idx === -1) return { tracked: true, files: [] };
  const after = text.slice(idx + marker.length).split('\n');
  const files = [];
  for (const line of after) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(please|aborting|error:)/i.test(trimmed)) break;
    files.push(trimmed);
  }
  return { tracked, files };
}

export function detectDivergent(output) {
  return /divergent|reconcile|non-fast-forward|need to specify how/i.test(String(output || ''));
}

export function isTracked(file) {
  try {
    execSync(`git ls-files --error-unmatch -- "${file}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

export function ensureCriticalFiles(files, notify) {
  const restaurados = [];
  for (const file of files || ['config.js']) {
    if (existsSync(file)) continue;
    if (restaurarConfigLocal(file)) {
      restaurados.push(file);
      if (notify) notify(`📥 *Recuperé ${file} del respaldo local.*`).catch?.(() => {});
      continue;
    }
    try {
      execSync(`git checkout -- "${file}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    } catch {
      try {
        const contenido = execSync(`git show origin/main:"${file}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
        writeFileSync(file, contenido, 'utf8');
      } catch {
        continue;
      }
    }
    if (existsSync(file)) {
      restaurados.push(file);
      respaldarConfigLocal(file);
      if (notify) notify(`📥 *Recuperé ${file}, que faltaba en el servidor.*`).catch?.(() => {});
    }
  }
  return restaurados;
}

const RESPALDO_SUFFIX = '.luna-respaldo';

export function rutaRespaldoLocal(file) {
  return `${file}${RESPALDO_SUFFIX}`;
}

export function respaldarConfigLocal(file) {
  try {
    const f = file || 'config.js';
    if (!existsSync(f)) return false;
    writeFileSync(rutaRespaldoLocal(f), readFileSync(f));
    return true;
  } catch {
    return false;
  }
}

export function restaurarConfigLocal(file) {
  try {
    const f = file || 'config.js';
    const bak = rutaRespaldoLocal(f);
    if (existsSync(f) || !existsSync(bak)) return false;
    writeFileSync(f, readFileSync(bak));
    return existsSync(f);
  } catch {
    return false;
  }
}

export function instalarGuardiaConfig() {
  if (global.__guardiaConfigInstalada) return;
  global.__guardiaConfigInstalada = true;
  process.on('unhandledRejection', (reason) => {
    const recuperado = intentarRecuperarModulo(reason);
    if (recuperado) return;
    setImmediate(() => { throw reason; });
  });
}

function rutaLocalDesdeError(reason) {
  const texto = String((reason && reason.url) || (reason && reason.message) || '');
  let candidato = null;
  const porUrl = texto.match(/file:\/\/([^\s?'"]+)/);
  if (porUrl) {
    try {
      candidato = decodeURIComponent(porUrl[1]);
    } catch {
      candidato = porUrl[1];
    }
  }
  if (!candidato) {
    const porMsg = texto.match(/Cannot find module '([^']+)'/);
    if (porMsg) candidato = porMsg[1];
  }
  if (!candidato) return null;
  const resuelto = resolve(process.cwd(), candidato);
  const raiz = resolve(process.cwd());
  if (resuelto !== raiz && !resuelto.startsWith(raiz + '/') && !resuelto.startsWith(raiz + '\\')) return null;
  const rel = relative(raiz, resuelto).replace(/\\/g, '/');
  if (!rel || rel.startsWith('.') || /^(node_modules|session|database|\.git)(\/|$)/.test(rel)) return null;
  if (/\.luna-(respaldo|bak-)/.test(rel)) return null;
  return resuelto;
}

export function intentarRecuperarModulo(reason) {
  const codigo = reason && reason.code;
  if (codigo !== 'ERR_MODULE_NOT_FOUND') return null;
  const textoPkg = String((reason && reason.message) || '');
  const mp = textoPkg.match(/Cannot find (?:package|module) '([^']+)'/);
  const faltante = mp && mp[1];
  if (faltante && !/^[./]/.test(faltante) && !/^file:/.test(faltante)) {
    const partes = faltante.split('/');
    const dirPkg = partes[0].startsWith('@') ? partes.slice(0, 2).join('/') : partes[0];
    if (!existsSync(join(process.cwd(), 'node_modules', dirPkg))) {
      console.log(chalk.yellow(`⏳ Dependencia ${faltante} en instalación, recarga omitida.`));
      return 'dependencia';
    }
    return null;
  }
  const archivo = rutaLocalDesdeError(reason);
  if (!archivo || existsSync(archivo)) return null;
  const esConfig = /config\.js$/.test(archivo);
  let traido = false;
  if (esConfig && restaurarConfigLocal(archivo)) {
    traido = true;
  } else {
    try {
      execSync(`git checkout -- "${archivo}"`, { stdio: 'ignore', timeout: 30000 });
      traido = existsSync(archivo);
    } catch {}
    if (!traido) {
      try {
        const rel = relative(resolve(process.cwd()), archivo).replace(/\\/g, '/');
        const contenido = execSync(`git show origin/main:"${rel}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
        writeFileSync(archivo, contenido, 'utf8');
        traido = existsSync(archivo);
      } catch {}
    }
  }
  if (!traido) return null;
  if (esConfig) respaldarConfigLocal(archivo);
  const nombre = basename(archivo);
  console.log(chalk.cyan(`🛠️ Reparación automática: detecté que se borró *${nombre}*, lo traje y lo actualicé.`));
  if (/\.m?js$/.test(archivo)) {
    import(pathToFileURL(archivo).href + `?update=${Date.now()}`).catch(() => {});
  }
  return archivo;
}

function apartar(file) {
  const destino = `${file}.luna-bak-${Date.now()}`;
  try {
    if (existsSync(file)) renameSync(file, destino);
    return destino;
  } catch {
    return null;
  }
}

export async function repairAndPull(notify) {
  let output = '';
  try {
    output = execSync('git pull origin main', { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
    return { output, reparado: false };
  } catch (e) {
    output = String(e.stdout || '') + String(e.stderr || '') + String(e.message || '');
  }
  if (detectDivergent(output)) {
    throw new Error(
      'Tu copia local tiene commits propios que chocan con GitHub (ramas divergidas). ' +
      'El bot no lo puede resolver solo sin riesgo de borrar tu trabajo. ' +
      'Pedile a tu proveedor que revise el git del servidor.'
    );
  }
  const { files } = parseConflictInfo(output);
  if (!files.length) throw new Error(output.slice(0, 300) || 'git pull falló sin detalle.');
  if (notify) {
    await notify(
      '😅 *Uy, veo que hubo un conflicto en mi actualización*\n\n' +
      `Un archivo local (${files.join(', ')}) choca con lo nuevo del repositorio.\n\n` +
      '🔧 _Dame un momento, activo el modo autorreparación..._'
    );
  }
  const respaldos = {};
  for (const file of files) {
    if (!existsSync(file)) continue;
    if (isTracked(file)) {
      try {
        respaldos[file] = readFileSync(file);
        execSync(`git checkout -- "${file}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        continue;
      } catch {}
    }
    try {
      const contenido = readFileSync(file);
      const destino = apartar(file);
      if (destino) {
        respaldos[file] = { contenido, destino };
        continue;
      }
    } catch {}
    try {
      respaldos[file] = readFileSync(file);
    } catch {}
  }
  const result = execSync('git pull origin main', { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const [file, respaldo] of Object.entries(respaldos)) {
    if (Buffer.isBuffer(respaldo)) {
      writeFileSync(file, respaldo);
    } else if (respaldo && respaldo.contenido !== undefined) {
      writeFileSync(file, respaldo.contenido);
      try {
        if (respaldo.destino && existsSync(respaldo.destino)) rmSync(respaldo.destino, { force: true });
      } catch {}
    }
  }
  ensureCriticalFiles(['config.js']);
  respaldarConfigLocal('./config.js');
  if (notify) {
    await notify(
      '✨ *Listo, pude solucionarlo yo sola*\n\n' +
      'La actualización nueva ya está disponible. Tus datos locales quedaron intactos 🫶🏻🌙'
    );
  }
  return { output: String(result), reparado: true };
}

export function gitBehindCount() {
  execSync('git fetch origin', { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = execSync('git rev-list --count HEAD..origin/main', { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
  return parseInt(String(out).trim(), 10) || 0;
}

export function gitShortHead() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function modifiedTrackedFiles() {
  try {
    const out = execSync('git status --porcelain', { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
    return out.split('\n')
      .filter((l) => /^[ MARCUD?!]{0,2}M/.test(l))
      .map((l) => l.slice(3).trim().replace(/^"(.*)"$/, '$1'))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function runDeepRepair({ notify } = {}) {
  const avisar = async (msg) => {
    if (notify) await notify(msg);
  };
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch {
    throw new Error('Este bot no tiene repositorio Git vinculado. Reinstalá desde cero.');
  }
  await avisar(
    '🛠️ *Reparación profunda en marcha*\n\n' +
    'Voy a: guardar tus datos → traer todo de GitHub → limpieza total de dependencias → reinstalar → reiniciar.\n' +
    '⏳ _El bot queda offline varios minutos. No lo apagues._'
  );
  execSync('git fetch origin', { encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
  const locales = {};
  for (const file of modifiedTrackedFiles()) {
    try {
      if (existsSync(file)) locales[file] = readFileSync(file);
    } catch {}
  }
  for (const extra of ['config.js', 'system-owner.json']) {
    try {
      if (existsSync(extra) && !(extra in locales)) locales[extra] = readFileSync(extra);
    } catch {}
  }
  await avisar(`📦 Resguardé ${Object.keys(locales).length} archivos locales. Reseteando...`);
  execSync('git reset --hard origin/main', { encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const [file, contenido] of Object.entries(locales)) {
    try {
      writeFileSync(file, contenido);
    } catch {}
  }
  ensureCriticalFiles(['config.js']);
  respaldarConfigLocal('./config.js');
  await avisar('🧹 Limpieza profunda: borrando dependencias viejas...');
  rmSync(join(process.cwd(), 'node_modules'), { recursive: true, force: true });
  rmSync(join(process.cwd(), 'package-lock.json'), { force: true });
  await avisar('📥 Instalando dependencias de cero (tarda varios minutos)...');
  execSync('npm install --silent', { encoding: 'utf8', timeout: 600000, stdio: ['ignore', 'pipe', 'pipe'] });
  await avisar('✅ *Reparación lista, reiniciando...*');
}
