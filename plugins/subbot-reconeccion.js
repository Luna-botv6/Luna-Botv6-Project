import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { connectionManager, isRamAvailable, getRamStatus, RAM_FREE_MIN_MB } from '../lib/funcion/connection-manager.js';
import { initializeSubBot } from './subbot.js';

const SUBBOT_DIR = './sub-lunabot/';
const MAX_SESSION_AGE = 7 * 24 * 60 * 60 * 1000;
const RECONNECT_DELAY_MS = 3000;

const handler = (m) => m;
handler.all = async function () { return true; };
export default handler;

function isValidSession(credsPath) {
  try {
    const raw = fs.readFileSync(credsPath, 'utf8');
    if (raw.length < 50) return false;
    const creds = JSON.parse(raw);
    if (!creds || typeof creds !== 'object') return false;
    const hasData =
      creds.me ||
      creds.account ||
      creds.noiseKey ||
      creds.signedIdentityKey ||
      creds.registrationId ||
      Object.keys(creds).length > 8 ||
      raw.length > 1000;
    return !!hasData;
  } catch {
    return false;
  }
}

function isSessionExpired(credsPath) {
  try {
    const stats = fs.statSync(credsPath);
    return Date.now() - stats.mtime.getTime() > MAX_SESSION_AGE;
  } catch {
    return true;
  }
}

function cleanSession(sessionPath, reason) {
  try {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log(chalk.yellow(`🗑️ Sesión eliminada: ${path.basename(sessionPath)} (${reason})`));
  } catch {}
}

export async function autoreconnectSubbots(mainConn) {
  console.log(chalk.blue('🔄 Iniciando restauración de sesiones SubBot...'));

  if (!fs.existsSync(SUBBOT_DIR)) {
    console.log(chalk.yellow('📁 No hay sesiones guardadas'));
    return;
  }

  let dirs;
  try {
    dirs = fs.readdirSync(SUBBOT_DIR);
  } catch {
    console.log(chalk.red('❌ Error leyendo directorio de subbots'));
    return;
  }

  const validSessions = [];

  for (const userId of dirs) {
    const sessionPath = path.join(SUBBOT_DIR, userId);
    const credsPath = path.join(sessionPath, 'creds.json');

    try {
      if (!fs.statSync(sessionPath).isDirectory()) continue;
    } catch { continue; }

    if (!fs.existsSync(credsPath)) {
      cleanSession(sessionPath, 'sin credenciales');
      continue;
    }

    if (isSessionExpired(credsPath)) {
      cleanSession(sessionPath, 'expirada');
      continue;
    }

    if (!isValidSession(credsPath)) {
      cleanSession(sessionPath, 'inválida');
      continue;
    }

    validSessions.push({ userId, sessionPath });
    const age = Math.round((Date.now() - fs.statSync(credsPath).mtime.getTime()) / 3600000);
    console.log(chalk.green(`✅ Sesión válida: ${userId} (${age}h)`));
  }

  if (validSessions.length === 0) {
    console.log(chalk.green('✅ No hay sesiones para restaurar'));
    return;
  }

  console.log(chalk.blue(`📋 Restaurando ${validSessions.length} sesión(es)...`));

  for (const { userId, sessionPath } of validSessions) {
    if (!isRamAvailable()) {
      const { used, total, pct } = getRamStatus();
      console.log(chalk.yellow(`⚠️ RAM al límite (${pct}% — ${used}MB/${total}MB) — deteniendo restauración`));
      break;
    }

    if (connectionManager.isConnected(userId) || connectionManager.isConnecting(userId)) continue;

    try {
      console.log(chalk.blue(`🔄 Restaurando: ${userId}`));
      await initializeSubBot({ subbotPath: sessionPath, conn: mainConn, userId });
      await new Promise(r => setTimeout(r, RECONNECT_DELAY_MS));
    } catch (err) {
      console.error(chalk.red(`❌ Error restaurando ${userId}:`), err.message);
    }
  }

  setTimeout(() => {
    const active = connectionManager.getActiveConnectionCount();
    console.log(chalk.green(`✅ Restauración completada: ${active}/${validSessions.length} SubBots activos`));
  }, 10000);
}
