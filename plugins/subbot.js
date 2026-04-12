import { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, jidNormalizedUser } from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import NodeCache from "node-cache";
import fs from "fs";
import path from "path";
import pino from "pino";
import chalk from "chalk";
import * as ws from "ws";
const { CONNECTING } = ws;
import { makeWASocket } from "../src/libraries/simple.js";
import { Boom } from "@hapi/boom";
import store from "../src/libraries/store.js";
import { connectionManager } from "../lib/funcion/connection-manager.js";

const SUBBOT_CONFIG = {
  messages: {
    welcome: global.welcomeSubbot || "👋 ¡Bienvenido/a! @user",
    bye: global.byeSubbot || "👋 ¡Hasta luego! @user",
    promote: global.promoteSubbot || "*@user Fue promovido a administrador.*",
    demote: global.demoteSubbot || "*@user Fue degradado de administrador.*",
    descUpdate: global.descUpdateSubbot || "*La descripción del grupo ha sido modificada.*",
    nameUpdate: global.nameUpdateSubbot || "*El nombre del grupo ha sido modificado.*",
    iconUpdate: global.iconUpdateSubbot || "*Se ha cambiado la foto de perfil del grupo.*",
    linkRevoke: global.linkRevokeSubbot || "*El enlace de invitación al grupo ha sido restablecido.*",
  },
  limits: {
    maxSubbots: 40,
    cooldownTime: 12000,
    maxReconnectAttempts: 5,
    sessionCleanupInterval: 300000,
    qrTimeout: 45000,
    maxQrAttempts: 2,
  },
};

const rtx = `🤖 *Luna-Bot Sub Bot*\n\n📱 *Escanea el código QR*\n\n*Pasos para vincular:*\n\n1 » Haz clic en los 3 puntos de la parte superior derecha\n\n2 » Toque en dispositivos vinculados\n\n3 » Escanea el código QR para iniciar sesión con el bot\n\n⚠️ *¡Este código QR expira en 45 segundos!*\n\n${global.dev || ""}`;

const rtx2 = `🤖 *Luna-Bot Sub Bot Code*\n\n✨ Usa este Código para convertirte en Sub-Bot Temporal.\n\n↱ Tres Puntitos\n↱ Dispositivos Vinculados\n↱ Vincular Dispositivo\n↱ Vincular con el número de teléfono.\n\n➤ *Importante:*\n» No es recomendable usar tu cuenta principal.\n» Si el Bot principal se reinicia, todos los Sub-Bots se desconectaran.\n\n${global.dev || ""}`;

const subbotOptions = {};

function calculateBackoffDelay(attempt) {
  const baseDelay = 1000;
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 1000;
  return delay + jitter;
}

const handlerCache = new Map();

