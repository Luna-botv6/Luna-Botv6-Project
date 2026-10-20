import { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import { makeWASocket } from '../../src/libraries/simple.js';
import { getRamStatus } from './connection-manager.js';
import * as manager from './subbot-manager.js';
import { conDbSubbot, instalarScopeSubbot, olvidarDbSubbot } from './subbot-db.js';
import { guardarIdentidad } from './subbot-seguridad.js';
import printMessage from '../../src/libraries/print.js';
import qrcode from 'qrcode';
import NodeCache from 'node-cache';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import chalk from 'chalk';
import { Boom } from '@hapi/boom';

const BOT = () => global.BotName || 'Luna';

const VERSION_TTL_MS = 60 * 60 * 1000;
const VERSION_FALLBACK = [2, 3000, 1051037982];
const CODE_MS = 120000;
let versionCache = null;
let versionCacheTs = 0;

async function obtenerVersion() {
  if (versionCache && Date.now() - versionCacheTs < VERSION_TTL_MS) return versionCache;
  let version = null;
  try {
    const r = await fetchLatestWaWebVersion();
    version = r?.version;
  } catch {}
  if (!Array.isArray(version) || version.length < 3) {
    try {
      const r = await fetchLatestBaileysVersion();
      version = r?.version;
    } catch {}
  }
  if (!Array.isArray(version) || version.length < 3) version = VERSION_FALLBACK;
  versionCache = version;
  versionCacheTs = Date.now();
  return version;
}

const rtxQR = (intento, max) => `🤖 *${BOT()} SubBot*\n\n📱 *Vinculación por QR*\n\n1 » WhatsApp ⋮ » Dispositivos vinculados\n2 » Vincular dispositivo\n3 » Escaneá este QR\n\n⏳ Vence en 45 segundos (intento ${intento}/${max})\n💡 ¿Preferís código? *.serbot <tu número> --code*`;

const rtxCodeIntro = () => `🤖 *${BOT()} SubBot*\n\n🔢 *Vinculación por código*\n\nEn tu celular: ⋮ » Dispositivos vinculados » *Vincular con número de teléfono*\n\nTe mando el código en el próximo mensaje ⏳`;

const rtxCode = (codigo) => `🔑 *Tu código:* ${codigo}\n\nEscribilo en tu celular para vincular.\n⏳ Vence en 2 minutos.`;

async function entregarVinculacion(conn, m, texto) {
  if (!m?.chat) {
    console.log(chalk.yellow(`[SubBot vinculación sin chat] ${String(texto).slice(0, 80)}`));
    return;
  }
  try {
    await conn.sendMessage(m.chat, { text: texto, mentions: m?.sender ? [m.sender] : [] }, m?.sender ? { quoted: m } : {});
  } catch (e) {
    console.log(chalk.yellow(`[SubBot no se pudo entregar vinculación] ${e.message}`));
  }
}

function evento(userId, texto) {
  console.log(chalk.cyan(`[SubBot ${userId}] ${texto}`));
  try { manager.registrarEvento(userId, texto); } catch {}
}

function rutaDe(userId, subbotPath) {
  return subbotPath || path.join('./sub-lunabot/', userId);
}

function limpiarCredsVacias(carpeta, userId) {
  const creds = path.join(carpeta, 'creds.json');
  if (!fs.existsSync(creds)) return;
  try {
    const raw = fs.readFileSync(creds, 'utf8');
    const datos = JSON.parse(raw);
    const vacia = !datos || (Object.keys(datos).length <= 2 && !datos.me && !datos.account && raw.length < 500);
    if (vacia) {
      fs.unlinkSync(creds);
      console.log(chalk.yellow(`🗑️ Sesión vacía eliminada: ${userId}`));
    }
  } catch {
    try { fs.unlinkSync(creds); } catch {}
  }
}

function engancharEventos(sock, ctx) {
  const { userId, conn, m } = ctx;

  sock.ev.on('connection.update', (update) => actualizarConexion(sock, update, ctx));

  sock.ev.on('creds.update', ctx.guardarCreds);

  sock.ev.on('group-participants.update', (ev) => {
    conDbSubbot(userId, async () => {
      try {
        if (typeof sock.participantsUpdate === 'function') return await sock.participantsUpdate(ev);
        const { handleParticipantsUpdate } = await import('./groupMetadata.js');
        const idioma = global?.db?.data?.chats[ev.id]?.language || global.defaultLenguaje;
        const _translate = global.loadTranslation ? await global.loadTranslation(idioma) : {};
        await handleParticipantsUpdate(sock, ev.id, ev.participants, ev.action, global.loadDatabase, (await import('../funcConfig.js')).getConfig, global.db, idioma, _translate?.handler?.participantsUpdate ?? {}, global.opts || {}, global.groupCache);
      } catch (e) {
        console.error('[SubBot participants.update]', e.message);
      }
    }).catch(() => {});
  });

  sock.ev.on('messages.delete', (ev) => {
    if (typeof sock.onDelete !== 'function') return;
    conDbSubbot(userId, () => sock.onDelete(ev)).catch(() => {});
  });

  if (typeof sock.onMsgUpdate === 'function') {
    sock.ev.on('messages.update', (ev) => {
      conDbSubbot(userId, () => sock.onMsgUpdate(ev)).catch(() => {});
    });
  }

  if (typeof sock.onCall === 'function') {
    sock.ev.on('call', (ev) => {
      conDbSubbot(userId, () => sock.onCall(ev)).catch(() => {});
    });
  }
}

async function fabricarSocket(ctx, opciones) {
  const sock = await makeWASocket(opciones, { noStore: true });
  sock.isSubBot = true;
  sock.userId = ctx.userId;
  sock.isInit = false;
  manager.ponerSocket(ctx.userId, sock);
  engancharEventos(sock, { ...ctx, guardarCreds: ctx.guardarCreds });
  await aplicarHandler(sock, ctx.userId);
  return sock;
}

async function aplicarHandler(sock, userId) {
  const { handler: handlerFn } = await import('../../handler.js');
  if (sock._manejadorSubbot) {
    try { sock.ev.off('messages.upsert', sock._manejadorSubbot); } catch {}
  }
  const enlazado = handlerFn.bind(sock);
  sock._manejadorSubbot = (msg) => {
    conDbSubbot(userId, () => enlazado(msg)).catch((e) => console.error(`Error en handler subbot ${userId}:`, e.message));
  };
  sock.ev.on('messages.upsert', sock._manejadorSubbot);
}

function aplicarPrint(sock) {
  if (sock._printAplicado) return;
  const original = sock.sendMessage.bind(sock);
  sock.sendMessage = async function (jid, contenido, opts = {}) {
    const r = await original(jid, contenido, opts);
    try {
      await printMessage({ key: { fromMe: true, remoteJid: jid }, fromMe: true, sender: sock.user?.jid, chat: jid, mtype: Object.keys(contenido || {})[0] || 'unknown', messageTimestamp: Math.floor(Date.now() / 1000), text: contenido?.text || contenido?.caption || contenido?.conversation || null, msg: contenido }, sock);
    } catch {}
    return r;
  };
  sock._printAplicado = true;
}

async function actualizarConexion(sock, update, ctx) {
  const { userId, conn, m, useCode, carpeta } = ctx;
  const { connection, lastDisconnect, qr } = update || {};
  if (manager.socketDe(userId) !== sock) return;

  if (qr && !useCode) {
    const intento = manager.sumarQr(userId);
    if (intento > manager.MAX_QR) {
      await finalizar(userId, ctx, 'max_qr', true);
      return;
    }
    try {
      const buf = await qrcode.toBuffer(qr, { scale: 8 });
      if (m?.chat) await conn.sendMessage(m.chat, { image: buf, caption: rtxQR(intento, manager.MAX_QR) }, m?.sender ? { quoted: m } : {}).catch(() => {});
    } catch {}
    programarVencimiento(ctx, 'qr_timeout');
    return;
  }

  if (qr && useCode && !ctx.codigoPedido) {
    ctx.codigoPedido = true;
    await entregarVinculacion(conn, m, rtxCodeIntro());
    await new Promise(r => setTimeout(r, 2500));
    for (let i = 0; i < 2; i++) {
      try {
        const secreto = await manager.socketDe(userId).requestPairingCode(userId);
        const lindo = secreto.match(/.{1,4}/g)?.join('-') || secreto;
        await entregarVinculacion(conn, m, rtxCode(lindo));
        programarVencimiento(ctx, 'code_timeout', CODE_MS);
        break;
      } catch (e) {
        console.error(chalk.red(`❌ Error código ${userId} (intento ${i + 1}):`), e.message);
        if (i === 1) {
          ctx.codigoPedido = false;
          await entregarVinculacion(conn, m, '❌ No pude generar el código. Probá de nuevo con *.serbot*.');
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    return;
  }

  if (connection === 'open') {
    ctx.conectado = true;
    if (ctx.vencimiento) { clearTimeout(ctx.vencimiento); ctx.vencimiento = null; }
    instalarScopeSubbot();
    manager.marcar(userId, { isConnecting: false, isConnected: true, reintentos: 0 });
    manager.ponerSocket(userId, sock);
    aplicarPrint(sock);
    console.log(chalk.bold.cyanBright(`✅ SubBot ${userId} conectado`));
    evento(userId, 'conectado ✅');
    manager.alLimiteRam(userId, async ({ heapUsedMB, heapTotalMB }) => {
      const pct = heapTotalMB > 0 ? Math.round((heapUsedMB / heapTotalMB) * 100) : 0;
      console.log(chalk.red(`🚨 SubBot ${userId} detenido por RAM: ${pct}%`));
      evento(userId, `pausado por RAM alta (${pct}%), reanudo solo`);
      await finalizar(userId, ctx, 'ram_pausa', false);
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 5 * 60 * 1000));
        if (manager.conectado(userId) || manager.conectando(userId)) return;
        if (!fs.existsSync(path.join(carpeta, 'creds.json'))) return;
        if (!await manager.hayEspacio()) continue;
        try {
          console.log(chalk.blue(`🔄 Reanudando ${userId} tras pausa por RAM`));
          await crearSubbot({ subbotPath: carpeta, conn, userId });
          return;
        } catch {}
      }
      evento(userId, 'no se pudo reanudar solo tras pausa por RAM');
    });
    return;
  }

  if (connection === 'close') {
    if (ctx.vencimiento) { clearTimeout(ctx.vencimiento); ctx.vencimiento = null; }
    const code = (lastDisconnect?.error instanceof Boom) ? lastDisconnect.error.output?.statusCode : lastDisconnect?.error?.output?.statusCode;
    const estado = manager.obtener(userId);
    const intentos = estado?.reintentos || 0;

    if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
      const baneado = code === 401;
      console.log(chalk.red(`🚪 SubBot ${userId} sesión cerrada (${code})`));
      evento(userId, baneado ? 'número bloqueado por WhatsApp, sesión eliminada' : 'sesión cerrada, carpeta eliminada');
      await finalizar(userId, ctx, 'logged_out', true);
      return;
    }

    if (code === DisconnectReason.connectionReplaced) {
      await finalizar(userId, ctx, 'reemplazado', false);
      return;
    }

    const reintentable = [DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.restartRequired, DisconnectReason.timedOut].includes(code);
    if (reintentable && intentos < manager.MAX_REINTENTOS) {
      const { heapFreeMB } = await getRamStatus().catch(() => ({ heapFreeMB: 999 }));
      if (heapFreeMB < 30) {
        console.log(chalk.yellow(`⚠️ SubBot ${userId} no reconecta — RAM al límite`));
        await finalizar(userId, ctx, 'ram_reintento', false);
        return;
      }
      const espera = manager.backoffMs(intentos);
      console.log(chalk.blue(`🔄 Reconectando ${userId} en ${Math.round(espera / 1000)}s (${intentos + 1}/${manager.MAX_REINTENTOS})`));
      manager.marcar(userId, { isConnecting: true, isConnected: false, reintentos: intentos + 1 });
      const t = setTimeout(async () => {
        try {
          manager.cerrarSocket(manager.socketDe(userId));
          await fabricarSocket(ctx, ctx.opciones);
        } catch (e) {
          console.error(chalk.red(`❌ Error reconectando ${userId}:`), e.message);
          await finalizar(userId, ctx, 'error_reintento', false);
        }
      }, espera);
      manager.temporizador(userId, t);
      return;
    }

    console.log(chalk.red(`💥 SubBot ${userId} no recuperable (código ${code})`));
    evento(userId, `desconectado irrecuperable (código ${code})`);
    if (code === 405) {
      await entregarVinculacion(conn, m, '❌ WhatsApp rechazó la vinculación (cliente desactualizado). Probá de nuevo en unos minutos.');
    }
    await finalizar(userId, ctx, 'irrecuperable', false);
  }
}

