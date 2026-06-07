import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const LOG_FOLDER = './logs_bans';

global.latestCommand = {
  text: null,
  plugin: null,
  pluginFile: null,
  sender: null,
  chat: null,
  timestamp: null,
  isFromPluginsFolder: null,
  isFromCoreFile: null,
  sourceFile: null,
};

global.botMonitor = {
  lastActivity: Date.now(),
  isMonitoring: true,
  checkInterval: null,
  connectionState: 'unknown',
  reconnectCount: 0,
  lastReconnectTime: null,
  stableConnectionSince: null,
  disconnectHistory: [],
};

const STABLE_CONNECTION_THRESHOLD = 30 * 1000;
const MAX_RECONNECTS_BEFORE_LOG = 3;
const RECONNECT_WINDOW = 5 * 60 * 1000;
const MAX_DISCONNECT_HISTORY = 20;

export function updateLastCommand({ text, plugin, sender, chat }) {
  const pluginPath = plugin || '';
  const basename = pluginPath ? path.basename(pluginPath) : null;

  const isPluginsFolder = pluginPath.includes('/plugins/') || pluginPath.includes('\\plugins\\');
  const isCustomCommands = pluginPath.includes('/custom-commands/') || pluginPath.includes('\\custom-commands\\');

  const coreFiles = ['simple.js', 'print.js', 'handler.js', 'main.js', 'connection.js'];
  const isCoreFile = coreFiles.some(f => basename === f);

  global.latestCommand = {
    text,
    plugin: pluginPath,
    pluginFile: basename,
    sender: sender || null,
    chat: chat || null,
    timestamp: new Date().toISOString(),
    isFromPluginsFolder: isPluginsFolder || isCustomCommands,
    isFromCoreFile: isCoreFile,
    sourceFile: basename || 'desconocido',
  };

  global.botMonitor.lastActivity = Date.now();
}

export function updateConnectionState(state) {
  const prev = global.botMonitor.connectionState;
  global.botMonitor.connectionState = state;

  if (state === 'open') {
    global.botMonitor.stableConnectionSince = Date.now();
    if (prev === 'close' || prev === 'connecting') {
      global.botMonitor.reconnectCount++;
      global.botMonitor.lastReconnectTime = Date.now();
    }
  }

  if (state === 'close') {
    global.botMonitor.stableConnectionSince = null;
    global.botMonitor.disconnectHistory.push({
      time: new Date().toISOString(),
      prevState: prev,
    });
    if (global.botMonitor.disconnectHistory.length > MAX_DISCONNECT_HISTORY) {
      global.botMonitor.disconnectHistory.shift();
    }
  }
}

function isConnectionStable() {
  const since = global.botMonitor.stableConnectionSince;
  if (!since) return false;
  return (Date.now() - since) >= STABLE_CONNECTION_THRESHOLD;
}

function isNormalReconnect() {
  const { reconnectCount, lastReconnectTime } = global.botMonitor;
  if (!lastReconnectTime) return false;
  const withinWindow = (Date.now() - lastReconnectTime) < RECONNECT_WINDOW;
  return withinWindow && reconnectCount <= MAX_RECONNECTS_BEFORE_LOG;
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_FOLDER)) {
    fs.mkdirSync(LOG_FOLDER, { recursive: true });
  }
}

