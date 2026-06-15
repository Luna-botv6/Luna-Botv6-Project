import chalk from 'chalk';
import fs from 'fs';

const RAM_FREE_MIN_MB = 100;
const CLEANUP_INTERVAL = 10 * 60 * 1000;

let _ramTotalMB = null;

function getRamTotalMB() {
  if (_ramTotalMB) return _ramTotalMB;
  try {
    if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
      const val = parseInt(fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim());
      if (val > 0 && val < 9007199254740991) return (_ramTotalMB = Math.floor(val / (1024 * 1024)));
    }
    if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
      const raw = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
      if (raw !== 'max') {
        const val = parseInt(raw);
        if (val > 0) return (_ramTotalMB = Math.floor(val / (1024 * 1024)));
      }
    }
    if (fs.existsSync('/proc/meminfo')) {
      const match = fs.readFileSync('/proc/meminfo', 'utf8').match(/MemTotal:\s+(\d+)\s+kB/);
      if (match) return (_ramTotalMB = Math.floor(parseInt(match[1]) / 1024));
    }
  } catch {}
  return (_ramTotalMB = 512);
}

function getRamUsedMB() {
  return Math.floor(process.memoryUsage().rss / (1024 * 1024));
}

function isRamAvailable() {
  const total = getRamTotalMB();
  const used = getRamUsedMB();
  return (total - used) >= RAM_FREE_MIN_MB;
}

function getRamStatus() {
  const total = getRamTotalMB();
  const used = getRamUsedMB();
  const pct = ((used / total) * 100).toFixed(1);
  return { total, used, pct };
}

class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.sockets = new Map();
    this.cleanup = new Map();
    this.qrAttempts = new Map();
    this._startCleanup();
  }

  getAllActiveSockets() {
    return Array.from(this.sockets.values()).filter(s => s?.user);
  }

  getActiveConnectionCount() {
    return this.getAllActiveSockets().length;
  }

  setConnection(userId, state) {
    this.connections.set(userId, { ...state, lastUpdate: Date.now() });
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
    return !!this.connections.get(userId)?.isConnecting;
  }

  isConnected(userId) {
    return !!this.connections.get(userId)?.isConnected;
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
      timeouts?.forEach(t => clearTimeout(t));
      this.cleanup.delete(userId);
    }
    this.connections.delete(userId);
    this.sockets.delete(userId);
    this.qrAttempts.delete(userId);
  }

  addCleanupTimer(userId, type, timer) {
    if (!this.cleanup.has(userId)) this.cleanup.set(userId, { timeouts: [] });
    const data = this.cleanup.get(userId);
    if (type === 'interval') data.interval = timer;
    else data.timeouts.push(timer);
  }

  isRamAvailable() {
    return isRamAvailable();
  }

  getRamStatus() {
    return getRamStatus();
  }

  _startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [userId, conn] of this.connections.entries()) {
        if (conn.isConnected || conn.isConnecting) continue;
        if (now - conn.lastUpdate > CLEANUP_INTERVAL) {
          console.log(chalk.yellow(`🧹 Limpiando sesión inactiva: ${userId}`));
          this.removeConnection(userId);
        }
      }
    }, CLEANUP_INTERVAL);
  }
}

const connectionManager = new ConnectionManager();

export { connectionManager, getRamTotalMB, getRamUsedMB, isRamAvailable, getRamStatus, RAM_FREE_MIN_MB };