async function loadHandlerSafely() {
  try {
    const timestamp = Date.now();
    if (handlerCache.has(timestamp)) {
      return handlerCache.get(timestamp);
    }

    const Handler = await import(`../handler.js?update=${timestamp}`);
    handlerCache.set(timestamp, Handler);

    if (handlerCache.size > 3) {
      const oldestKey = handlerCache.keys().next().value;
      handlerCache.delete(oldestKey);
    }

    return Handler;
  } catch (e) {
    console.error(chalk.red("❌ Error cargando handler:"), e.message);
    return null;
  }
}

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  let time = global.db.data.users[m.sender].Subs + SUBBOT_CONFIG.limits.cooldownTime;
  if (new Date() - global.db.data.users[m.sender].Subs < SUBBOT_CONFIG.limits.cooldownTime) {
    return conn.reply(m.chat, `⏳ Debes esperar ${msToTime(time - new Date())} para volver a intentar vincular un subbot.`, m);
  }

  if (connectionManager.getActiveConnectionCount() >= SUBBOT_CONFIG.limits.maxSubbots) {
    return m.reply("❌ No hay espacio disponible para sub-bots.");
  }

  let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender;

  let id;
  if (m.isGroup) {
    const groupMetadata = conn.chats[m.chat]?.metadata ||
      await conn.groupMetadata(m.chat).catch(_ => null) || {};
    const participants = groupMetadata.participants || [];
    const participantData = participants.find(u =>
      conn.decodeJid(u.id) === who ||
      u.id === who ||
      u.lid === who
    );
    id = (participantData?.id || who).split('@')[0];
  } else {
    id = who.split('@')[0];
  }

  if (!id) {
    return m.reply("❌ No se pudo resolver tu número.");
  }

  let subbotPath = path.join(`./sub-lunabot/`, id);

  if (connectionManager.isConnecting(id)) {
    return m.reply("⏳ Ya tienes una conexión en progreso. Por favor espera.");
  }

  if (connectionManager.isConnected(id)) {
    return m.reply("✅ Ya tienes un SubBot activo.");
  }

  if (!fs.existsSync(subbotPath)) {
    fs.mkdirSync(subbotPath, { recursive: true });
  }

  subbotOptions.subbotPath = subbotPath;
  subbotOptions.m = m;
  subbotOptions.conn = conn;
  subbotOptions.args = args;
  subbotOptions.usedPrefix = usedPrefix;
  subbotOptions.command = command;
  subbotOptions.senderPhone = id;
  initializeSubBot(subbotOptions);
  global.db.data.users[m.sender].Subs = new Date() * 1;
};

handler.command = ["jadibot", "serbot"];
handler.help = ["serbot", "serbot code"];
handler.tags = ["socket"];
export default handler;

