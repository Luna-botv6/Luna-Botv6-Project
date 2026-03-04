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
import { spawn, fork } from 'child_process';
import lodash from 'lodash';
import chalk from 'chalk';
import syntaxerror from 'syntax-error';
import { format } from 'util';
import pino from 'pino';
import Pino from 'pino';
import { Boom } from '@hapi/boom';
import { isJidBroadcast } from '@whiskeysockets/baileys';
import { makeWASocket, protoType, serialize } from './src/libraries/simple.js';
import { Low, JSONFile } from 'lowdb';
import store from './src/libraries/store.js';
const { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser, PHONENUMBER_MCC } = await import("@whiskeysockets/baileys");
import readline from 'readline';
import NodeCache from 'node-cache';
import { restaurarConfiguraciones } from './lib/funcConfig.js';
import { getOwnerFunction } from './lib/owner-funciones.js';
import { isCleanerEnabled } from './lib/cleaner-config.js';
import { startAutoCleanService } from './auto-cleaner.js';
import { privacyConfig, cleanOldUserData, secureLogger } from './privacy-config.js';
import mentionListener from './plugins/game-ialuna.js';
import { manejarEventosGrupo } from './lib/funcion/eventos-grupo.js';
const { chain } = lodash;
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
let stopped = 'close';  
let pairingTimeout = null;
let pairingStartTime = null;
const PAIRING_TIMEOUT_DURATION = 120000;

protoType();
serialize();

const msgRetryCounterMap = new Map();

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

async function clearSessionAndRestart() {
    console.log(chalk.red('[ ✖ ] Timeout de pareado alcanzado. Limpiando sesión...'));
    
    if (pairingTimeout) {
        clearTimeout(pairingTimeout);
        pairingTimeout = null;
    }
    
    const carpetas = [global.authFile, 'MysticSession'];
    const eliminadas = [];
    
    await Promise.allSettled(
        carpetas.map(async (carpeta) => {
            const ruta = `./${carpeta}`;
            if (fs.existsSync(ruta)) {
                await fs.promises.rm(ruta, { recursive: true, force: true });
                eliminadas.push(carpeta);
            }
        })
    );
    
    if (eliminadas.length > 0) {
        console.log(chalk.yellow(`[ ℹ️ ] Limpieza completada: ${eliminadas.join(', ')}`));
    }
    
    console.log(chalk.yellow('[ ℹ️ ] Reiniciando en 2 segundos...'));
    setTimeout(() => process.exit(1), 2000);
}

global.videoList = [];
global.videoListXXX = [];
const __dirname = global.__dirname(import.meta.url);
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = new RegExp('^[' + (opts['prefix'] || '*/i!#$%+£¢€¥^°=¶†×÷π√✓©®:;?&.\\-.@').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']');
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
    privacy: {
      dataRetentionDays: privacyConfig.dataRetention.days,
      lastCleanup: Date.now(),
      userConsent: {}
    },
    ...(global.db.data || {}),
  };
  global.db.chain = chain(global.db.data);
};
await loadDatabase();
await restaurarConfiguraciones();

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

let opcion = '1';
const authFolder = global.authFile;
let phoneNumber = global.botnumber || process.argv.find(arg => /^\+\d+$/.test(arg));

const methodCodeQR = process.argv.includes("qr");
const methodCode = !!phoneNumber || process.argv.includes("code");
const MethodMobile = process.argv.includes("mobile");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver));

try {
  if (methodCodeQR) {
    opcion = '1';
    console.log(chalk.yellow('[ ℹ️ ] Modo QR seleccionado desde argumentos'));
  } else if (methodCode && phoneNumber) {
    opcion = '2';
    console.log(chalk.yellow('[ ℹ️ ] Modo código seleccionado desde argumentos'));
  } else if (!fs.existsSync(`./${authFolder}/creds.json`)) {
    console.log(chalk.cyan('[ ℹ️ ] No se encontró sesión existente'));
    do {
      opcion = await question(chalk.bgBlack(chalk.bold.yellowBright('[ ℹ️ ] Seleccione una opción:\n1. Con código QR\n2. Con código de texto de 8 dígitos\n---> ')));
      if (!/^[1-2]$/.test(opcion)) {
        console.log(chalk.red('[ ● ] Por favor, seleccione solo 1 o 2.\n'));
      }
    } while (!['1', '2'].includes(opcion));
  } else {
    console.log(chalk.green('[ ℹ️ ] Sesión existente encontrada'));
  }
} catch (error) {
  console.error(chalk.red('[ ● ] Error al seleccionar opción:'), error);
  opcion = '1';
}

