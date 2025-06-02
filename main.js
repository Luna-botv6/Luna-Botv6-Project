"use strict";
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'; 
import './config.js';
import './api.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import { readdirSync, statSync, unlinkSync, existsSync, readFileSync, watch } from 'fs';
import yargs from 'yargs';
import fs from 'fs';
import { readdir, unlink, stat } from 'fs/promises';
import { spawn } from 'child_process';
import lodash from 'lodash';
import chalk from 'chalk';
import syntaxerror from 'syntax-error';
import { format } from 'util';
import pino from 'pino';
import Pino from 'pino';
import { Boom } from '@hapi/boom';
import { makeWASocket, protoType, serialize } from './src/libraries/simple.js';
import { Low, JSONFile } from 'lowdb';
import store from './src/libraries/store.js';
const { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser, PHONENUMBER_MCC } = await import("@whiskeysockets/baileys");
import readline from 'readline';
import NodeCache from 'node-cache';
import { restaurarConfiguraciones } from './lib/funcConfig.js';
import { getOwnerFunction } from './lib/owner-funciones.js';

const { chain } = lodash;
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
let stopped = 'close';  

protoType();
serialize();

const msgRetryCounterMap = new Map();
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
};

global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true));
};

global.__require = function require(dir = import.meta.url) {
  return createRequire(dir);
};

global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({...query, ...(apikeyqueryname ? {[apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name]} : {})})) : '');

global.timestamp = { start: new Date };
global.videoList = [];
global.videoListXXX = [];

const __dirname = global.__dirname(import.meta.url);
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = new RegExp('^[' + (opts['prefix'] || '*/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-.@').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']');
global.db = new Low(/https?:\/\//.test(opts['db'] || '') ? new cloudDBAdapter(opts['db']) : new JSONFile(`${opts._[0] ? opts._[0] + '_' : ''}database.json`));


global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    return new Promise((resolve) => setInterval(async function() {
      if (!global.db.READ) {
        clearInterval(this);
        resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
      }
    }, 1 * 1000));
  }
  if (global.db.data !== null) return;
  global.db.READ = true;
  await global.db.read().catch(console.error);
  global.db.READ = null;
  global.db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
    ...(global.db.data || {}),
  };
  global.db.chain = chain(global.db.data);
};
loadDatabase();

/* Creditos a Otosaka (https://wa.me/51993966345) */

global.chatgpt = new Low(new JSONFile(path.join(__dirname, '/db/chatgpt.json')));
global.loadChatgptDB = async function loadChatgptDB() {
  if (global.chatgpt.READ) {
    return new Promise((resolve) =>
      setInterval(async function() {
        if (!global.chatgpt.READ) {
          clearInterval(this);
          resolve( global.chatgpt.data === null ? global.loadChatgptDB() : global.chatgpt.data );
        }
      }, 1 * 1000));
  }
  if (global.chatgpt.data !== null) return;
  global.chatgpt.READ = true;
  await global.chatgpt.read().catch(console.error);
  global.chatgpt.READ = null;
  global.chatgpt.data = {
    users: {},
    ...(global.chatgpt.data || {}),
  };
  global.chatgpt.chain = lodash.chain(global.chatgpt.data);
};
loadChatgptDB();

/* ------------------------------------------------*/


const {state, saveCreds} = await useMultiFileAuthState(global.authFile);
const { version } = await fetchLatestBaileysVersion();
let phoneNumber = global.botnumber || process.argv.find(arg => /^\+\d+$/.test(arg));

const methodCodeQR = process.argv.includes("qr")
const methodCode = !!phoneNumber || process.argv.includes("code")
const MethodMobile = process.argv.includes("mobile")
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))

//Código adaptado para la compatibilidad de ser bot con el código de 8 digitos. Hecho por: https://github.com/GataNina-Li
let opcion; // solo se declara una vez