export async function initializeSubBot(options) {
  let { subbotPath, m, conn, args, usedPrefix, command, senderPhone } = options;
  const userId = path.basename(subbotPath);

  connectionManager.setConnection(userId, {
    isConnecting: true,
    isConnected: false,
    reconnectAttempts: 0,
  });

  connectionManager.resetQrAttempts(userId);

  const mcode = args[0] && /(--code|code)/.test(args[0].trim()) ? true : args[1] && /(--code|code)/.test(args[1].trim()) ? true : false;
  let txtCode, codeBot, txtQR;
  let connectionEstablished = false;
  let qrTimeoutId = null;

  if (mcode) {
    args[0] = args[0].replace(/^--code$|^code$/, "").trim();
    if (args[1]) args[1] = args[1].replace(/^--code$|^code$/, "").trim();
    if (args[0] == "") args[0] = undefined;
  }

  const pathCreds = path.join(subbotPath, "creds.json");
  if (!fs.existsSync(subbotPath)) fs.mkdirSync(subbotPath, { recursive: true });

  if (args[0]) {
    try {
      const credsData = Buffer.from(args[0], "base64").toString("utf-8");
      fs.writeFileSync(pathCreds, JSON.stringify(JSON.parse(credsData), null, 2));
    } catch (e) {
      console.log(chalk.yellow("⚠️ Credenciales inválidas recibidas, ignorando"));
    }
  }

  if (fs.existsSync(pathCreds)) {
    try {
      let creds = JSON.parse(fs.readFileSync(pathCreds));
      const rawData = fs.readFileSync(pathCreds, "utf8");

      const hasImportantData = creds && (creds.me || creds.account || creds.signalIdentities || creds.noiseKey || creds.pairingEphemeralKeyPair || creds.signedIdentityKey || creds.registrationId || rawData.length > 500);

      if (hasImportantData) {
        console.log(chalk.green(`✅ Sesión válida: ${userId}`));
      } else if (creds && creds.registered === false && Object.keys(creds).length <= 2) {
        console.log(chalk.yellow(`🗑️ Eliminando sesión vacía: ${userId}`));
        fs.unlinkSync(pathCreds);
      }
    } catch (e) {
      console.log(chalk.yellow(`⚠️ Error leyendo credenciales para ${userId}`));
      try {
        const rawData = fs.readFileSync(pathCreds, "utf8");
        if (rawData.length < 30) {
          console.log(chalk.yellow(`🗑️ Eliminando credenciales corruptas: ${userId}`));
          fs.unlinkSync(pathCreds);
        }
      } catch (readError) {
        console.log(chalk.yellow(`🗑️ Eliminando archivo ilegible: ${userId}`));
        fs.unlinkSync(pathCreds);
      }
    }
  }

  try {
    let { version, isLatest } = await fetchLatestBaileysVersion();
    const msgRetryCounterMap = (MessageRetryMap) => {};
    const msgRetryCounterCache = new NodeCache();
    const { state, saveState, saveCreds } = await useMultiFileAuthState(subbotPath);

    const connectionOptions = {
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      mobile: false,
      browser: mcode ? ["Ubuntu", "Chrome", "110.0.5585.95"] : ["Luna-Bot (Sub Bot)", "Chrome", "2.0.0"],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      getMessage: async (clave) => {
        if (store) {
          let jid = jidNormalizedUser(clave.remoteJid);
          let msg = await store.loadMessage(jid, clave.id);
          return msg?.message || "";
        }
        return { conversation: "Luna-Bot" };
      },
      msgRetryCounterCache,
      msgRetryCounterMap,
      defaultQueryTimeoutMs: undefined,
      version: version,
    };

    let sock = makeWASocket(connectionOptions);
    sock.isInit = false;
    sock.well = false;
    sock.userId = userId;
    let isInit = true;

    connectionManager.setSocket(userId, sock);

    function cleanupConnection(sockToClean, userId, reason = "cleanup") {
      console.log(chalk.yellow(`🧹 Finalizando sesión de ${userId}`));

      if (qrTimeoutId) {
        clearTimeout(qrTimeoutId);
        qrTimeoutId = null;
      }

      try {
        if (sockToClean?.ws?.socket) {
          sockToClean.ws.close();
        }
      } catch (e) {}

      try {
        if (sockToClean?.ev) {
          sockToClean.ev.removeAllListeners();
        }
      } catch (e) {}

      connectionManager.removeConnection(userId);
      console.log(chalk.green(`✅ SubBot ${userId} desconectado`));
    }

    async function connectionUpdate(update) {
      const { connection, lastDisconnect, isNewLogin, qr } = update;
      global.stopped = connection;

      const currentState = connectionManager.getConnection(userId);
      if (currentState) {
        connectionManager.setConnection(userId, {
          ...currentState,
          lastUpdate: Date.now(),
        });
      }

      if (isNewLogin) sock.isInit = true;

      if (qr && !mcode) {
        const currentAttempts = connectionManager.getQrAttempts(userId);

        if (currentAttempts >= SUBBOT_CONFIG.limits.maxQrAttempts) {
          console.log(chalk.red(`❌ Máximo de intentos QR alcanzado: ${userId}`));
          await conn.sendMessage(
            m.chat,
            {
              text: `❌ No se pudo vincular el SubBot. Se enviaron ${SUBBOT_CONFIG.limits.maxQrAttempts} códigos QR pero no se conectó a tiempo.\n\nIntenta nuevamente usando el comando */serbot*`,
              mentions: [m.sender],
            },
            m?.sender ? { quoted: m } : {}
          );
          cleanupConnection(sock, userId, "max_qr_attempts");
          return;
        }

        const attemptNumber = connectionManager.incrementQrAttempts(userId);
        console.log(chalk.blue(`📤 Enviando código QR ${attemptNumber}/${SUBBOT_CONFIG.limits.maxQrAttempts} a ${userId}`));

        const qrMessage = attemptNumber === 1 ? rtx.trim() : rtx.trim() + `\n\n⚠️ *Último intento* - Si no escaneas este QR en 45 segundos, deberás usar */serbot* nuevamente.`;

        txtQR = await conn.sendMessage(m.chat, { image: await qrcode.toBuffer(qr, { scale: 8 }), caption: qrMessage }, m?.sender ? { quoted: m } : {});

        if (qrTimeoutId) clearTimeout(qrTimeoutId);

        qrTimeoutId = setTimeout(async () => {
          if (!connectionEstablished && connectionManager.getQrAttempts(userId) >= SUBBOT_CONFIG.limits.maxQrAttempts) {
            console.log(chalk.red(`⏰ Tiempo agotado para ${userId}`));
            await conn.sendMessage(
              m.chat,
              {
                text: `❌ Tiempo agotado para vincular el SubBot. No se conectó en el tiempo límite.\n\nIntenta nuevamente usando el comando */serbot*`,
                mentions: [m.sender],
              },
              m?.sender ? { quoted: m } : {}
            );
            cleanupConnection(sock, userId, "qr_timeout");
          }
        }, SUBBOT_CONFIG.limits.qrTimeout);

        return;
      }

      if (qr && mcode) {
        txtCode = await conn.sendMessage(m.chat, { text: rtx2 }, m?.sender ? { quoted: m } : {});
        await sleep(3000);
        let phoneForCode = senderPhone;
        if (!phoneForCode) {
          if (m.isGroup) {
            const gm = conn.chats[m.chat]?.metadata ||
              await conn.groupMetadata(m.chat).catch(_ => null) || {};
            const pt = (gm.participants || []).find(u =>
              conn.decodeJid(u.id) === m.sender ||
              u.id === m.sender ||
              u.lid === m.sender
            );
            phoneForCode = (pt?.id || m.sender).split('@')[0];
          } else {
            phoneForCode = m.sender.split('@')[0];
          }
        }
        let secret = await sock.requestPairingCode(phoneForCode);
        secret = secret.match(/.{1,4}/g)?.join("-");
        codeBot = await m.reply(secret);
      }

      const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode || lastDisconnect?.error?.statusCode || (lastDisconnect?.error instanceof Error ? "unknown_error" : "unknown");

      if (connection == "open") {
        connectionEstablished = true;

        if (qrTimeoutId) {
          clearTimeout(qrTimeoutId);
          qrTimeoutId = null;
        }

        connectionManager.setConnection(userId, {
          isConnecting: false,
          isConnected: true,
          reconnectAttempts: 0,
        });

        const nameOrNumber = conn.getName(`${path.basename(subbotPath)}@s.whatsapp.net`);
        const baseName = path.basename(subbotPath);
        const displayName = nameOrNumber.replace(/\D/g, "") === baseName ? `+${baseName}` : `${nameOrNumber} (${baseName})`;
        console.log(chalk.bold.cyanBright(`✅ ${displayName} conectado correctamente`));

        sock.isInit = true;

        if (m?.chat) {
          await conn.sendMessage(m.chat, { text: `✅ SubBot conectado correctamente.`, mentions: [m.sender] }, m?.sender ? { quoted: m } : {});
        }

        sock.welcome = SUBBOT_CONFIG.messages.welcome;
        sock.bye = SUBBOT_CONFIG.messages.bye;
        sock.spromote = SUBBOT_CONFIG.messages.promote;
        sock.sdemote = SUBBOT_CONFIG.messages.demote;
        sock.sDesc = SUBBOT_CONFIG.messages.descUpdate;
        sock.sSubject = SUBBOT_CONFIG.messages.nameUpdate;
        sock.sIcon = SUBBOT_CONFIG.messages.iconUpdate;
        sock.sRevoke = SUBBOT_CONFIG.messages.linkRevoke;
      }

      if (connection === "close") {
        if (qrTimeoutId) {
          clearTimeout(qrTimeoutId);
          qrTimeoutId = null;
        }

        const currentState = connectionManager.getConnection(userId);
        const reconnectAttempts = currentState?.reconnectAttempts || 0;
        const maxReconnectAttempts = SUBBOT_CONFIG.limits.maxReconnectAttempts;

        const shouldReconnect = (reason) => {
          const reconnectableReasons = [DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.restartRequired, DisconnectReason.timedOut];
          return reconnectableReasons.includes(reason) && reconnectAttempts < maxReconnectAttempts && !connectionEstablished;
        };

        connectionManager.setConnection(userId, {
          isConnecting: false,
          isConnected: false,
          reconnectAttempts: reconnectAttempts,
        });

        if (code === DisconnectReason.badSession) {
          console.log(chalk.red(`❌ Sesión inválida: ${userId}`));
          if (m) m.reply(`❌ La sesión se ha corrompido. Usa .deletebot y vuelve a vincular.`);
          cleanupConnection(sock, userId, "bad_session");
        } else if (code === DisconnectReason.loggedOut) {
          console.log(chalk.red(`🚪 Sesión cerrada: ${userId}`));
          if (m) m.reply(`🚪 Sesión cerrada. Usa .deletebot y vuelve a vincular.`);
          cleanupConnection(sock, userId, "logged_out");
        } else if (code === DisconnectReason.connectionReplaced) {
          console.log(chalk.yellow(`🔄 Conexión reemplazada: ${userId}`));
          cleanupConnection(sock, userId, "connection_replaced");
        } else if (shouldReconnect(code)) {
          const newAttempts = reconnectAttempts + 1;
          const delay = calculateBackoffDelay(newAttempts);

          console.log(chalk.blue(`🔄 Reconectando ${userId} en ${Math.round(delay / 1000)}s (${newAttempts}/${maxReconnectAttempts})`));

          connectionManager.setConnection(userId, {
            isConnecting: true,
            isConnected: false,
            reconnectAttempts: newAttempts,
          });

          const timeout = setTimeout(async () => {
            try {
              await reloadHandler(true);
            } catch (e) {
              console.error(chalk.red(`❌ Error reconectando ${userId}`));
              cleanupConnection(sock, userId, "reconnect_error");
            }
          }, delay);

          connectionManager.addCleanupTimer(userId, "timeout", timeout);
        } else {
          console.log(chalk.red(`💥 Error no recuperable: ${userId}`));
          cleanupConnection(sock, userId, "unrecoverable_error");
        }
      }
    }

    let reloadHandler = async function (restatConn) {
      const handlerModule = await loadHandlerSafely();
      if (!handlerModule) {
        console.error(chalk.red(`❌ No se pudo cargar handler para ${userId}`));
        return false;
      }

      if (restatConn) {
        const oldChats = sock.chats;
        try {
          if (sock.ev) {
            sock.ev.off("messages.upsert", sock.handler);
            sock.ev.off("connection.update", sock.connectionUpdate);
            sock.ev.off("creds.update", sock.credsUpdate);
          }
          if (sock.ws?.socket) sock.ws.close();
        } catch (e) {}

        sock = makeWASocket(connectionOptions, { chats: oldChats });
        sock.userId = userId;
        connectionManager.setSocket(userId, sock);
        isInit = true;
      }

      if (!isInit && sock.ev) {
        sock.ev.off("messages.upsert", sock.handler);
        sock.ev.off("connection.update", sock.connectionUpdate);
        sock.ev.off("creds.update", sock.credsUpdate);
      }

      sock.handler = handlerModule.handler.bind(sock);
      sock.connectionUpdate = connectionUpdate.bind(sock);
      sock.credsUpdate = saveCreds.bind(sock, true);

      sock.ev.on("messages.upsert", sock.handler);
      sock.ev.on("connection.update", sock.connectionUpdate);
      sock.ev.on("creds.update", sock.credsUpdate);
      isInit = false;
      return true;
    };

    await reloadHandler(false);
  } catch (error) {
    console.error(chalk.red(`💥 Error iniciando SubBot ${userId}:`), error.message);
    connectionManager.removeConnection(userId);
    if (m) m.reply(`❌ Error iniciando SubBot: ${error.message}`);
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  return minutes + " m y " + seconds + " s ";
}
