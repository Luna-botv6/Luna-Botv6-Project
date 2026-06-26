import { getConfig } from '../lib/funcConfig.js';
import printMessage from '../src/libraries/print.js';
import { getLidMapping } from '../lib/stats.js';
import { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { makeWASocket } from '../src/libraries/simple.js';
import { connectionManager, isRamAvailable, getRamStatus, RAM_FREE_MIN_MB } from '../lib/funcion/connection-manager.js';
import qrcode from 'qrcode';
import NodeCache from 'node-cache';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import chalk from 'chalk';
import { Boom } from '@hapi/boom';

const BOT = () => global.BotName || 'Luna';

const SUBBOT_CONFIG = {
  maxSubbots: 40,
  cooldownMs: 12000,
  maxReconnectAttempts: 5,
  qrTimeoutMs: 45000,
  maxQrAttempts: 3,
  ramFreeMinMB: RAM_FREE_MIN_MB,
  ramMonitorIntervalMs: 60000,
};

const rtxQR = () => `🤖 *${BOT()} Sub Bot*\n\n📱 *Escanea el código QR*\n\n*Pasos:*\n1 » Tres puntos superiores derecha\n2 » Dispositivos vinculados\n3 » Escanea el QR\n\n⚠️ *Expira en 45 segundos*`;
const rtxCode = () => `🤖 *${BOT()} Sub Bot*\n\n✨ Usa este código para vincular\n\n↱ Tres Puntitos → Dispositivos Vinculados → Vincular con número\n\n⚠️ No uses tu cuenta principal`;

function msToTime(ms) {
  const s = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
  const m = Math.floor((ms / 60000) % 60).toString().padStart(2, '0');
  return `${m}m ${s}s`;
}

function calculateBackoff(attempt) {
  return Math.min(1000 * Math.pow(2, attempt), 30000) + Math.random() * 1000;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (global.subbotEnabled === false) return m.reply(`❌ El sistema de SubBots está desactivado.`);

  const sender = m.sender;
  const userData = global.db.data.users?.[sender] || {};
  const lastSubs = userData.Subs || 0;

  if (Date.now() - lastSubs < SUBBOT_CONFIG.cooldownMs) {
    return m.reply(`⏳ Espera ${msToTime(SUBBOT_CONFIG.cooldownMs - (Date.now() - lastSubs))} para volver a intentarlo.`);
  }

  if (connectionManager.getActiveConnectionCount() >= SUBBOT_CONFIG.maxSubbots) {
    return m.reply('❌ No hay espacio disponible para más SubBots.');
  }

  if (!await isRamAvailable()) {
    const { heapUsedMB: used, heapTotalMB: total, heapFreeMB } = await getRamStatus();
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
    return m.reply(`❌ RAM insuficiente para crear un SubBot.\n📊 Uso actual: ${pct}% (${used}MB/${total}MB)\n🔒 Se necesitan al menos ${SUBBOT_CONFIG.ramFreeMinMB}MB libres (disponibles: ${heapFreeMB}MB)`);
  }

  const phoneArg = args.find(a => /^[0-9]{7,15}$/.test(a.trim()));
  let who = m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
  let userId;

  if (phoneArg) {
    userId = phoneArg.trim();
  } else

  if (!phoneArg && m.isGroup) {
    const meta = conn.chats[m.chat]?.metadata || await conn.groupMetadata(m.chat).catch(() => ({}));
    const participant = (meta.participants || []).find(p =>
      conn.decodeJid(p.id) === who || p.id === who || p.lid === who
    );
    const resolvedId = participant?.id || who;
    const cleanId = resolvedId.split('@')[0];
    userId = cleanId.includes('@lid') || /^[0-9]{15,}$/.test(cleanId)
      ? (getLidMapping(resolvedId) || '').replace('@s.whatsapp.net', '') || cleanId
      : cleanId;
  } else if (!phoneArg) {
    const cleanWho = who.split('@')[0];
    userId = who.includes('@lid')
      ? (getLidMapping(who) || '').replace('@s.whatsapp.net', '') || cleanWho
      : cleanWho;
  }

  const isLidUnresolved = !userId || userId.length > 13 || /^[0-9]{15,}$/.test(userId);

  if (isLidUnresolved) {
    return m.reply(
      `⚠️ Aún no conozco tu número real.\n\n` +
      `Por favor *interactúa conmigo un momento* (mandame cualquier mensaje en privado) para que pueda obtener tu número.\n\n` +
      `Luego usá: */serbot <tu_número> --code*\n` +
      `Ejemplo: */serbot 5493483466763 --code*`
    );
  }

  if (connectionManager.isConnecting(userId)) return m.reply('⏳ Ya tienes una conexión en progreso.');
  if (connectionManager.isConnected(userId)) return m.reply('✅ Ya tienes un SubBot activo.');

  const subbotPath = path.join('./sub-lunabot/', userId);
  if (!fs.existsSync(subbotPath)) fs.mkdirSync(subbotPath, { recursive: true });

  if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
  global.db.data.users[sender].Subs = Date.now();

  initializeSubBot({ subbotPath, m, conn, args, userId });
};

handler.command = ['jadibot', 'serbot'];
handler.help = ['serbot', 'serbot code'];
handler.tags = ['socket'];
export default handler;

export async function initializeSubBot({ subbotPath, m, conn, args = [], userId }) {
  userId = userId || path.basename(subbotPath);

  connectionManager.setConnection(userId, { isConnecting: true, isConnected: false, reconnectAttempts: 0 });
  connectionManager.resetQrAttempts(userId);

  const useCode = args[0] && /(--code|^code$)/.test(args[0].trim()) || args[1] && /(--code|^code$)/.test(args[1]?.trim());
  let qrTimeoutId = null;
  let connectionEstablished = false;
  let ramMonitorId = null;
  let codeAlreadyRequested = false;

  if (!fs.existsSync(subbotPath)) fs.mkdirSync(subbotPath, { recursive: true });

  const pathCreds = path.join(subbotPath, 'creds.json');

  if (args[0] && !/(--code|^code$)/.test(args[0].trim())) {
    try {
      const credsData = Buffer.from(args[0], 'base64').toString('utf-8');
      fs.writeFileSync(pathCreds, JSON.stringify(JSON.parse(credsData), null, 2));
    } catch {}
  }

  if (fs.existsSync(pathCreds)) {
    try {
      const raw = fs.readFileSync(pathCreds, 'utf8');
      const creds = JSON.parse(raw);
      const isEmpty = !creds || (Object.keys(creds).length <= 2 && !creds.me && !creds.account && raw.length < 500);
      if (isEmpty) {
        fs.unlinkSync(pathCreds);
        console.log(chalk.yellow(`🗑️ Sesión vacía eliminada: ${userId}`));
      }
    } catch {
      try { fs.unlinkSync(pathCreds); } catch {}
    }
  }

  try {
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1037641644] }));
    const msgRetryCounterCache = new NodeCache();
    const { state, saveCreds } = await useMultiFileAuthState(subbotPath);

    const connectionOptions = {
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      mobile: false,
      browser: useCode ? ['Ubuntu', 'Chrome', '110.0.5585.95'] : [`${BOT()} SubBot`, 'Chrome', '2.0.0'],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => ({ conversation: BOT() }),
      msgRetryCounterCache,
      defaultQueryTimeoutMs: undefined,
    };

    let sock = await makeWASocket(connectionOptions, { noStore: true });
    sock.isSubBot = true;
    sock.userId = userId;
    sock.isInit = false;

    connectionManager.setSocket(userId, sock);

    function cleanupSubBot(reason = 'cleanup') {
      console.log(chalk.yellow(`🧹 Finalizando SubBot ${userId} (${reason})`));
      if (qrTimeoutId) { clearTimeout(qrTimeoutId); qrTimeoutId = null; }
      if (ramMonitorId) { clearInterval(ramMonitorId); ramMonitorId = null; }
      try { connectionManager.getSocket(userId)?.ws?.close(); } catch {}
      try { connectionManager.getSocket(userId)?.ev?.removeAllListeners(); } catch {}
      connectionManager.removeConnection(userId);
      if (['max_qr', 'max_code', 'qr_timeout', 'code_timeout'].includes(reason)) {
        try {
          fs.rmSync(subbotPath, { recursive: true, force: true });
          console.log(chalk.yellow(`🗑️ Carpeta eliminada: ${subbotPath}`));
          if (m?.chat) conn.sendMessage(m.chat,
            { text: `❌ No se vinculó el SubBot.\n🗑️ Sesión eliminada: *${userId}*\n\nUsa */serbot* para intentar de nuevo.`, mentions: m?.sender ? [m.sender] : [] },
            m?.sender ? { quoted: m } : {}
          ).catch(() => {});
        } catch {}
      }
      console.log(chalk.green(`✅ SubBot ${userId} desconectado`));
    }

    async function connectionUpdate(update) {
      const { connection, lastDisconnect, qr } = update;
      const currentSock = connectionManager.getSocket(userId);

      connectionManager.setConnection(userId, {
        ...connectionManager.getConnection(userId),
        lastUpdate: Date.now(),
      });

      if (qr && !useCode) {
        const attempts = connectionManager.getQrAttempts(userId);
        if (attempts >= SUBBOT_CONFIG.maxQrAttempts) {
          cleanupSubBot('max_qr');
          return;
        }
        connectionManager.incrementQrAttempts(userId);
        const currentAttempt = connectionManager.getQrAttempts(userId);
        const isLast = currentAttempt >= SUBBOT_CONFIG.maxQrAttempts;
        const caption = rtxQR() + `\n\n📊 Intento ${currentAttempt}/${SUBBOT_CONFIG.maxQrAttempts}` + (isLast ? '\n⚠️ *Último intento*' : '');
        if (m?.chat) await conn.sendMessage(m.chat,
          { image: await qrcode.toBuffer(qr, { scale: 8 }), caption },
          m?.sender ? { quoted: m } : {}
        ).catch(() => {});

        if (qrTimeoutId) clearTimeout(qrTimeoutId);
        qrTimeoutId = setTimeout(() => {
          if (!connectionEstablished) cleanupSubBot('qr_timeout');
        }, SUBBOT_CONFIG.qrTimeoutMs);
      }

      if (qr && useCode && !codeAlreadyRequested) {
        codeAlreadyRequested = true;
        if (m?.chat) await conn.sendMessage(m.chat,
          { text: rtxCode() },
          m?.sender ? { quoted: m } : {}
        ).catch(() => {});
        await new Promise(r => setTimeout(r, 3000));
        try {
          const secret = await currentSock.requestPairingCode(userId);
          const formatted = secret.match(/.{1,4}/g)?.join('-') || secret;
          if (m?.chat) await conn.sendMessage(m.chat, { text: `*Código:* ${formatted}` }, m?.sender ? { quoted: m } : {}).catch(() => {});
          qrTimeoutId = setTimeout(() => {
            if (!connectionEstablished) cleanupSubBot('code_timeout');
          }, SUBBOT_CONFIG.qrTimeoutMs);
        } catch (e) {
          console.error(chalk.red(`❌ Error obteniendo código para ${userId}:`), e.message);
          codeAlreadyRequested = false;
        }
      }

      if (connection === 'open') {
        connectionEstablished = true;
        if (qrTimeoutId) { clearTimeout(qrTimeoutId); qrTimeoutId = null; }

        connectionManager.setConnection(userId, { isConnecting: false, isConnected: true, reconnectAttempts: 0 });
        connectionManager.setSocket(userId, currentSock);

        if (!currentSock._printApplied) {
          const _origSend = currentSock.sendMessage.bind(currentSock);
          currentSock.sendMessage = async function (jid, msgContent, opts = {}) {
            const result = await _origSend(jid, msgContent, opts);
            try {
              const fakeMsg = {
                key: { fromMe: true, remoteJid: jid },
                fromMe: true,
                sender: currentSock.user?.jid,
                chat: jid,
                mtype: Object.keys(msgContent || {})[0] || 'unknown',
                messageTimestamp: Math.floor(Date.now() / 1000),
                text: msgContent?.text || msgContent?.caption || msgContent?.conversation || null,
                msg: msgContent
              };
              await printMessage(fakeMsg, currentSock);
            } catch {}
            return result;
          };
          currentSock._printApplied = true;
        }

        console.log(chalk.bold.cyanBright(`✅ SubBot ${userId} conectado`));
        if (m?.chat) await conn.sendMessage(m.chat,
          { text: '✅ SubBot conectado correctamente.', mentions: m?.sender ? [m.sender] : [] },
          m?.sender ? { quoted: m } : {}
        ).catch(() => {});

        ramMonitorId = setInterval(async () => {
          if (!connectionManager.isConnected(userId)) {
            clearInterval(ramMonitorId);
            ramMonitorId = null;
            return;
          }
          if (!await isRamAvailable()) {
            const { heapUsedMB: used, heapTotalMB: total } = await getRamStatus();
            const pct = total > 0 ? Math.round((used / total) * 100) : 0;
            console.log(chalk.red(`🚨 SubBot ${userId} detenido por RAM: ${pct}% (${used}MB/${total}MB)`));
            if (m?.chat) conn.sendMessage(m.chat,
              { text: `⚠️ Tu SubBot fue detenido por uso excesivo de RAM (${pct}%). Usa */serbot* para reconectar.`, mentions: m?.sender ? [m.sender] : [] },
              m?.sender ? { quoted: m } : {}
            ).catch(() => {});
            cleanupSubBot('ram_limit');
          }
        }, SUBBOT_CONFIG.ramMonitorIntervalMs);
        connectionManager.addCleanupTimer(userId, 'interval', ramMonitorId);
      }

      if (connection === 'close') {
        if (qrTimeoutId) { clearTimeout(qrTimeoutId); qrTimeoutId = null; }
        if (ramMonitorId) { clearInterval(ramMonitorId); ramMonitorId = null; }

        const code = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output?.statusCode
          : lastDisconnect?.error?.output?.statusCode;

        const state = connectionManager.getConnection(userId);
        const attempts = state?.reconnectAttempts || 0;

        if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
          console.log(chalk.red(`🚪 SubBot ${userId} sesión cerrada (${code})`));
          const userJid = `${userId}@s.whatsapp.net`;
          const notifyChat = m?.chat || userJid;
          const isBan = code === 401;
          const msg = isBan
            ? `🚫 Tu SubBot fue *baneado por WhatsApp*.\n\nEl número *+${userId}* fue bloqueado.\n🗑️ Sesión eliminada automáticamente.\n\nVincula otro número con */serbot*.`
            : `🚪 Sesión de SubBot cerrada.\n🗑️ Sesión eliminada.\n\nUsa */serbot* para volver a vincular.`;
          conn.sendMessage(notifyChat, { text: msg }, m?.sender ? { quoted: m } : {}).catch(() => {});
          cleanupSubBot('logged_out');
          return;
        }

        if (code === DisconnectReason.connectionReplaced) {
          cleanupSubBot('connection_replaced');
          return;
        }

        const reconnectable = [
          DisconnectReason.connectionClosed,
          DisconnectReason.connectionLost,
          DisconnectReason.restartRequired,
          DisconnectReason.timedOut,
        ].includes(code);

        if (reconnectable && attempts < SUBBOT_CONFIG.maxReconnectAttempts) {
          if (!await isRamAvailable()) {
            console.log(chalk.yellow(`⚠️ SubBot ${userId} no reconecta — RAM al límite`));
            cleanupSubBot('ram_limit_reconnect');
            return;
          }
          const delay = calculateBackoff(attempts);
          const newAttempts = attempts + 1;
          console.log(chalk.blue(`🔄 Reconectando ${userId} en ${Math.round(delay / 1000)}s (${newAttempts}/${SUBBOT_CONFIG.maxReconnectAttempts})`));
          connectionManager.setConnection(userId, { isConnecting: true, isConnected: false, reconnectAttempts: newAttempts });

          const t = setTimeout(async () => {
            try {
              const newSock = await makeWASocket(connectionOptions, { noStore: true });
              newSock.isSubBot = true;
              newSock.userId = userId;
              newSock.isInit = false;
              connectionManager.setSocket(userId, newSock);
              newSock.ev.on('connection.update', connectionUpdate);
              newSock.ev.on('creds.update', saveCreds);
              await reloadHandler(newSock);
            } catch (e) {
              console.error(chalk.red(`❌ Error reconectando ${userId}:`), e.message);
              cleanupSubBot('reconnect_error');
            }
          }, delay);
          connectionManager.addCleanupTimer(userId, 'timeout', t);
        } else {
          console.log(chalk.red(`💥 SubBot ${userId} no recuperable`));
          cleanupSubBot('unrecoverable');
        }
      }
    }

    async function reloadHandler(targetSock) {
      const s = targetSock || connectionManager.getSocket(userId);
      if (!s) return;

      if (s._handlerBound) {
        s.ev.off('messages.upsert', s._boundHandler);
      }

      const { handler: handlerFn } = await import('../handler.js');
      s._boundHandler = handlerFn.bind(s);
      s._handlerBound = true;
      s.ev.on('messages.upsert', async (msg) => {
        try { await s._boundHandler(msg); } catch (e) {
          console.error(`Error en handler subbot ${userId}:`, e.message);
        }
      });
    }

    sock.ev.on('connection.update', connectionUpdate);
    sock.ev.on('creds.update', saveCreds);
    await reloadHandler(sock);
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
      try {
        const { handleParticipantsUpdate } = await import('../lib/funcion/groupMetadata.js');
        const idioma = global?.db?.data?.chats[id]?.language || global.defaultLenguaje;
        const _translate = global.loadTranslation ? await global.loadTranslation(idioma) : {};
        const tradutor = _translate?.handler?.participantsUpdate ?? {};
        await handleParticipantsUpdate(
          sock, id, participants, action,
          global.loadDatabase,
          getConfig,
          global.db,
          idioma,
          tradutor,
          global.opts || {},
          global.groupCache
        );
      } catch (e) {
        console.error('[SubBot participants.update]', e.message);
      }
    });

  } catch (err) {
    console.error(chalk.red(`💥 Error iniciando SubBot ${userId}:`), err.message);
    connectionManager.removeConnection(userId);
    if (m?.chat) conn.sendMessage(m.chat,
      { text: `❌ Error iniciando SubBot: ${err.message}` },
      m?.sender ? { quoted: m } : {}
    ).catch(() => {});
  }
}
