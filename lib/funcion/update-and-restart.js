import { writeFileSync, existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { ensureConfigSkipWorktree } from './self-update.js';

const RESTART_FILE = '/tmp/luna-restart-notify.json';
const REPO_URL = 'https://github.com/Luna-botv6/Luna-Botv6-Project.git';

function hasGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function initRepo() {
  execSync('git init', { encoding: 'utf8' });
  execSync(`git remote add origin ${REPO_URL}`, { encoding: 'utf8' });
  execSync('git fetch origin', { encoding: 'utf8', timeout: 60000 });
  execSync('git checkout -B main --track origin/main', { encoding: 'utf8' });
  execSync('git reset --hard origin/main', { encoding: 'utf8', timeout: 60000 });
  ensureConfigSkipWorktree();
}

// Cuando git pull falla porque hay archivos modificados localmente (ej.
// config.js con owners agregados), el mensaje de error lista esos archivos
// así:
//   error: Your local changes to the following files would be overwritten by merge:
//   	config.js
//   Please commit your changes or stash them before you merge.
// Esta función saca esa lista de nombres del texto del error.
function extractConflictingFiles(output) {
  const marker = 'would be overwritten by merge:';
  const idx = output.indexOf(marker);
  if (idx === -1) return [];
  const after = output.slice(idx + marker.length).split('\n');
  const files = [];
  for (const line of after) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(please|aborting|error:)/i.test(trimmed)) break;
    files.push(trimmed);
  }
  return files;
}

// Intenta el pull normal. Si falla por el conflicto de arriba: hace backup
// en memoria de cada archivo en conflicto, descarta el cambio local
// (git checkout), reintenta el pull, y restaura el contenido local
// encima del archivo recién bajado — mismo proceso manual de siempre
// (bajar config.js, borrarlo, reiniciar, resubirlo) pero automático.
async function gitPullWithAutoRepair(notify) {
  try {
    return execSync('git pull origin main', { encoding: 'utf8', timeout: 30000 });
  } catch (e) {
    const output = String(e.stdout || '') + String(e.stderr || '');
    const conflictingFiles = extractConflictingFiles(output);
    if (!conflictingFiles.length) throw e;

    if (notify) await notify(
      '😅 *Uy, veo que hubo un conflicto en mi actualización*\n\n' +
      `Un archivo local (${conflictingFiles.join(', ')}) fue modificado acá y choca con lo nuevo del repositorio.\n\n` +
      '🔧 _Dame un momento, activo el modo autorreparación..._'
    );

    const backups = {};
    for (const file of conflictingFiles) {
      if (existsSync(file)) backups[file] = readFileSync(file, 'utf8');
      execSync(`git checkout -- "${file}"`, { encoding: 'utf8' });
    }

    const result = execSync('git pull origin main', { encoding: 'utf8', timeout: 30000 });

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

// notify: callback opcional para ir avisando el progreso (ej. por WhatsApp).
// restartNotifyChat: a qué chat avisar DESPUÉS de reiniciar (opcional — si
// no se pasa, no hay aviso posterior, el que dispara el reinicio ya sabe
// que lo hizo).
export async function runUpdateAndRestart({ notify, restartNotifyChat } = {}) {
  try {
    if (!hasGitRepo()) {
      if (notify) await notify('⚙️ *No se encontro repositorio Git*\n\n🔧 Inicializando y vinculando con GitHub...');
      initRepo();
      if (notify) await notify('✅ *Repositorio inicializado correctamente*\n\n⏳ _Instalando dependencias..._');
      execSync('npm install --silent', { encoding: 'utf8', timeout: 60000 });
    } else {
      ensureConfigSkipWorktree();
      const gitOutput = await gitPullWithAutoRepair(notify);
      const updated = !gitOutput.includes('Already up to date');

      if (updated) {
        const lines = gitOutput.split('\n').filter(l => l.trim());
        const fileLines = lines.filter(l => /\|/.test(l) && /[+\-]/.test(l));
        const fileList = fileLines.map(l => `　📄 ${l.split('|')[0].trim()} ✅`).join('\n');
        const summary = lines.find(l => l.includes('file') && l.includes('changed')) || '';

        if (notify) await notify(
          '📦 *Actualizacion detectada*\n\n' +
          `📂 *Archivos:*\n${fileList || '　📄 Sin detalle'}\n\n` +
          `📊 ${summary}\n\n` +
          '⏳ _Instalando dependencias..._'
        );
        execSync('npm install --silent', { encoding: 'utf8', timeout: 60000 });
      } else if (notify) {
        await notify('✅ *Ya esta en la ultima version*\n\n⏳ Reiniciando de todas formas...');
      }
    }
  } catch (e) {
    if (notify) await notify(`⚠️ *No se pudo actualizar*\n\n${e.message}\n\n⏳ Reiniciando sin actualizar...`);
  }

  writeFileSync(RESTART_FILE, JSON.stringify({ chat: restartNotifyChat || null }), 'utf8');

  setTimeout(() => {
    if (global.gc) global.gc();
    process.kill(process.ppid, 'SIGTERM');
  }, 3000);
}