opcion = '1';
try {
  if (methodCodeQR) {
    opcion = '1';
  } else if (!methodCode && !fs.existsSync(`./${authFile}/creds.json`)) {
    do {
      opcion = await question('[ ℹ️ ] Seleccione una opción:\n1. Con código QR\n2. Con código de texto de 8 dígitos\n---> ');
      if (!/^[1-2]$/.test(opcion)) {
        console.log('[ ❗ ] Por favor, seleccione solo 1 o 2.\n');
      }
    } while (!['1', '2'].includes(opcion) || fs.existsSync(`./${authFile}/creds.json`));
  }
} catch (error) {
  console.error('[❌] Error al seleccionar opción:', error);
}


console.info = () => {} // https://github.com/skidy89/baileys actualmente no muestra logs molestos en la consola
const connectionOptions = {
    logger: Pino({ level: 'silent' }),
    printQRInTerminal: opcion === '1' || methodCodeQR,
    mobile: MethodMobile,
    browser: opcion === '1' ? ['TheMystic-Bot-MD', 'Safari', '2.0.0'] : methodCodeQR ? ['TheMystic-Bot-MD', 'Safari', '2.0.0'] : ['Ubuntu', 'Chrome', '20.0.04'],
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'fatal' }).child({ level: 'fatal' })),
    },
    waWebSocketUrl: 'wss://web.whatsapp.com/ws/chat?ED=CAIICA',
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
   getMessage: async (key) => {
  try {
    let jid = jidNormalizedUser(key.remoteJid);
    let msg = await store.loadMessage(jid, key.id);
    return msg?.message || "";
  } catch (e) {
    console.error('[❌] Error en getMessage:', e);
    return '';
  }
},

patchMessageBeforeSending: async (message) => {
  try {
    global.conn.uploadPreKeysToServerIfRequired();
    return message;
  } catch (e) {
    console.error('[❌] Error en patchMessageBeforeSending:', e);
    return message;
  }
},

    msgRetryCounterCache: msgRetryCounterCache,
    userDevicesCache: userDevicesCache,
    //msgRetryCounterMap,
    defaultQueryTimeoutMs: undefined,
    cachedGroupMetadata: (jid) => global.conn.chats[jid] ?? {},
    version,

    //userDeviceCache: msgRetryCounterCache <=== quien fue el pendejo?????
};

global.conn = makeWASocket(connectionOptions);
restaurarConfiguraciones(global.conn);
const ownerConfig = getOwnerFunction()
if (ownerConfig.modopublico) global.conn.public = true
if (ownerConfig.auread) global.opts['autoread'] = true
if (ownerConfig.modogrupos) global.conn.modogrupos = true
conn.ev.on('connection.update', connectionUpdate);

if (!fs.existsSync(`./${authFile}/creds.json`)) {
if (opcion === '2' || methodCode) {
opcion = '2'
if (!conn.authState.creds.registered) {  
if (MethodMobile) throw new Error('No se puede usar un código de emparejamiento con la API móvil')

let numeroTelefono
if (!!phoneNumber) {
numeroTelefono = phoneNumber.replace(/[^0-9]/g, '')
if (!Object.keys(PHONENUMBER_MCC).some(v => numeroTelefono.startsWith(v))) {
console.log(chalk.bgBlack(chalk.bold.redBright("Comience con el código de país de su número de WhatsApp.\nEjemplo: +5219992095479\n")))
process.exit(0)
}} else {
while (true) {
numeroTelefono = await question(chalk.bgBlack(chalk.bold.yellowBright('Por favor, escriba su número de WhatsApp.\nEjemplo: +5219992095479\n')))
numeroTelefono = numeroTelefono.replace(/[^0-9]/g, '')

if (numeroTelefono.match(/^\d+$/) && Object.keys(PHONENUMBER_MCC).some(v => numeroTelefono.startsWith(v))) {
break 
} else {
console.log(chalk.bgBlack(chalk.bold.redBright("Por favor, escriba su número de WhatsApp.\nEjemplo: +5219992095479.\n")))
}}
rl.close()  
} 

        setTimeout(async () => {
            let codigo = await conn.requestPairingCode(numeroTelefono)
            codigo = codigo?.match(/.{1,4}/g)?.join("-") || codigo
            console.log(chalk.yellow('[ ℹ️ ] introduce el código de emparejamiento en WhatsApp.'));
            console.log(chalk.black(chalk.bgGreen(`Su código de emparejamiento: `)), chalk.black(chalk.white(codigo)))
        }, 3000)
}}
}

