import chalk from "chalk";
import fs from "fs";
import cp from "child_process";
import { promisify } from "util";

const exec = promisify(cp.exec).bind(cp);

const SUBBOT_CONFIG = {
  limits: {
    sessionCleanupInterval: 300000,
  },
};

export const RAM_FREE_MIN_MB = parseInt(process.env.RAM_FREE_MIN_MB || '100');

export async function getRamStatus() {
  try {
    if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
      const limit = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim();
      const usage = fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim();
      const limitBytes = parseInt(limit);
      const usageBytes = parseInt(usage);
      if (limitBytes > 0 && limitBytes < 9007199254740991) {
        const freeMB = Math.floor((limitBytes - usageBytes) / 1024 / 1024);
        return { heapFreeMB: freeMB, heapUsedMB: Math.floor(usageBytes / 1024 / 1024), heapTotalMB: Math.floor(limitBytes / 1024 / 1024), isLow: freeMB < RAM_FREE_MIN_MB };
      }
    }
    if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
      const limit = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
      const usage = fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim();
      if (limit !== 'max') {
        const limitBytes = parseInt(limit);
        const usageBytes = parseInt(usage);
        const freeMB = Math.floor((limitBytes - usageBytes) / 1024 / 1024);
        return { heapFreeMB: freeMB, heapUsedMB: Math.floor(usageBytes / 1024 / 1024), heapTotalMB: Math.floor(limitBytes / 1024 / 1024), isLow: freeMB < RAM_FREE_MIN_MB };
      }
    }
    const { stdout } = await exec('cat /proc/meminfo 2>/dev/null');
    if (stdout) {
      const totalMatch = stdout.match(/MemTotal:\s+(\d+)\s+kB/);
      const availMatch = stdout.match(/MemAvailable:\s+(\d+)\s+kB/);
      if (totalMatch) {
        const totalBytes = parseInt(totalMatch[1]) * 1024;
        const availBytes = availMatch ? parseInt(availMatch[1]) * 1024 : 0;
        const freeMB = Math.floor(availBytes / 1024 / 1024);
        return { heapFreeMB: freeMB, heapUsedMB: Math.floor((totalBytes - availBytes) / 1024 / 1024), heapTotalMB: Math.floor(totalBytes / 1024 / 1024), isLow: freeMB < RAM_FREE_MIN_MB };
      }
    }
  } catch {}
  const used = process.memoryUsage();
  const freeMB = Math.floor((used.heapTotal - used.heapUsed) / 1024 / 1024);
  return { heapFreeMB: freeMB, heapUsedMB: Math.floor(used.heapUsed / 1024 / 1024), heapTotalMB: Math.floor(used.heapTotal / 1024 / 1024), isLow: freeMB < RAM_FREE_MIN_MB };
}

export async function isRamAvailable() {
  return !(await getRamStatus()).isLow;
}

class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.sockets = new Map();
    this.cleanup = new Map();
    this.qrAttempts = new Map();
    this.startSessionCleanup();
  }

  async canAddConnection() {
    try {
      const { heapFreeMB, isLow } = await getRamStatus();
      if (isLow) {
        console.log(chalk.red(`⚠️ RAM insuficiente para nueva conexión (libre: ${heapFreeMB}MB, mínimo: ${RAM_FREE_MIN_MB}MB)`));
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  getAllActiveSockets() {
    return Array.from(this.sockets.values()).filter((sock) => sock && sock.user);
  }

  getActiveConnectionCount() {
    return this.getAllActiveSockets().length;
  }

  setConnection(userId, state) {
    this.connections.set(userId, {
      ...state,
      lastUpdate: Date.now(),
    });
  }

  getConnection(userId) {
    return this.connections.get(userId);
  }

  setSocket(userId, socket) {
    this.sockets.set(userId, socket);
  }

  getSocket(userId) {
    return this.sockets.get(userId);
  }

  isConnecting(userId) {
    const conn = this.connections.get(userId);
    return conn && conn.isConnecting;
  }

  isConnected(userId) {
    const conn = this.connections.get(userId);
    return conn && conn.isConnected;
  }

  getQrAttempts(userId) {
    return this.qrAttempts.get(userId) || 0;
  }

  incrementQrAttempts(userId) {
    const current = this.getQrAttempts(userId);
    this.qrAttempts.set(userId, current + 1);
    return current + 1;
  }

  resetQrAttempts(userId) {
    this.qrAttempts.delete(userId);
  }

  removeConnection(userId) {
    if (this.cleanup.has(userId)) {
      const { interval, timeouts } = this.cleanup.get(userId);
      if (interval) clearInterval(interval);
      timeouts?.forEach((timeout) => clearTimeout(timeout));
      this.cleanup.delete(userId);
    }
    this.connections.delete(userId);
    this.sockets.delete(userId);
    this.qrAttempts.delete(userId);
  }

  addCleanupTimer(userId, type, timer) {
    if (!this.cleanup.has(userId)) {
      this.cleanup.set(userId, { timeouts: [] });
    }
    const cleanupData = this.cleanup.get(userId);
    if (type === "interval") {
      cleanupData.interval = timer;
    } else {
      cleanupData.timeouts.push(timer);
    }
  }

  startSessionCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [userId, conn] of this.connections.entries()) {
        if (now - conn.lastUpdate > SUBBOT_CONFIG.limits.sessionCleanupInterval) {
          const sock = this.sockets.get(userId);
          const isAlive = sock?.user && sock?.ws?.readyState === 1;
          if (isAlive) {
            this.connections.set(userId, { ...conn, lastUpdate: Date.now() });
            continue;
          }
          console.log(chalk.yellow(`🧹 Limpiando sesión inactiva: ${userId}`));
          this.removeConnection(userId);
        }
      }
    }, SUBBOT_CONFIG.limits.sessionCleanupInterval);
  }
}

const connectionManager = new ConnectionManager();

export { connectionManager };
