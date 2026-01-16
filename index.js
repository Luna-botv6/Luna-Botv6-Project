import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

async function getRealMemory() {
  try {
    if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
      const limit = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim();
      const limitBytes = parseInt(limit);
      if (limitBytes > 0 && limitBytes < 9007199254740991) {
        return Math.floor(limitBytes / (1024 * 1024));
      }
    }

    if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
      const limit = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
      if (limit !== 'max') {
        const limitBytes = parseInt(limit);
        if (limitBytes > 0) {
          return Math.floor(limitBytes / (1024 * 1024));
        }
      }
    }

    const { stdout: meminfoData } = await execAsync('cat /proc/meminfo 2>/dev/null');
    if (meminfoData) {
      const match = meminfoData.match(/MemTotal:\s+(\d+)\s+kB/);
      if (match) {
        return Math.floor(parseInt(match[1]) / 1024);
      }
    }
  } catch (error) {}

  return 512;
}

async function checkIfNeedsRelaunch() {
  const totalMemoryMB = await getRealMemory();
  const memoryLimitMB = Math.floor(totalMemoryMB * 0.95);
  const currentLimit = parseInt(process.env.MEMORY_LIMIT_MB || '0');
  
  if (currentLimit === 0 || Math.abs(currentLimit - memoryLimitMB) > 50) {
    return { needsRelaunch: true, totalMemoryMB, memoryLimitMB };
  }
  
  return { needsRelaunch: false, totalMemoryMB, memoryLimitMB };
}

const check = await checkIfNeedsRelaunch();

if (check.needsRelaunch) {
  console.log('\n⚠️  Detectado inicio sin configuración de memoria óptima');
  console.log(`📊 RAM Servidor: ${(check.totalMemoryMB / 1024).toFixed(2)}GB (${check.totalMemoryMB}MB)`);
  console.log(`🎯 Relanzando con límite: ${(check.memoryLimitMB / 1024).toFixed(2)}GB (${check.memoryLimitMB}MB)\n`);

  const args = [
    `--max-old-space-size=${check.memoryLimitMB}`,
    '--expose-gc',
    'index-main.js',
    ...process.argv.slice(2)
  ];

  let child = null;
  let restartCount = 0;
  const MAX_RESTART = 5;
  const RESTART_WINDOW = 60000;
  let firstRestartTime = null;

  function startChild() {
    child = spawn('node', args, {
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        MEMORY_LIMIT_MB: check.memoryLimitMB.toString(),
        TOTAL_MEMORY_MB: check.totalMemoryMB.toString(),
        RELAUNCHED: 'true'
      }
    });

    child.on('exit', (code, signal) => {
      const now = Date.now();

      if (!firstRestartTime || (now - firstRestartTime) > RESTART_WINDOW) {
        firstRestartTime = now;
        restartCount = 0;
      }

      restartCount++;

      if (restartCount >= MAX_RESTART) {
        console.error(`\n❌ ${MAX_RESTART} reinicios en 1 minuto. Deteniendo para evitar loop infinito.\n`);
        process.exit(1);
      }

      if (signal === 'SIGINT' || signal === 'SIGTERM' || code === 0) {
        process.exit(code || 0);
      }

      console.log(`\n⚠️  Bot caído (código: ${code || 'unknown'}). Reiniciando... (${restartCount}/${MAX_RESTART})\n`);
      
      setTimeout(() => {
        startChild();
      }, 3000);
    });

    child.on('error', (error) => {
      console.error('❌ Error en proceso hijo:', error.message);
      setTimeout(() => {
        startChild();
      }, 5000);
    });
  }

  startChild();

  process.on('SIGINT', () => {
    if (child) child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    if (child) child.kill('SIGTERM');
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error.message);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('❌ Promise rechazada:', reason);
  });

} else {
  try {
    await import('./index-main.js');
  } catch (error) {
    console.error('❌ Error cargando index-main.js:', error.message);
    process.exit(1);
  }
}