const {state, saveCreds} = await useMultiFileAuthState(authFolder);
const { version } = await fetchLatestBaileysVersion();

console.info = () => {}

const connectionOptions = {
    logger: Pino({ level: 'silent' }),
    printQRInTerminal: opcion === '1',
    mobile: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
            state.keys,
            Pino({ level: 'fatal' }).child({ level: 'fatal' })
        ),
    },

    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,

    qrTimeout: 40000,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    syncFullHistory: false,
    fireInitQueries: false,
    emitOwnEvents: false,

    version,

getMessage: async (key) => {
    const connectionTime = global.timestamp?.connect?.getTime() || Date.now();
    const msgTimestamp = (key.messageTimestamp || 0) * 1000;
    
if (msgTimestamp < connectionTime) {
    return null;
}

    try {
        let jid = jidNormalizedUser(key.remoteJid);
        let msg = await store.loadMessage(jid, key.id);
        return msg?.message || "";
    } catch (e) {
        return '';
    }
},

    patchMessageBeforeSending: async (message) => {
        return message;
    },

    msgRetryCounterCache: new NodeCache({
        stdTTL: 300,
        checkperiod: 60,
        useClones: false
    }),
    userDevicesCache: new NodeCache({
        stdTTL: 3600,
        checkperiod: 300,
        useClones: false
    }),

    cachedGroupMetadata: (jid) => {
        const chat = global.conn.chats[jid];
        if (chat) {
            return {
                id: chat.id,
                subject: chat.subject,
                participants: chat.participants?.length || 0
            };
        }
        return {};
    },
};

global.conn = makeWASocket(connectionOptions);
import printMessage from './src/libraries/print.js';

function applyPrintWrapper(conn) {
  const originalSendMessage = conn.sendMessage.bind(conn);
  conn.sendMessage = async function (jid, content, options = {}) {
    const msgText = content?.text ?? content?.caption ?? content?.conversation ?? null;
    if (msgText !== null && typeof msgText === 'string' && msgText.trim() === '') {
      return null;
    }
    const result = await originalSendMessage(jid, content, options);
    try {
      const fakeMsg = {
        key: {
          fromMe: true,
          remoteJid: jid
        },
        fromMe: true,
        sender: conn.user?.jid,
        chat: jid,
        mtype: Object.keys(content || {})[0] || 'unknown',
        messageTimestamp: Math.floor(Date.now() / 1000),
        text:
          content?.text ||
          content?.caption ||
          content?.conversation ||
          null,
        msg: content
      };
      await printMessage(fakeMsg, conn);
    } catch (e) {
      console.error('[Print Bot Error]', e.message);
    }
    return result;
  };
}

applyPrintWrapper(global.conn);

conn.ev.on('creds.update', saveCreds);

setInterval(async () => {
  if (global.conn?.user && !global.isProcessing) {
    try {
      await global.conn.sendPresenceUpdate('available');
    } catch (e) {
      secureLogger?.error?.('Error enviando presencia:', e.message);
    }
  }
}, 30000);

//restaurarConfiguraciones(global.conn);
const ownerConfig = getOwnerFunction();
if (ownerConfig.modopublico) global.conn.public = true;
if (ownerConfig.auread) global.opts['autoread'] = true;
if (ownerConfig.modogrupos) global.conn.modogrupos = true;
conn.ev.on('connection.update', connectionUpdate);

conn.logger.info(`[ ℹ️ ] Cargando...\n`);

