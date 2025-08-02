import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const LOG_FOLDER = './logs_bans';
const LOG_FILE = path.join(LOG_FOLDER, `baneo-${Date.now()}.js`);

global.latestCommand = {
  text: null,
  plugin: null,
  sender: null
};

export function updateLastCommand({ text, plugin, sender }) {
  global.latestCommand = { text, plugin, sender };
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_FOLDER)) {
    fs.mkdirSync(LOG_FOLDER);
  }
}

function saveBanLog(reason) {
  ensureLogDir();

  const data = `// 🚫 LOG DE BANEOS
// Fecha: ${new Date().toLocaleString()}
// Motivo detectado: ${reason}

export default {
  plugin: "${global.latestCommand.plugin || 'desconocido'}",
  comando: "${global.latestCommand.text || 'ninguno'}",
  usuario: "${global.latestCommand.sender || 'desconocido'}"
};
`;

  fs.writeFileSync(LOG_FILE, data, 'utf-8');
  console.log(chalk.redBright(`\n🛑 Baneo detectado. Log guardado en: ${LOG_FILE}\n`));
}

// Hook global para errores inesperados
process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || reason?.toString();
  if (msg.includes('403') || msg.includes('disconnect') || msg.includes('connection closed')) {
    saveBanLog(msg);
  }
});

process.on('uncaughtException', (err) => {
  const msg = err?.message || err?.toString();
  if (msg.includes('403') || msg.includes('disconnect') || msg.includes('connection closed')) {
    saveBanLog(msg);
  }
});