function programarVencimiento(ctx, motivo, ms = manager.QR_MS) {
  if (ctx.vencimiento) clearTimeout(ctx.vencimiento);
  ctx.vencimiento = setTimeout(async () => {
    if (!ctx.conectado) await finalizar(ctx.userId, ctx, motivo, true);
  }, ms);
  manager.temporizador(ctx.userId, ctx.vencimiento);
}

async function finalizar(userId, ctx, motivo, borrarCarpeta) {
  console.log(chalk.yellow(`🧹 Finalizando SubBot ${userId} (${motivo})`));
  if (ctx?.vencimiento) { clearTimeout(ctx.vencimiento); ctx.vencimiento = null; }
  manager.quitar(userId);
  olvidarDbSubbot(userId);
  if (borrarCarpeta && ctx?.carpeta) {
    try {
      fs.rmSync(ctx.carpeta, { recursive: true, force: true });
      console.log(chalk.yellow(`🗑️ Carpeta eliminada: ${ctx.carpeta}`));
    } catch {}
  }
  console.log(chalk.green(`✅ SubBot ${userId} desconectado`));
}

export async function crearSubbot({ subbotPath, m, conn, args = [], userId, dueno = null, useCode: useCodeParam = null }) {
  userId = userId || (subbotPath ? path.basename(subbotPath) : null);
  if (!userId) throw new Error('Falta userId del SubBot');
  const carpeta = rutaDe(userId, subbotPath);
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
  limpiarCredsVacias(carpeta, userId);
  if (dueno || m?.sender) {
    try { guardarIdentidad(userId, { dueno: dueno || m.sender }); } catch {}
  }

  manager.registrar(userId, { isConnecting: true, isConnected: false, reintentos: 0 });
  manager.resetQr(userId);

  const useCode = typeof useCodeParam === 'boolean' ? useCodeParam : (args || []).some(a => /(--code|^code$)/.test(String(a || '').trim()));
  const version = await obtenerVersion();
  const { state, saveCreds } = await useMultiFileAuthState(carpeta);
  const opciones = {
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    mobile: false,
    browser: useCode ? ['Windows', 'Chrome', '149.0.7827.197'] : [`${BOT()} SubBot`, 'Chrome', '2.0.0'],
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async () => ({ conversation: BOT() }),
    msgRetryCounterCache: new NodeCache(),
    defaultQueryTimeoutMs: undefined
  };

  const ctx = { userId, conn, m, useCode, carpeta, opciones, guardarCreds: saveCreds, conectado: false, codigoPedido: false, vencimiento: null };

  try {
    await fabricarSocket(ctx, opciones);
  } catch (err) {
    console.error(chalk.red(`💥 Error iniciando SubBot ${userId}:`), err.message);
    manager.quitar(userId);
    await entregarVinculacion(conn, m, `❌ Error iniciando SubBot: ${err.message}`);
  }
  return true;
}