if (opcion === '2' && !fs.existsSync(`./${authFolder}/creds.json`)) {
    console.log(chalk.yellow('[ ℹ️ ] Modo código de 8 dígitos seleccionado'));
    
    if (MethodMobile) {
        console.log(chalk.red('[ ● ] No se puede usar código de emparejamiento con API móvil'));
        process.exit(1);
    }

    let numeroTelefono;
    
    if (phoneNumber) {
        numeroTelefono = phoneNumber.replace(/[^0-9]/g, '');
        console.log(chalk.green('[ ℹ️ ] Usando número proporcionado:'), phoneNumber);
        
        if (!numeroTelefono.match(/^\d+$/) || !Object.keys(PHONENUMBER_MCC).some(v => numeroTelefono.startsWith(v))) {
            console.log(chalk.red('[ ● ] Número de teléfono inválido:'), phoneNumber);
            console.log(chalk.yellow('[ ℹ️ ] Formato correcto: +5493483511079'));
            process.exit(1);
        }
    } else {
        while (true) {
            numeroTelefono = await question(chalk.bgBlack(chalk.bold.yellowBright('[ ℹ️ ] Escriba su número de WhatsApp (incluya código de país):\nEjemplo: +5493483511079\n---> ')));

            if (numeroTelefono.match(/^\d+$/) && Object.keys(PHONENUMBER_MCC).some(v => numeroTelefono.startsWith(v))) {
                break;
            } else {
                console.log(chalk.red('[ ● ] Número inválido. Use formato: +5493483511079'));
            }
        }
    }

    if (!phoneNumber) {
        rl.close();
    }

    global.conn.phoneNumber = numeroTelefono;
    pairingStartTime = Date.now();
    
    pairingTimeout = setTimeout(() => {
        if (!global.conn?.user) {
            clearSessionAndRestart();
        }
    }, PAIRING_TIMEOUT_DURATION);
    
    console.log(chalk.yellow(`[ ⏰ ] Tienes ${PAIRING_TIMEOUT_DURATION / 1000} segundos para completar el pareado`));
    
    setTimeout(async () => {
        try {
            console.log(chalk.yellow('[ ℹ️ ] Preparando solicitud de código de emparejamiento...'));
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            let codigo;
            let intentos = 0;
            const maxIntentos = 3;
            
            while (intentos < maxIntentos && !global.conn?.user) {
                try {
                    intentos++;
                    console.log(chalk.yellow(`[ ℹ️ ] Solicitando código de emparejamiento... (Intento ${intentos}/${maxIntentos})`));
                    
                    codigo = await global.conn.requestPairingCode(numeroTelefono);
                    
                    if (codigo) {
                        codigo = codigo?.match(/.{1,4}/g)?.join("-") || codigo;
                        
                        console.log(chalk.green('┌─────────────────────────────────────────────┐'));
                        console.log(chalk.green.bold('📱 CÓDIGO DE EMPAREJAMIENTO:'));
                        console.log(chalk.yellow.bold('   ' + codigo));
                        console.log(chalk.green('└─────────────────────────────────────────────┘'));
                        console.log(chalk.cyan('[ ℹ️ ] Pasos para vincular:'));
                        console.log(chalk.cyan('1. Abre WhatsApp en tu teléfono'));
                        console.log(chalk.cyan('2. Ve a Configuración > Dispositivos vinculados'));
                        console.log(chalk.cyan('3. Toca "Vincular dispositivo"'));
                        console.log(chalk.cyan('4. Selecciona "Vincular con número de teléfono"'));
                        console.log(chalk.cyan('5. Ingresa el código de arriba'));
                        console.log(chalk.red.bold(`6. IMPORTANTE: Tienes ${Math.floor((PAIRING_TIMEOUT_DURATION - (Date.now() - pairingStartTime)) / 1000)} segundos restantes`));
                        console.log(chalk.green('└─────────────────────────────────────────────┘'));
                        
                        break;
                    }
                    
                } catch (error) {
                    console.log(chalk.red(`[ ● ] Error en intento ${intentos}:`, error.message));
                    
                    if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
                        console.log(chalk.yellow('[ ℹ️ ] Límite de velocidad alcanzado. Esperando...'));
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    } else if (intentos < maxIntentos) {
                        console.log(chalk.yellow(`[ ℹ️ ] Reintentando en 3 segundos...`));
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
            }
            
            if (!codigo) {
                console.log(chalk.red('[ ● ] No se pudo obtener el código después de varios intentos'));
                clearSessionAndRestart();
                return;
            }
            
            let codigoRenovado = false;
            const intervaloCodigo = setInterval(async () => {
                if (global.conn?.user) {
                    clearInterval(intervaloCodigo);
                    if (pairingTimeout) {
                        clearTimeout(pairingTimeout);
                        pairingTimeout = null;
                    }
                    
                    console.log(chalk.green('[ ✅ ] ¡Dispositivo vinculado exitosamente!'));
                    console.log(chalk.green('[ ℹ️ ] Sesión guardada correctamente en ' + authFolder));
                    
                    return;
                }
                
                if (!pairingTimeout) {
                    clearInterval(intervaloCodigo);
                    return;
                }
                
                const tiempoRestante = Math.floor((PAIRING_TIMEOUT_DURATION - (Date.now() - pairingStartTime)) / 1000);
                if (tiempoRestante <= 0) {
                    clearInterval(intervaloCodigo);
                    return;
                }
                
                if (!codigoRenovado && tiempoRestante < 90) {
                    try {
                        console.log(chalk.yellow(`[ ℹ️ ] Renovando código... (${tiempoRestante}s restantes)`));
                        const nuevoCodigo = await global.conn.requestPairingCode(numeroTelefono);
                        const codigoFormateado = nuevoCodigo?.match(/.{1,4}/g)?.join("-") || nuevoCodigo;
                        
                        console.log(chalk.green('┌─────────────────────────────────────────────┐'));
                        console.log(chalk.green.bold('📱 NUEVO CÓDIGO DE EMPAREJAMIENTO:'));
                        console.log(chalk.yellow.bold('   ' + codigoFormateado));
                        console.log(chalk.red.bold(`⏰ Tiempo restante: ${tiempoRestante} segundos`));
                        console.log(chalk.green('└─────────────────────────────────────────────┘'));
                        
                        codigoRenovado = true;
                        
                    } catch (error) {
                        console.log(chalk.red('[ ● ] Error al renovar código:', error.message));
                        
                        if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
                            console.log(chalk.yellow('[ ⚠️ ] Límite de velocidad alcanzado. Continuando con código actual...'));
                        }
                    }
                }
            }, 15000);
            
        } catch (error) {
            console.error(chalk.red('[ ● ] Error crítico al solicitar código de emparejamiento:'), error.message);
            
            if (pairingTimeout) {
                clearTimeout(pairingTimeout);
                pairingTimeout = null;
            }
            
            if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
                console.log(chalk.yellow('[ ℹ️ ] Límite de velocidad detectado. Reiniciando proceso...'));
                clearSessionAndRestart();
            } else {
                console.log(chalk.yellow('[ ℹ️ ] Error inesperado. Limpiando sesión...'));
                setTimeout(() => {
                    process.exit(1);
                }, 3000);
            }
        }
    }, 5000);
}

