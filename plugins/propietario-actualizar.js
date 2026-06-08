import { spawn, execSync } from 'child_process';
import { rmSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const BACKUP_DIR = join(process.cwd(), 'backup');

const handler = async (m, { conn, text, usedPrefix }) => {
  let omitFiles = ['config.js', 'subbot-commands/'];
  if (text && text.toLowerCase().startsWith('omite ')) {
    const extras = text.replace(/^omite\s+/i, '').trim().split(/\s+/).filter(Boolean);
    for (const extra of extras) {
      const foundPath = findFile(process.cwd(), extra);
      if (foundPath) omitFiles.push(foundPath);
    }
    await createBackup(omitFiles);
    await conn.reply(m.chat, `📦 Backup creado de: ${omitFiles.join(', ')}`, m);
    return;
  }

  let finalMessage = '';

  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch {
    finalMessage += '🔧 Inicializando repositorio Git...\n';
    try {
      execSync('git init');
      execSync('git remote add origin https://github.com/Luna-botv6/Luna-Botv6-Project.git');
      execSync('git fetch origin');
      execSync('git checkout -b main');
      execSync('git reset --hard origin/main');
      finalMessage += '✅ Repositorio Git inicializado correctamente.\n';
    } catch (e) {
      await conn.reply(m.chat, `❌ Error al inicializar:\n${e.message}`, m);
      return;
    }
  }

  try {
    finalMessage += '🔍 Verificando actualizaciones...\n';
    execSync('git fetch origin');
    const localCommit = execSync('git rev-parse HEAD').toString().trim();
    const remoteCommit = execSync('git rev-parse origin/main').toString().trim();
    if (localCommit === remoteCommit) {
      finalMessage += '✅ El bot ya está actualizado.\n';
      await conn.sendButton(
        m.chat,
        finalMessage,
        'LunaBot V6',
        null,
        [
          ['🔄 Restaurar Backup', `${usedPrefix}restaurar`]
        ],
        null,
        null,
        m
      );
      cleanupGitFolder();
      return;
    }

    finalMessage += '📥 Descargando cambios, espera...\n';
    const pullOutput = await runGitPull();

    if (pullOutput.includes('Already up to date.')) finalMessage += '✅ El bot ya está actualizado.\n';
    else if (pullOutput.includes('Updating') || pullOutput.includes('Fast-forward')) finalMessage += '🔄 Bot actualizado exitosamente!\n```\n' + pullOutput + '\n```\n';
    else finalMessage += '✅ Actualización completada:\n```\n' + pullOutput + '\n```\n';

    finalMessage += '⏳ Restaurando archivos omitidos...\n';
    await restoreBackup();

    await conn.sendButton(
      m.chat,
      finalMessage,
      'LunaBot V6',
      null,
      [
        ['🔄 Restaurar Backup', `${usedPrefix}restaurar`]
      ],
      null,
      null,
      m
    );

    cleanupGitFolder();
  } catch (error) {
    try {
      const status = execSync('git status --porcelain');
      if (status.length > 0) {
        const conflictedFiles = status.toString().split('\n').filter(line => line.trim() !== '').map(line => {
          if (line.includes('.npm/') || line.includes('.cache/') || line.includes('tmp/') || line.includes('MysticSession/') || line.includes('npm-debug.log')) return null;
          return '*→ ' + line.slice(3) + '*';
        }).filter(Boolean);
        if (conflictedFiles.length > 0) {
          const errorMessage = `❌ Error: Hay archivos modificados que impiden la actualización:\n\n${conflictedFiles.join('\n')}\n\n💡 Usa \`.gitpull --force\` para forzar la actualización (esto eliminará los cambios locales).`;
          await conn.reply(m.chat, errorMessage, m);
        }
      }
    } catch (statusError) {
      let errorMessage2 = '❌ Error al actualizar el bot.';
      if (statusError.message) errorMessage2 += '\n*- Mensaje de error:* ' + statusError.message;
      await conn.reply(m.chat, errorMessage2, m);
    }
    cleanupGitFolder();
  }
};

function runGitPull() {
  return new Promise((resolve, reject) => {
    const git = spawn('git', ['pull', 'origin', 'main']);
    let output = '';
    git.stdout.on('data', d => output += d.toString());
    git.stderr.on('data', d => output += d.toString());
    git.on('close', code => {
      if (code === 0) resolve(output);
      else reject(new Error('git pull falló: ' + output));
    });
  });
}

function findFile(base, name) {
  const files = readdirSync(base);
  for (const f of files) {
    const full = join(base, f);
    if (statSync(full).isDirectory()) {
      const res = findFile(full, name);
      if (res) return res.replace(process.cwd() + '/', '');
    } else {
      if (f === name) return full.replace(process.cwd() + '/', '');
    }
  }
  return null;
}

async function createBackup(files) {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  for (const f of files) {
    try {
      const src = join(process.cwd(), f);
      if (!existsSync(src)) continue;
      const dest = join(BACKUP_DIR, f);
      copyRecursive(src, dest);
    } catch {}
  }
}

function copyRecursive(src, dest) {
  const stats = statSync(src);
  if (stats.isDirectory()) {
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
    for (const item of readdirSync(src)) {
      copyRecursive(join(src, item), join(dest, item));
    }
  } else {
    const dir = dirname(dest);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    copyFileSync(src, dest);
  }
}

async function restoreBackup() {
  if (!existsSync(BACKUP_DIR)) return;
  const walk = (dir, relative = '') => {
    for (const f of readdirSync(dir)) {
      const src = join(dir, f);
      const rel = join(relative, f);
      if (statSync(src).isDirectory()) {
        walk(src, rel);
      } else {
        const dest = join(process.cwd(), rel);
        const dir2 = dirname(dest);
        if (!existsSync(dir2)) mkdirSync(dir2, { recursive: true });
        copyFileSync(src, dest);
      }
    }
  };
  walk(BACKUP_DIR);
}

function cleanupGitFolder() {
  try {
    const gitPath = join(process.cwd(), '.git');
    rmSync(gitPath, { recursive: true, force: true });
  } catch {}
}

handler.command = /^(gitpull)$/i;
handler.rowner = true;
export default handler;
