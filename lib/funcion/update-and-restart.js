import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { ensureConfigSkipWorktree, readPkgJson, applyDepsAfterUpdate, safeNpmInstall, hasGitRepo, gitPullWithAutoRepair } from './self-update.js';

const RESTART_FILE = '/tmp/luna-restart-notify.json';
const REPO_URL = 'https://github.com/Luna-botv6/Luna-Botv6-Project.git';

function initRepo() {
  execSync('git init', { encoding: 'utf8' });
  execSync(`git remote add origin ${REPO_URL}`, { encoding: 'utf8' });
  execSync('git fetch origin', { encoding: 'utf8', timeout: 60000 });
  execSync('git checkout -B main --track origin/main', { encoding: 'utf8' });
  execSync('git reset --hard origin/main', { encoding: 'utf8', timeout: 60000 });
  ensureConfigSkipWorktree();
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
      safeNpmInstall();
    } else {
      ensureConfigSkipWorktree();
      const prevPkg = readPkgJson();
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
        applyDepsAfterUpdate(prevPkg);
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