conn.isInit = false;
conn.well = false;
conn.logger.info(`[ ℹ️ ] Cargando...\n`);
purgeSession();
purgeSessionSB();
purgeOldFiles();


if (!opts['test']) {
  if (global.db) {
    setInterval(async () => {
      if (global.db.data) await global.db.write();
      if (opts['autocleartmp'] && (global.support || {}).find) (tmp = [os.tmpdir(), 'tmp', 'jadibts'], tmp.forEach((filename) => cp.spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete'])));
    }, 30 * 1000);
  }
}

if (opts['server']) (await import('./server.js')).default(global.conn, PORT);



async function clearTmp() {
  const tmp = [join('./src/tmp')];
  try {
    for (const dirname of tmp) {
      const files = await readdir(dirname);
      await Promise.all(files.map(async file => {
        const filePath = join(dirname, file);
        const stats = await stat(filePath);
        if (stats.isFile() && (Date.now() - stats.mtimeMs >= 1000 * 60 * 3)) {
          await unlink(filePath);
        }
      }));
    }
  } catch (err) {
    console.error('[❌] Error en clearTmp:', err.message);
  }
}

// Función para eliminar archivos core.<numero>
const dirToWatchccc = path.join(__dirname, './');
function deleteCoreFiles(filePath) {
  const coreFilePattern = /^core\.\d+$/i;
  const filename = path.basename(filePath);
  if (coreFilePattern.test(filename)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error eliminando el archivo ${filePath}:`, err);
      } else {
        console.log(`Archivo eliminado: ${filePath}`);
      }
    });
  }
}
fs.watch(dirToWatchccc, (eventType, filename) => {
  if (eventType === 'rename') {
    const filePath = path.join(dirToWatchccc, filename);
    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        deleteCoreFiles(filePath);
      }
    });
  }
});

async function purgeSession() {
  try {
    const directorio = await readdir("./MysticSession");
    const prekeyFiles = directorio.filter(file =>
      file.startsWith('pre-key-') ||
      file.startsWith('sender-key-') ||
      file.startsWith('app-state-sync-key-')
    );
    console.log(`[CleanUp] claves encontradas en MysticSession: ${prekeyFiles.length}`);
    await Promise.all(prekeyFiles.map(file => unlink(`./MysticSession/${file}`)));
  } catch (err) {
    console.error('[❌] Error al limpiar MysticSession:', err.message);
  }
}

async function purgeOldFiles() {
  const dir = './MysticSession/';
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  try {
    const files = await readdir(dir);
    let eliminados = 0;
    await Promise.all(files.map(async file => {
      const filePath = `${dir}${file}`;
      try {
        // Chequea si el archivo sigue existiendo antes de hacer stat
        const stats = await stat(filePath).catch(() => null);
        if (!stats || !stats.isFile()) return;

        if (stats.mtimeMs < oneHourAgo && file !== 'creds.json') {
          await unlink(filePath);
          eliminados++;
        }
      } catch (err) {
        console.log(chalk.red(`[ERROR] No se pudo eliminar: ${file}`));
      }
    }));
    if (eliminados > 0) {
      console.log(chalk.cyanBright(`🧹 Se eliminaron ${eliminados} archivo(s) antiguo(s) en MysticSession`));
    } else {
      console.log(chalk.cyanBright(`🧹 No se encontraron archivos antiguos para eliminar en MysticSession`));
    }
  } catch (err) {
    console.error('[❌] Error en purgeOldFiles:', err.message);
  }
}



async function purgeSessionSB() {
  try {
    const listaDirectorios = await readdir("./jadibts/");
    for (const directorio of listaDirectorios) {
      const dirPath = `./jadibts/${directorio}`;
      const stats = await stat(dirPath);
      if (stats.isDirectory()) {
        const DSBPreKeys = (await readdir(dirPath)).filter(file =>
          file.startsWith('pre-key-') ||
          file.startsWith('sender-key-') ||
          file.startsWith('app-state-sync-key-')
        );
        console.log(`[CleanUp] claves encontradas en jadibts/${directorio}: ${DSBPreKeys.length}`);
        await Promise.all(DSBPreKeys.map(file => unlink(`${dirPath}/${file}`)));
      }
    }
  } catch (err) {
    console.log(chalk.bold.red(`[ ℹ️ ] Algo salió mal durante la eliminación, archivos no eliminados`));
  }
}



let lastQR = null; // 👈 esto fuera de la función, por ejemplo justo arriba de connectionUpdate

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin } = update;
  stopped = connection;
  if (isNewLogin) conn.isInit = true;

  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error);
    global.timestamp.connect = new Date;
  }
  if (global.db.data == null) loadDatabase();

  
  if ((update.qr != 0 && update.qr != undefined) || methodCodeQR) {
    if (opcion == '1' || methodCodeQR) {
      if (update.qr && update.qr !== lastQR) {
        console.log(chalk.yellow('[ ℹ️ ] Escanea el código QR.'));
        lastQR = update.qr; 
      }
    }
  }

  if (connection == 'open') {
    console.log(chalk.yellow('[ ℹ️ ] Conectado correctamente.'));
  }

  let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
  if (reason == 405) {
    await fs.unlinkSync("./MysticSession/" + "creds.json");
    console.log(chalk.bold.redBright(`[ ⚠ ] Conexión reemplazada, Por favor espere un momento me voy a reiniciar...\nSi aparecen error vuelve a iniciar con : npm start`));
    process.send('reset');
  }

  if (connection === 'close') {
    if (reason === DisconnectReason.badSession) {
      conn.logger.error(`[ ⚠ ] Sesión incorrecta, por favor elimina la carpeta ${global.authFile} y escanea nuevamente.`);
    } else if (reason === DisconnectReason.connectionClosed) {
      conn.logger.warn(`[ ⚠ ] Conexión cerrada, reconectando en 2 segundos...`);
      setTimeout(async () => { await global.reloadHandler(true).catch(console.error); }, 2000);
    } else if (reason === DisconnectReason.connectionLost) {
      conn.logger.warn(`[ ⚠ ] Conexión perdida con el servidor, reconectando en 2 segundos...`);
      setTimeout(async () => { await global.reloadHandler(true).catch(console.error); }, 2000);
    } else if (reason === DisconnectReason.connectionReplaced) {
      conn.logger.error(`[ ⚠ ] Conexión reemplazada, se ha abierto otra nueva sesión. Por favor, cierra la sesión actual primero.`);
    } else if (reason === DisconnectReason.loggedOut) {
      conn.logger.error(`[ ⚠ ] Conexion cerrada, por favor elimina la carpeta ${global.authFile} y escanea nuevamente.`);
    } else if (reason === DisconnectReason.restartRequired) {
      conn.logger.info(`[ ⚠ ] Reinicio necesario, reinicie el servidor si presenta algún problema.`);
      await global.reloadHandler(true).catch(console.error);
    } else if (reason === DisconnectReason.timedOut) {
      conn.logger.warn(`[ ⚠ ] Tiempo de conexión agotado, reconectando en 2 segundos...`);
      setTimeout(async () => { await global.reloadHandler(true).catch(console.error); }, 2000);
    } else {
      conn.logger.warn(`[ ⚠ ] Razón de desconexión desconocida. ${reason || ''}: ${connection || ''}`);
      await global.reloadHandler(true).catch(console.error);
    }
  }
}


process.on('uncaughtException', console.error);

let isInit = true;

let handler = await import('./handler.js');
global.reloadHandler = async function(restatConn) {
  
  try {
   
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error);
    if (Object.keys(Handler || {}).length) handler = Handler;
  } catch (e) {
    console.error(e);
  }
  if (restatConn) {
    const oldChats = global.conn.chats;
    try {
      global.conn.ws.close();
    } catch { }
    conn.ev.removeAllListeners();
    global.conn = makeWASocket(connectionOptions, {chats: oldChats});
    store?.bind(conn);
    isInit = true;
  }
  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler);
    conn.ev.off('group-participants.update', conn.participantsUpdate);
    conn.ev.off('groups.update', conn.groupsUpdate);
    conn.ev.off('message.delete', conn.onDelete);
    conn.ev.off('call', conn.onCall);
    conn.ev.off('connection.update', conn.connectionUpdate);
    conn.ev.off('creds.update', conn.credsUpdate);
  }
// Carga las configuraciones
const funcionesOwner = getOwnerFunction();

// Evento para manejar mensajes entrantes (antiprivado y modogrupos)
conn.ev.on('messages.upsert', async ({ messages }) => {
  if (!Array.isArray(messages)) return;
  const m = messages[0];
  if (!m.message || m.key?.remoteJid === 'status@broadcast') return;

  const isGroup = m.key.remoteJid.endsWith('@g.us');
  const sender = m.key.participant || m.key.remoteJid;

  // Función antiprivado
  if (funcionesOwner.antiprivado && !isGroup && !global.owner.includes(sender.split('@')[0])) {
    try {
      await conn.sendMessage(sender, { text: '🚫 *No puedo responder en chats privados.*' });
    } catch (e) {}
    return;
  }

  // Función modogrupos
  if (funcionesOwner.modogrupos && !isGroup) {
    try {
      await conn.sendMessage(sender, { text: '🚫 *Solo puedo responder en grupos.*' });
    } catch (e) {}
    return;
  }
});
  // Para cambiar estos mensajes, solo los archivos en la carpeta de language, 
  // busque la clave "handler" dentro del json y cámbiela si es necesario
  conn.welcome = '👋 ¡Bienvenido/a!\n@user';
  conn.bye = '👋 ¡Hasta luego!\n@user';
  conn.spromote = '*[ ℹ️ ] @user Fue promovido a administrador.*';
  conn.sdemote = '*[ ℹ️ ] @user Fue degradado de administrador.*';
  conn.sDesc = '*[ ℹ️ ] La descripción del grupo ha sido modificada.*';
  conn.sSubject = '*[ ℹ️ ] El nombre del grupo ha sido modificado.*';
  conn.sIcon = '*[ ℹ️ ] Se ha cambiado la foto de perfil del grupo.*';
  conn.sRevoke = '*[ ℹ️ ] El enlace de invitación al grupo ha sido restablecido.*';

  conn.handler = handler.handler.bind(global.conn);
  conn.participantsUpdate = handler.participantsUpdate.bind(global.conn);
  conn.groupsUpdate = handler.groupsUpdate.bind(global.conn);
  conn.onDelete = handler.deleteUpdate.bind(global.conn);
  conn.onCall = handler.callUpdate.bind(global.conn);
  conn.connectionUpdate = connectionUpdate.bind(global.conn);
  conn.credsUpdate = saveCreds.bind(global.conn, true);

  const currentDateTime = new Date();
  const messageDateTime = new Date(conn.ev);
  if (currentDateTime >= messageDateTime) {
    const chats = Object.entries(conn.chats).filter(([jid, chat]) => !jid.endsWith('@g.us') && chat.isChats).map((v) => v[0]);
  } else {
    const chats = Object.entries(conn.chats).filter(([jid, chat]) => !jid.endsWith('@g.us') && chat.isChats).map((v) => v[0]);
  }

conn.ev.on('messages.upsert', async (msg) => {
  try {
    await conn.handler(msg);
  } catch (err) {
    console.error('[❗️ERROR en handler de mensajes]:', err);
  }
});
conn.ev.on('group-participants.update', conn.participantsUpdate);
conn.ev.on('groups.update', conn.groupsUpdate);
conn.ev.on('message.delete', conn.onDelete);
conn.ev.on('call', conn.onCall);
conn.ev.on('connection.update', conn.connectionUpdate);
conn.ev.on('creds.update', conn.credsUpdate);
isInit = false;
return true;
};



const pluginFolder = global.__dirname(join(__dirname, './plugins/index'));
const pluginFilter = (filename) => /\.js$/.test(filename);
global.plugins = {};
async function filesInit() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = global.__filename(join(pluginFolder, filename));
      const module = await import(file);
      global.plugins[filename] = module.default || module;
    } catch (e) {
      conn.logger.error(e);
      delete global.plugins[filename];
    }
  }
}
filesInit().then((_) => Object.keys(global.plugins)).catch(console.error);

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    const dir = global.__filename(join(pluginFolder, filename), true);
    if (filename in global.plugins) {
      if (existsSync(dir)) conn.logger.info(` updated plugin - '${filename}'`);
      else {
        conn.logger.warn(`deleted plugin - '${filename}'`);
        return delete global.plugins[filename];
      }
    } else conn.logger.info(`new plugin - '${filename}'`);
    const err = syntaxerror(readFileSync(dir), filename, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
    });
    if (err) conn.logger.error(`syntax error while loading '${filename}'\n${format(err)}`);
    else {
      try {
        const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`));
        global.plugins[filename] = module.default || module;
      } catch (e) {
        conn.logger.error(`error require plugin '${filename}\n${format(e)}'`);
      } finally {
        global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
      }
    }
  }
};
Object.freeze(global.reload);
watch(pluginFolder, global.reload);
await global.reloadHandler();
async function _quickTest() {
  const test = await Promise.all([
    spawn('ffmpeg'),
    spawn('ffprobe'),
    spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
    spawn('convert'),
    spawn('magick'),
    spawn('gm'),
    spawn('find', ['--version']),
  ].map((p) => {
    return Promise.race([
      new Promise((resolve) => {
        p.on('close', (code) => {
          resolve(code !== 127);
        });
      }),
      new Promise((resolve) => {
        p.on('error', (_) => resolve(false));
      })]);
  }));
  const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test;
  global.support = {ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find};
  Object.freeze(global.support);
}
setInterval(() => {
  if (stopped === 'close' || !global.conn || !global.conn?.user) return;
  clearTmp();
}, 180000);

setInterval(() => {
  if (stopped === 'close' || !global.conn || !global.conn?.user) return;
  purgeSessionSB();
  purgeOldFiles();
  purgeSession();
}, 1000 * 60 * 60);


setInterval(async () => {
  if (stopped === 'close' || !conn || !conn?.user) return;
  const _uptime = process.uptime() * 1000;
  const uptime = clockString(_uptime);
  const bio = `• Activo: ${uptime} | TheMystic-Bot-MD`;
  await conn?.updateProfileStatus(bio).catch((_) => _);
}, 60000);
function clockString(ms) {
  const d = isNaN(ms) ? '--' : Math.floor(ms / 86400000);
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000) % 24;
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [d, 'd ️', h, 'h ', m, 'm ', s, 's '].map((v) => v.toString().padStart(2, 0)).join('');
}
_quickTest().catch(console.error);
    process.on('uncaughtException', (err) => {
  console.log('🚨 Error inesperado no capturado');
  console.log('📄 Mensaje:', err?.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('⚠️ Promesa rechazada sin manejar');
  console.log('📄 Razón:', reason);
});

