import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const LOG_FOLDER = './logs_bans';

global.latestCommand = {
  text: null,
  plugin: null,
  sender: null,
  timestamp: null
};

global.botMonitor = {
  lastActivity: Date.now(),
  isMonitoring: true,
  checkInterval: null
};

export function updateLastCommand({ text, plugin, sender }) {
  global.latestCommand = { 
    text, 
    plugin, 
    sender, 
    timestamp: new Date().toISOString() 
  };
  
  // Actualizar última actividad
  global.botMonitor.lastActivity = Date.now();
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_FOLDER)) {
    fs.mkdirSync(LOG_FOLDER, { recursive: true });
  }
}

function saveBanLog(reason, detectionMethod = 'auto') {
  ensureLogDir();

  const timestamp = Date.now();
  const logFile = path.join(LOG_FOLDER, `baneo-${timestamp}.txt`);
  
  // Obtener el nombre del archivo del plugin (sin la ruta completa)
  const pluginName = global.latestCommand.plugin 
    ? path.basename(global.latestCommand.plugin, '.js')
    : 'desconocido';

  const logContent = `🚫 BOT BANEADO O DESCONECTADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Fecha y hora: ${new Date().toLocaleString()}
⚠️  Motivo: ${reason}
🔍 Método de detección: ${detectionMethod}

📋 ÚLTIMO PLUGIN USADO ANTES DEL BANEO:
▶️  Archivo: ${pluginName}
💬 Comando: ${global.latestCommand.text || 'ninguno'}
👤 Usuario: ${global.latestCommand.sender || 'desconocido'}
🕒 Timestamp del comando: ${global.latestCommand.timestamp || 'desconocido'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  POSIBLE CAUSA DEL BANEO: Plugin "${pluginName}"

Este archivo se generó automáticamente cuando se detectó
una desconexión sospechosa del bot de WhatsApp.
`;

  try {
    fs.writeFileSync(logFile, logContent, 'utf-8');
    console.log(chalk.redBright(`\n🚫 BOT BANEADO DETECTADO!`));
    console.log(chalk.yellow(`📁 Log guardado en: ${logFile}`));
    console.log(chalk.red(`🎯 Último plugin usado: ${pluginName}`));
    console.log(chalk.red(`💬 Último comando: ${global.latestCommand.text || 'ninguno'}\n`));
    
  } catch (error) {
    console.error('Error guardando log de baneo:', error);
  }
}

// Función para detectar si el bot fue baneado por inactividad
function checkBotHealth() {
  if (!global.botMonitor.isMonitoring) return;
  
  const now = Date.now();
  const timeSinceLastActivity = now - global.botMonitor.lastActivity;
  
  // Si han pasado más de 3 minutos sin actividad (el bot normalmente recibe mensajes)
  if (timeSinceLastActivity > 3 * 60 * 1000) {
    // Verificar si el proceso de WhatsApp sigue corriendo
    const isProcessAlive = checkProcessHealth();
    
    if (!isProcessAlive) {
      saveBanLog('Bot desconectado - Proceso no responde o terminado inesperadamente', 'monitoreo_proceso');
      global.botMonitor.isMonitoring = false;
    }
  }
}

function checkProcessHealth() {
  try {
    // Verificar si el proceso sigue activo
    if (process.pid && !process.killed) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Iniciar monitoreo automático
function startMonitoring() {
  // Verificar cada 30 segundos
  global.botMonitor.checkInterval = setInterval(checkBotHealth, 30 * 1000);
  console.log(chalk.green('🔍 Monitoreo de baneos iniciado...'));
}

// Detener monitoreo
export function stopMonitoring() {
  if (global.botMonitor.checkInterval) {
    clearInterval(global.botMonitor.checkInterval);
    global.botMonitor.isMonitoring = false;
    console.log(chalk.yellow('⏹️  Monitoreo de baneos detenido'));
  }
}

// Hooks mejorados para capturar errores específicos
process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || reason?.toString() || '';
  
  // Patrones que indican baneo o desconexión forzada
  const banKeywords = [
    '403', 'forbidden', 'unauthorized',
    'disconnect', 'connection closed', 'connection reset',
    'banned', 'blocked', 'restricted',
    'rate limit', 'too many requests',
    'invalid session', 'authentication failed',
    'logged out', 'session terminated',
    'spam detected', 'abuse detected'
  ];
  
  const isBanRelated = banKeywords.some(keyword => 
    msg.toLowerCase().includes(keyword.toLowerCase())
  );
  
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
    'invalid session', 'authentication failed'
  ];
  
  const isBanRelated = banKeywords.some(keyword => 
    msg.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (isBanRelated) {
    saveBanLog(`Excepción no capturada: ${msg}`, 'exception_handler');
  }
});

// Capturar cuando el proceso va a terminar
process.on('SIGTERM', () => {
  saveBanLog('Proceso terminado por SIGTERM - Posible cierre forzado', 'signal_handler');
});

process.on('SIGINT', () => {
  saveBanLog('Proceso interrumpido por SIGINT - Posible cierre forzado', 'signal_handler');
});

// Hook para capturar salidas inesperadas
process.on('exit', (code) => {
  if (code !== 0) {
    saveBanLog(`Proceso terminado con código de error: ${code}`, 'exit_handler');
  }
});

// Función manual para reportar baneo
export function reportBan(customReason) {
  saveBanLog(customReason || 'Baneo reportado manualmente', 'manual');
}

// Iniciar el monitoreo automáticamente
startMonitoring();

//console.log(chalk.cyan('🛡️  Sistema de detección de baneos cargado'));
//console.log(chalk.cyan('📝 Los logs se guardarán en la carpeta: ./logs_bans/'));
//console.log(chalk.cyan('🔍 Monitoreando actividad del bot...'));