conn.logger.info(`[ ℹ️ ] Cargando...\n`);
if (isCleanerEnabled()) runCleaner();

startAutoCleanService();

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
  const tmp = [join('./src/tmp'), join('./temp')];
  try {
    for (const dirname of tmp) {
      if (!existsSync(dirname)) continue;
      
      const files = await readdir(dirname);
      await Promise.all(files.map(async file => {
        const filePath = join(dirname, file);
        const stats = await stat(filePath);
        
        if (stats.isFile() && (Date.now() - stats.mtimeMs >= 1000 * 60 * 30)) {
          await unlink(filePath);
          secureLogger.info(`Archivo temporal eliminado: ${file}`);
        }
      }));
    }
  } catch (err) {
    secureLogger.error('Error en clearTmp:', err.message);
  }
}

if (privacyConfig.dataRetention.enabled) {
    setInterval(() => {
        if (stopped === 'close' || !global.conn || !global.conn?.user) return;
        cleanOldUserData();
    }, 1000 * 60 * 60 * 24);
}

const dirToWatchccc = path.join(__dirname, './');
function deleteCoreFiles(filePath) {
  const coreFilePattern = /^core\.\d+$/i;
  const filename = path.basename(filePath);
  if (coreFilePattern.test(filename)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        secureLogger.error(`Error eliminando el archivo ${filePath}:`, err);
      } else {
        secureLogger.info(`Archivo eliminado: ${filePath}`);
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

function runCleaner() {
  const cleaner = fork('./lib/cleaner.js');
  cleaner.on('message', msg => console.log('[cleaner]', msg));
  cleaner.on('exit', code => console.log(`[cleaner] terminó con código ${code}`));
}

let lastQR = null;
let codigoSolicitado = false;

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin, qr } = update;
  
  if (connection === 'close') {
    console.log(chalk.red('[ ✖ ] Conexión cerrada'));
  }

  stopped = connection;
  if (isNewLogin) conn.isInit = true;

  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error);
    global.timestamp.connect = new Date;
  }
  if (global.db.data == null) loadDatabase();

  if (opcion === '1' && qr) {
    if (qr !== lastQR) {
      console.log(chalk.yellow('[ ℹ️ ] Escanea el código QR.'));
      lastQR = qr;
    }
  }

if (connection === 'open') {
    stopped = 'open';
    console.log(chalk.green('[ ✅ ] Conectado correctamente a WhatsApp'));
    console.log(chalk.green('[ ℹ️ ] Reinicializando listeners...'));
    
    setTimeout(async () => {
      try {
        await global.reloadHandler(false);
        console.log(chalk.green('[ ✅ ] Listeners reinicializados'));
      } catch (e) {
        console.error(chalk.red('[ ✖ ] Error reinicializando listeners:'), e.message);
      }
    }, 2000);
    
    setTimeout(async () => {
      try {
        const { autoreconnectSubbots } = await import('./plugins/subbot-reconeccion.js');
        await autoreconnectSubbots(conn);
      } catch (error) {
        console.error(chalk.red('❌ Error en auto-reconexión:'), error.message);
      }
    }, 5000);
    codigoSolicitado = false;

    if (opcion === '2' && pairingTimeout) {
        clearTimeout(pairingTimeout);
        pairingTimeout = null;
    }

  } else if (connection === 'connecting') {
    console.log(chalk.yellow('[ ℹ️ ] Conectando a WhatsApp...'));

  } else if (connection === 'close') {
    console.log(chalk.red('[ ✖ ] Conexión cerrada'));
  }

  let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
