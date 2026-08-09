import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fetch from 'node-fetch';
import os from 'os';

const DATA_FILE = path.join(process.cwd(), 'src/libraries/base/panel-identity.json');
const MYSTIC_SESSION_CREDS = path.join(process.cwd(), 'MysticSession', 'creds.json');
const RETRY_MS = 60000;

function debugLog(...args) {
  if (process.env.PANEL_DEBUG === '1') console.log(...args);
}

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadLocal() {
  if (!fs.existsSync(DATA_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveLocalAtomic(data) {
  ensureDataDir();
  const tmpFile = DATA_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, DATA_FILE);
}

function generarBotIdLocal() {
  return 'bot-' + crypto.randomBytes(8).toString('hex');
}

// Lee el número real desde la sesión principal de Baileys (MysticSession).
// Si el bot todavía no vinculó (o está por revincular), el archivo puede
// no existir o no tener "me" todavía — en ese caso se manda null y listo,
// no rompe el registro.
function leerNumeroDesdeCreds() {
  if (!fs.existsSync(MYSTIC_SESSION_CREDS)) return null;
  try {
    const creds = JSON.parse(fs.readFileSync(MYSTIC_SESSION_CREDS, 'utf8'));
    const jid = creds?.me?.jid;
    if (jid && !jid.endsWith('@lid')) return jid.split('@')[0];
    return null;
  } catch {
    return null;
  }
}

function getServerIp() {
  if (process.env.SERVER_IP) return process.env.SERVER_IP;
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

function getServerPort(localPort) {
  return process.env.SERVER_PORT || localPort || null;
}

let identidadLocal = null;
let retryTimer = null;
let _lastCentralHttpUrl = null;
let _lastOpts = null;
let _lastOnAuthorized = null;

// Pide/actualiza identidad contra el panel central. Nunca recibe secret
// hasta que el deployer autorizó el botId desde /admin/authorize-bot.
async function pedirIdentidad(centralHttpUrl, { nombre, localPort }) {
  if (!identidadLocal) identidadLocal = loadLocal();

  if (!identidadLocal || !identidadLocal.botId) {
    identidadLocal = { botId: generarBotIdLocal(), secret: null };
    saveLocalAtomic(identidadLocal);
  }

  if (identidadLocal.secret) return identidadLocal;

  const payload = {
    botId: identidadLocal.botId,
    nombre: nombre || null,
    numero: leerNumeroDesdeCreds(),
    serverIp: getServerIp(),
    serverPort: getServerPort(localPort)
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(`${centralHttpUrl}/bot/request-identity`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await resp.json();
    if (data.ok && data.authorized && data.secret) {
      identidadLocal.secret = data.secret;
      saveLocalAtomic(identidadLocal);
    }
  } catch (e) {
    debugLog('[panel-identity] no se pudo contactar al panel central:', e.name === 'AbortError' ? 'timeout de 10s' : e.message);
  }

  return identidadLocal;
}

// No bloquea el arranque del bot. Si todavía no está autorizado, reintenta
// solo cada RETRY_MS (manda de nuevo nombre/número/ip/puerto por si
// cambiaron mientras esperaba) y llama a onAuthorized() la primera vez que
// consigue un secret — no hace falta reiniciar el bot después de
// autorizarlo desde el panel.
export function initBotIdentity(centralHttpUrl, { nombre, localPort } = {}, onAuthorized) {
  if (retryTimer) clearInterval(retryTimer);
  debugLog('[panel-identity] iniciando, contactando al panel central');
  _lastCentralHttpUrl = centralHttpUrl;
  _lastOpts = { nombre, localPort };
  _lastOnAuthorized = onAuthorized;

  const intentar = async () => {
    const identidad = await pedirIdentidad(centralHttpUrl, { nombre, localPort });
    if (identidad.secret) {
      clearInterval(retryTimer);
      retryTimer = null;
      onAuthorized(identidad);
      return true;
    }
    return false;
  };

  intentar().then((listo) => {
    if (!listo) {
      debugLog(`[panel-identity] pendiente de autorización, reintentando cada ${RETRY_MS / 1000}s`);
      retryTimer = setInterval(intentar, RETRY_MS);
    }
  });
}

// Se llama cuando el server central rechaza el secret guardado (401 al
// conectar el WebSocket). Pasa esto con versiones viejas del bot que
// tienen un panel-identity.json de una instalación anterior del server
// central: en vez de que el usuario tenga que borrar el archivo a mano,
// se borra el secret local solo y se vuelve a pedir identidad desde cero,
// sin reiniciar el proceso.
export function invalidarIdentidad() {
  if (!identidadLocal) identidadLocal = loadLocal();
  if (identidadLocal) {
    identidadLocal.secret = null;
    saveLocalAtomic(identidadLocal);
  }
  debugLog('[panel-identity] secret rechazado por el server central, pidiendo identidad nueva');
  if (_lastCentralHttpUrl) {
    initBotIdentity(_lastCentralHttpUrl, _lastOpts, _lastOnAuthorized);
  }
}
