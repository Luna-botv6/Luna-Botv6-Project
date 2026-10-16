import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as manager from '../lib/funcion/subbot-manager.js';
import { crearSubbot } from '../lib/funcion/subbot-socket.js';

const SUBBOT_DIR = './sub-lunabot/';
const MAX_SESSION_AGE = 7 * 24 * 60 * 60 * 1000;
const RECONNECT_DELAY_MS = 3000;

const handler = (m) => m;
handler.all = async function () { return true; };
export default handler;

function sesionValida(credsPath) {
  try {
    const raw = fs.readFileSync(credsPath, 'utf8');
    if (raw.length < 50) return false;
    const creds = JSON.parse(raw);
    if (!creds || typeof creds !== 'object') return false;
    return !!(creds.me || creds.account || creds.noiseKey || creds.signedIdentityKey || creds.registrationId || Object.keys(creds).length > 8 || raw.length > 1000);
  } catch {
    return false;
  }
}

function sesionExpirada(credsPath) {
  try {
    return Date.now() - fs.statSync(credsPath).mtime.getTime() > MAX_SESSION_AGE;
  } catch {
    return true;
  }
}

function limpiarSesion(sessionPath, motivo) {
  try {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log(chalk.yellow(`🗑️ Sesión eliminada: ${path.basename(sessionPath)} (${motivo})`));
  } catch {}
}

export async function autoreconnectSubbots(mainConn) {
  console.log(chalk.blue('🔄 Restaurando sesiones SubBot…'));

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

  const validas = [];
  for (const userId of dirs) {
    const sessionPath = path.join(SUBBOT_DIR, userId);
    const credsPath = path.join(sessionPath, 'creds.json');
    try {
      if (!fs.statSync(sessionPath).isDirectory()) continue;
    } catch { continue; }
    if (!fs.existsSync(credsPath)) {
      limpiarSesion(sessionPath, 'sin credenciales');
      continue;
    }
    if (sesionExpirada(credsPath)) {
      limpiarSesion(sessionPath, 'expirada (+7 días sin uso)');
      continue;
    }
    if (!sesionValida(credsPath)) {
      limpiarSesion(sessionPath, 'inválida');
      continue;
    }
    validas.push({ userId, sessionPath });
  }

  if (validas.length === 0) {
    console.log(chalk.green('✅ No hay sesiones para restaurar'));
    return;
  }

  console.log(chalk.blue(`📋 Restaurando ${validas.length} sesión(es)…`));
  for (const { userId, sessionPath } of validas) {
    if (!await manager.hayEspacio()) {
      console.log(chalk.yellow('⚠️ Sin espacio/RAM — se pausa la restauración'));
      break;
    }
    if (manager.conectado(userId) || manager.conectando(userId)) continue;
    try {
      console.log(chalk.blue(`🔄 Restaurando: ${userId}`));
      await crearSubbot({ subbotPath: sessionPath, conn: mainConn, userId });
      await new Promise(r => setTimeout(r, RECONNECT_DELAY_MS));
    } catch (err) {
      console.error(chalk.red(`❌ Error restaurando ${userId}:`), err.message);
    }
  }

  setTimeout(() => {
    console.log(chalk.green(`✅ Restauración completada: ${manager.conteoActivos()}/${validas.length} SubBots activos`));
  }, 10000);
}
