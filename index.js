import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

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
  const memoryLimitMB = Math.floor(totalMemoryMB * 0.85);
  const currentLimit = parseInt(process.env.MEMORY_LIMIT_MB || '0');
  
  if (currentLimit === 0 || Math.abs(currentLimit - memoryLimitMB) > 50) {
    return { needsRelaunch: true, totalMemoryMB, memoryLimitMB };
  }
  
  return { needsRelaunch: false, totalMemoryMB, memoryLimitMB };
}

const check = await checkIfNeedsRelaunch();

if (check.needsRelaunch) {
  console.log(chalk.yellow('\n⚠️  Detectado inicio sin configuración de memoria óptima'));
  console.log(chalk.cyan(`📊 RAM Servidor: ${(check.totalMemoryMB / 1024).toFixed(2)}GB (${check.totalMemoryMB}MB)`));
  console.log(chalk.green(`🎯 Relanzando con límite: ${(check.memoryLimitMB / 1024).toFixed(2)}GB (${check.memoryLimitMB}MB)\n`));

  const args = [
    `--max-old-space-size=${check.memoryLimitMB}`,
    '--expose-gc',
    'index-main.js',
    ...process.argv.slice(2)
  ];

  let child = null;
  let restartCount = 0;
  const MAX_RESTART = 10;
  const RESTART_WINDOW = 120000;
  let firstRestartTime = null;
  let monitorInterval = null;
  let logMonitorInterval = null;
  let isRestarting = false;

  const logFilePath = '/tmp/bot-stderr.log';
  
  function startChild() {
    if (isRestarting) return;
    
    if (fs.existsSync(logFilePath)) {
      try {
        fs.unlinkSync(logFilePath);
      } catch (e) {}
    }
    
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    
    child = spawn('node', args, {
      stdio: ['inherit', 'inherit', 'pipe'],
      shell: false,
      env: {
        ...process.env,
        MEMORY_LIMIT_MB: check.memoryLimitMB.toString(),
        TOTAL_MEMORY_MB: check.totalMemoryMB.toString(),
        RELAUNCHED: 'true',
        FORCE_COLOR: '1'
      }
    });

    const errorPatterns = [
      'allocation failure',
      'JavaScript heap out of memory',
      'FATAL ERROR',
      'Mark-Compact'
    ];

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      logStream.write(data);
    });

    logMonitorInterval = setInterval(() => {
      if (!fs.existsSync(logFilePath)) return;
      
      try {
        const logContent = fs.readFileSync(logFilePath, 'utf8');
        const lastLines = logContent.split('\n').slice(-100).join('\n');
        
        if (errorPatterns.some(pattern => lastLines.includes(pattern)) && !isRestarting) {
          isRestarting = true;
          console.log(chalk.hex('#FFD700').bold('\n🔄 ¡Sistema reiniciando para estabilizar la memoria RAM! 💫\n'));
          if (monitorInterval) {
            clearInterval(monitorInterval);
            monitorInterval = null;
          }
          if (logMonitorInterval) {
            clearInterval(logMonitorInterval);
            logMonitorInterval = null;
          }
          logStream.end();
          child.kill('SIGTERM');
        }
      } catch (error) {}
    }, 2000);

    monitorInterval = setInterval(() => {
      if (!child || !child.pid) return;
      
      try {
        const memUsagePath = `/proc/${child.pid}/statm`;
        if (!fs.existsSync(memUsagePath)) return;
        
        const statm = fs.readFileSync(memUsagePath, 'utf8').split(' ');
        const usedMemoryMB = Math.floor((parseInt(statm[1]) * 4096) / (1024 * 1024));
        const memoryPercent = (usedMemoryMB / check.totalMemoryMB) * 100;
        
        if (memoryPercent >= 92 && !isRestarting) {
          isRestarting = true;
          console.log(chalk.hex('#FFD700').bold('\n🔄 ¡Sistema reiniciando para estabilizar la memoria RAM! 💫\n'));
          if (monitorInterval) {
            clearInterval(monitorInterval);
            monitorInterval = null;
          }
          if (logMonitorInterval) {
            clearInterval(logMonitorInterval);
            logMonitorInterval = null;
          }
          logStream.end();
          child.kill('SIGTERM');
        }
      } catch (error) {}
    }, 10000);

    child.on('exit', (code, signal) => {
      if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
      }
      if (logMonitorInterval) {
        clearInterval(logMonitorInterval);
        logMonitorInterval = null;
      }
      logStream.end();

      const now = Date.now();

      if (!firstRestartTime || (now - firstRestartTime) > RESTART_WINDOW) {
        firstRestartTime = now;
        restartCount = 0;
      }

      restartCount++;

      if (restartCount >= MAX_RESTART) {
        console.error(chalk.red(`\n❌ ${MAX_RESTART} reinicios en 2 minutos. Deteniendo para evitar loop infinito.\n`));
        process.exit(1);
      }

      if (signal === 'SIGINT' || code === 0) {
        process.exit(code || 0);
      }

      console.log(chalk.yellow(`\n⚡ Reiniciando sistema... (${restartCount}/${MAX_RESTART})\n`));
      
      setTimeout(() => {
        isRestarting = false;
        startChild();
      }, 2000);
    });

    child.on('error', (error) => {
      console.error(chalk.red('❌ Error en proceso hijo:'), error.message);
      if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
      }
      if (logMonitorInterval) {
        clearInterval(logMonitorInterval);
        logMonitorInterval = null;
      }
      logStream.end();
      setTimeout(() => {
        startChild();
      }, 3000);
    });
  }

  startChild();

  process.on('SIGINT', () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
    }
    if (logMonitorInterval) {
      clearInterval(logMonitorInterval);
    }
    if (child) child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
    }
    if (logMonitorInterval) {
      clearInterval(logMonitorInterval);
    }
    if (child) child.kill('SIGTERM');
  });

  process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Error no capturado:'), error.message);
  });

  process.on('unhandledRejection', (reason) => {
    console.error(chalk.red('❌ Promise rechazada:'), reason);
  });

  process.on('exit', () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
    }
    if (logMonitorInterval) {
      clearInterval(logMonitorInterval);
    }
    if (fs.existsSync(logFilePath)) {
      try {
        fs.unlinkSync(logFilePath);
      } catch (e) {}
    }
  });

} else {
  try {
    await import('./index-main.js');
  } catch (error) {
    console.error(chalk.red('❌ Error cargando index-main.js:'), error.message);
    process.exit(1);
  }
}