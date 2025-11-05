import chalk from "chalk";

const SUBBOT_CONFIG = {
  limits: {
    sessionCleanupInterval: 300000,
  },
};

class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.sockets = new Map();
    this.cleanup = new Map();
    this.qrAttempts = new Map();
    this.startSessionCleanup();
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
          console.log(chalk.yellow(`🧹 Limpiando sesión inactiva: ${userId}`));
          this.removeConnection(userId);
        }
      }
    }, SUBBOT_CONFIG.limits.sessionCleanupInterval);
  }
}

const connectionManager = new ConnectionManager();

export { connectionManager };