if (reason === 405) {
    console.log(chalk.yellow('[ ⚠ ] Sesión reemplazada detectada'));
    console.log(chalk.yellow('[ ⚠ ] Reconectando sin borrar credenciales...'));
    setTimeout(async () => { 
      await global.reloadHandler(true).catch(console.error); 
    }, 3000);
    return;
  }

if (connection === 'close') {
    if (reason === DisconnectReason.badSession) {
      console.log(chalk.red('[ ✖ ] Sesión corrupta detectada'));
      console.log(chalk.yellow('[ ⚠ ] Limpiando sesión...'));
      try {
        const authPath = `./${global.authFile}`;
        if (fs.existsSync(authPath)) {
          await fs.promises.rm(authPath, { recursive: true, force: true });
        }
      } catch (e) {}
      console.log(chalk.yellow('[ ⚠ ] Por favor reinicia con: npm start'));
      setTimeout(() => process.exit(1), 2000);
      return;
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
    applyPrintWrapper(global.conn);
    
    isInit = true;
  }
  
  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler);
    conn.ev.off('group-participants.update', conn.participantsUpdate);
    conn.ev.off('message.delete', conn.onDelete);
    conn.ev.off('call', conn.onCall);
    conn.ev.off('connection.update', conn.connectionUpdate);
    conn.ev.off('creds.update', conn.credsUpdate);
  }

  conn.handler = handler.handler.bind(global.conn);
  conn.participantsUpdate = handler.participantsUpdate.bind(global.conn);
  conn.onDelete = handler.deleteUpdate.bind(global.conn);
  conn.onCall = handler.callUpdate.bind(global.conn);
  conn.connectionUpdate = connectionUpdate.bind(global.conn);
  conn.credsUpdate = saveCreds.bind(global.conn, true);

conn.ev.on('messages.upsert', async (msg) => {
    try {
      await conn.handler(msg);
    } catch (err) {
      console.error('ERROR en handler de mensajes:', err.message);
    }
  });

  conn.ev.on('group-participants.update', conn.participantsUpdate);
  conn.ev.on('message.delete', conn.onDelete);
  conn.ev.on('call', conn.onCall);
  conn.ev.on('connection.update', conn.connectionUpdate);
  conn.ev.on('creds.update', conn.credsUpdate);

  if (restatConn || !global.mentionListenerInitialized) {
    try {
      console.log(chalk.yellow('[ 🤖 ] Inicializando listener de IA...'));
      mentionListener(conn);
      global.mentionListenerInitialized = true;
      console.log(chalk.green('[ ✅ ] Listener de IA inicializado correctamente'));
    } catch (e) {
      console.error(chalk.red('[ ✖ ] Error inicializando mentionListener:'), e);
      global.mentionListenerInitialized = false;
    }
  }
  
  isInit = false;
  console.log(chalk.green('[ ✅ ] Handler recargado correctamente'));
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
manejarEventosGrupo(conn);
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
  if (privacyConfig.dataRetention.enabled) cleanOldUserData();
}, 1000 * 60 * 60 * 2);

setInterval(() => {
  if (stopped === 'close' || !global.conn || !global.conn?.user) return;
  if (isCleanerEnabled()) runCleaner();
}, 1000 * 60 * 60 * 6);

setInterval(async () => {
  if (stopped === 'close' || !global.conn || !global.conn?.user) return;
  const _uptime = process.uptime() * 1000;
  const uptime = clockString(_uptime);
  const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  
  const gruposActivos = Object.keys(global.conn.chats || {}).filter(jid => jid.endsWith('@g.us')).length;
  
  const bio = `🌙 Luna-Bot v6 - Online
⏱️ Activo: ${uptime}
🕐 Hora: ${hora}
👥 Grupos: ${gruposActivos}
✨ Powered by TheMystic-Bot-MD`;
  
  await global.conn?.updateProfileStatus(bio).catch(() => {});
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
  secureLogger.error('🚨 Error inesperado no capturado');
  secureLogger.error('📄 Mensaje:', err?.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  secureLogger.warn('⚠️ Promesa rechazada sin manejar');
  secureLogger.warn('📄 Razón:', reason);
});
