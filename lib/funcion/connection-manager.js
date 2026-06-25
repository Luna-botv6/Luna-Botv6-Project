import chalk from "chalk";

const SUBBOT_CONFIG = {
  limits: {
    sessionCleanupInterval: 300000,
  },
};

export const RAM_FREE_MIN_MB = parseInt(process.env.RAM_FREE_MIN_MB || '100');

export function getRamStatus() {
  try {
    const used = process.memoryUsage();
    const heapFreeMB = Math.floor((used.heapTotal - used.heapUsed) / 1024 / 1024);
    const heapUsedMB = Math.floor(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.floor(used.heapTotal / 1024 / 1024);
    return {
      heapFreeMB,
      heapUsedMB,
      heapTotalMB,
      isLow: heapFreeMB < RAM_FREE_MIN_MB,
    };
  } catch {
    return { heapFreeMB: 999, heapUsedMB: 0, heapTotalMB: 0, isLow: false };
  }
}

export function isRamAvailable() {
  return !getRamStatus().isLow;
}

class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.sockets = new Map();
    this.cleanup = new Map();
    this.qrAttempts = new Map();
    this.startSessionCleanup();
  }

  canAddConnection() {
    try {
      const { heapFreeMB, isLow } = getRamStatus();
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