function buildFileName() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}_${hh}.${min}.json`;
}

function classifyDisconnect(reason, method) {
  const r = (reason + method).toLowerCase();

  if (r.includes('403') || r.includes('forbidden') || r.includes('banned') || r.includes('spam detected') || r.includes('abuse')) {
    return { type: 'BAN_CONFIRMADO', severity: 'critical', icon: '🚫' };
  }
  if (r.includes('rate limit') || r.includes('too many requests')) {
    return { type: 'RATE_LIMIT', severity: 'high', icon: '⚡' };
  }
  if (r.includes('unauthorized') || r.includes('invalid session') || r.includes('authentication failed') || r.includes('logged out') || r.includes('session terminated')) {
    return { type: 'SESION_INVALIDA', severity: 'high', icon: '🔐' };
  }
  if (r.includes('connection closed') || r.includes('connection reset') || r.includes('econnreset') || r.includes('websocket')) {
    return { type: 'DESCONEXION_RED', severity: 'medium', icon: '🌐' };
  }
  if (r.includes('sigterm') || r.includes('sigint')) {
    return { type: 'CIERRE_FORZADO', severity: 'low', icon: '⛔' };
  }
  if (r.includes('exit_handler') || r.includes('código de error')) {
    return { type: 'ERROR_PROCESO', severity: 'medium', icon: '💥' };
  }
  if (r.includes('heap') || r.includes('allocation failure') || r.includes('out of memory')) {
    return { type: 'MEMORIA_AGOTADA', severity: 'high', icon: '🧠' };
  }
  return { type: 'DESCONEXION_DESCONOCIDA', severity: 'low', icon: '❓' };
}

function buildPossibleCause(classification, cmd) {
  const hasPlugin = cmd.pluginFile && cmd.pluginFile !== 'desconocido';

  if (classification.type === 'BAN_CONFIRMADO') {
    if (hasPlugin && cmd.isFromPluginsFolder) {
      return `Plugin "${cmd.pluginFile}" ejecutó una acción que WhatsApp detectó como abuso o spam.`;
    }
    if (hasPlugin && cmd.isFromCoreFile) {
      return `El archivo del núcleo "${cmd.pluginFile}" generó tráfico sospechoso hacia WhatsApp.`;
    }
    return 'WhatsApp rechazó la conexión activamente. Revisa qué acciones masivas o automatizadas estaba realizando el bot.';
  }

  if (classification.type === 'RATE_LIMIT') {
    return hasPlugin
      ? `El plugin "${cmd.pluginFile}" pudo haber generado demasiadas peticiones a la API de WhatsApp en poco tiempo.`
      : 'El bot realizó demasiadas peticiones a WhatsApp en poco tiempo. Posible loop o tarea masiva activa.';
  }

  if (classification.type === 'SESION_INVALIDA') {
    return 'La sesión de WhatsApp fue invalidada. Puede que otro dispositivo haya iniciado sesión o que WhatsApp cerró la sesión remotamente.';
  }

  if (classification.type === 'DESCONEXION_RED') {
    return 'Pérdida de conexión de red. Puede ser inestabilidad del servidor o del proveedor de internet.';
  }

  if (classification.type === 'MEMORIA_AGOTADA') {
    return 'El proceso de Node.js se quedó sin memoria (heap). Puede estar relacionado con un plugin que no libera recursos o una tarea muy pesada.';
  }

  if (classification.type === 'ERROR_PROCESO') {
    if (hasPlugin) {
      return `El proceso terminó inesperadamente. El último plugin activo fue "${cmd.pluginFile}". Puede ser un error no manejado en ese plugin o en un archivo de núcleo.`;
    }
    return 'El proceso de Node.js terminó con un código de error. Revisa los logs del sistema para más detalles.';
  }

  return 'Causa no determinada con certeza. Analiza el historial de desconexiones y el contexto del último comando.';
}

function saveBanLog(reason, detectionMethod = 'auto', extraContext = {}) {
  const classification = classifyDisconnect(reason, detectionMethod);
  const cmd = global.latestCommand;
  const monitor = global.botMonitor;

  const isLowPriority =
    classification.severity === 'low' &&
    !cmd.pluginFile &&
    (detectionMethod === 'exit_handler' || detectionMethod === 'signal_handler');

  if (isLowPriority && isNormalReconnect()) {
    return;
  }

  if (detectionMethod === 'exit_handler' && !cmd.pluginFile) {
    if (isConnectionStable() && monitor.reconnectCount <= 1) {
      return;
    }
  }

  ensureLogDir();

  const now = new Date();
  const fileName = buildFileName();
  const logFile = path.join(LOG_FOLDER, fileName);

  const connectionUptime = monitor.stableConnectionSince
    ? Math.floor((now - monitor.stableConnectionSince) / 1000) + 's'
    : 'sin conexión estable previa';

  const possibleCause = buildPossibleCause(classification, cmd);

  const logData = {
    titulo: 'BOT DESCONECTADO / POSIBLE BANEO',
    clasificacion: {
      tipo: classification.type,
      severidad: classification.severity,
      icono: classification.icon,
    },
    evento: {
      fecha: now.toLocaleDateString('es-AR'),
      hora: now.toLocaleTimeString('es-AR'),
      timestamp_iso: now.toISOString(),
      motivo_raw: reason,
      metodo_deteccion: detectionMethod,
    },
    ultimo_comando: {
      texto: cmd.text || 'ninguno',
      plugin_archivo: cmd.pluginFile || 'desconocido',
      plugin_ruta: cmd.plugin || 'desconocido',
      origen: cmd.isFromPluginsFolder
        ? 'carpeta_plugins'
        : cmd.isFromCoreFile
        ? 'archivo_nucleo'
        : 'desconocido',
      remitente: cmd.sender || 'desconocido',
      chat: cmd.chat || 'desconocido',
      timestamp_comando: cmd.timestamp || 'desconocido',
    },
    estado_conexion: {
      estado_previo: monitor.connectionState,
      tiempo_estable_previo: connectionUptime,
      cantidad_reconexiones: monitor.reconnectCount,
      ultima_reconexion: monitor.lastReconnectTime
        ? new Date(monitor.lastReconnectTime).toISOString()
        : null,
      historial_desconexiones_recientes: monitor.disconnectHistory.slice(-5),
    },
    contexto_extra: extraContext,
    causa_probable: possibleCause,
    recomendacion: classification.type === 'BAN_CONFIRMADO'
      ? 'Elimina la sesión (MysticSession o similar), revisa el plugin indicado y vuelve a vincular.'
      : classification.type === 'RATE_LIMIT'
      ? 'Agrega delays entre peticiones en el plugin indicado. Evita envíos masivos en loops.'
      : classification.type === 'SESION_INVALIDA'
      ? 'Elimina la sesión y vuelve a vincular el bot.'
      : classification.type === 'MEMORIA_AGOTADA'
      ? 'Revisa el consumo de memoria del proceso. Considera reducir el límite de caché o reiniciar más frecuentemente.'
      : 'Revisa los logs del sistema y el historial de desconexiones para más contexto.',
  };

  try {
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2), 'utf-8');

    console.log(chalk.redBright(`\n${classification.icon} EVENTO DETECTADO: ${classification.type}`));
    console.log(chalk.yellow(`📁 Log: ${logFile}`));
    if (cmd.pluginFile && cmd.pluginFile !== 'desconocido') {
      console.log(chalk.red(`🎯 Último plugin: ${cmd.pluginFile} (${cmd.isFromPluginsFolder ? 'plugins/' : cmd.isFromCoreFile ? 'núcleo' : 'otro'})`));
      console.log(chalk.red(`💬 Último comando: ${cmd.text || 'ninguno'}`));
    }
    console.log(chalk.cyan(`💡 ${possibleCause}\n`));
  } catch (error) {
    console.error('Error guardando log:', error);
  }
}

function ensureLogDir_safe() {
  try { ensureLogDir(); } catch {}
}

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || reason?.toString() || '';

  const banKeywords = [
    '403', 'forbidden', 'unauthorized',
    'disconnect', 'connection closed', 'connection reset',
    'banned', 'blocked', 'restricted',
    'rate limit', 'too many requests',
    'invalid session', 'authentication failed',
    'logged out', 'session terminated',
    'spam detected', 'abuse detected',
  ];

  const isBanRelated = banKeywords.some(k => msg.toLowerCase().includes(k));
  if (isBanRelated) {
    saveBanLog(`Error no manejado: ${msg}`, 'error_handler');
  }
});

process.on('uncaughtException', (err) => {
  const msg = err?.message || err?.toString() || '';

  const banKeywords = [
    '403', 'forbidden', 'unauthorized',
    'disconnect', 'connection closed', 'connection reset',
    'banned', 'blocked', 'restricted',
    'rate limit', 'too many requests',
    'invalid session', 'authentication failed',
  ];

  const isBanRelated = banKeywords.some(k => msg.toLowerCase().includes(k));
  if (isBanRelated) {
    saveBanLog(`Excepción no capturada: ${msg}`, 'exception_handler');
  }
});

process.on('SIGTERM', () => {
  if (!isNormalReconnect()) {
    saveBanLog('Proceso terminado por SIGTERM', 'signal_handler');
  }
});

process.on('SIGINT', () => {
  if (!isNormalReconnect()) {
    saveBanLog('Proceso interrumpido por SIGINT', 'signal_handler');
  }
});

process.on('exit', (code) => {
  if (code !== 0) {
    saveBanLog(`Proceso terminado con código de error: ${code}`, 'exit_handler');
  }
});

export function stopMonitoring() {
  if (global.botMonitor.checkInterval) {
    clearInterval(global.botMonitor.checkInterval);
    global.botMonitor.isMonitoring = false;
  }
}

export function reportBan(customReason, extraContext = {}) {
  saveBanLog(customReason || 'Baneo reportado manualmente', 'manual', extraContext);
}

export { saveBanLog };
