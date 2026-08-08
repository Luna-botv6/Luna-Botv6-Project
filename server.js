import express from 'express';
import {createServer} from 'http';
import {toBuffer} from 'qrcode';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import {connectionManager} from './lib/funcion/connection-manager.js';
import {getAllPermissions, setGroupDownloadEnabled} from './lib/funcion/group-permissions.js';
import {getRecentDownloads} from './lib/funcion/download-log.js';
import {isRegistered, verifyCredentials} from './lib/funcion/panel-auth.js';
import {getConfig, setConfig} from './lib/funcConfig.js';
import {addWarning, removeWarning, resetWarnings, listWarnings} from './lib/advertencias.js';
import {startCloudflareTunnel} from './lib/funcion/cloudflare-tunnel.js';

const GROUP_FUNCTIONS = {
  welcome: 'Bienvenida',
  bye: 'Despedida',
  modoadmin: 'Modo admin',
  antiLink: 'Anti link',
  antiLink2: 'Anti link (extra)',
  antidelete: 'Anti borrado',
  antiToxic: 'Anti tóxico',
  antiviewonce: 'Anti view-once',
  detect: 'Detección',
  detect2: 'Detección (extra)',
  autosticker: 'Auto sticker',
  audios: 'Audios en grupo',
  afkAllowed: 'AFK'
};

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

const loginStrikes = new Map();
const STRIKE_LOCKOUT_TIERS = [
  {strikes: 60, lockMs: 24 * 60 * 60 * 1000},
  {strikes: 30, lockMs: 60 * 60 * 1000},
  {strikes: 15, lockMs: 15 * 60 * 1000}
];

function getStrikeLockout(ip) {
  const record = loginStrikes.get(ip);
  if (!record) return 0;
  if (record.lockUntil && record.lockUntil > Date.now()) return record.lockUntil;
  return 0;
}

function isLoginRateLimited(ip) {
  if (getStrikeLockout(ip) > Date.now()) return true;
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter((t) => now - t < LOGIN_WINDOW_MS);
  if (attempts.length === 0) {
    loginAttempts.delete(ip);
  } else {
    loginAttempts.set(ip, attempts);
  }
  return attempts.length >= LOGIN_MAX_ATTEMPTS;
}

function registerFailedLogin(ip) {
  const attempts = loginAttempts.get(ip) || [];
  attempts.push(Date.now());
  loginAttempts.set(ip, attempts);

  const record = loginStrikes.get(ip) || {count: 0, lockUntil: 0};
  record.count += 1;
  for (const tier of STRIKE_LOCKOUT_TIERS) {
    if (record.count >= tier.strikes) {
      record.lockUntil = Date.now() + tier.lockMs;
      break;
    }
  }
  loginStrikes.set(ip, record);
}

function clearLoginStrikes(ip) {
  loginStrikes.delete(ip);
  loginAttempts.delete(ip);
}

function requirePanelAuth(req, res, next) {
  const user = req.headers['x-panel-user'];
  const pass = req.headers['x-panel-pass'];
  if (!verifyCredentials(user, pass)) return res.status(401).json({ok: false});
  next();
}

function listSubbotsData() {
  const subBotDir = './sub-lunabot/';
  if (!fs.existsSync(subBotDir)) return [];
  const userDirs = fs.readdirSync(subBotDir);
  const subbots = [];
  for (const dirName of userDirs) {
    const userPath = path.join(subBotDir, dirName);
    const credsPath = path.join(userPath, 'creds.json');
    if (!fs.statSync(userPath).isDirectory()) continue;
    if (!fs.existsSync(credsPath)) continue;
    let creds;
    try {
      creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    } catch {
      continue;
    }
    if (!creds.me) continue;
    let realNumber;
    if (creds.me.jid && !creds.me.jid.endsWith('@lid')) {
      realNumber = creds.me.jid.split('@')[0];
    } else {
      realNumber = dirName;
    }
    subbots.push({
      dirName,
      number: realNumber,
      connected: !!connectionManager.isConnected(dirName)
    });
  }
  return subbots;
}

async function disconnectSubbot(dirName) {
  const sock = connectionManager.getSocket(dirName);
  if (sock) {
    try {
      await sock.logout();
    } catch {}
    try {
      sock.end(new Error('Panel: desconexión manual'));
    } catch {}
  }
  connectionManager.removeConnection(dirName);
}

const GROUPS_CACHE_TTL_MS = 30 * 1000;
let groupsCache = {data: null, fetchedAt: 0};

async function getGroupsCached() {
  const now = Date.now();
  if (!groupsCache.data || now - groupsCache.fetchedAt > GROUPS_CACHE_TTL_MS) {
    groupsCache.data = await global.conn.groupFetchAllParticipating();
    groupsCache.fetchedAt = now;
  }
  return groupsCache.data;
}

function normalizeUserJid(jid) {
  if (!jid) return jid;
  if (jid.includes('@')) return jid;
  return jid.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
}

async function blockUserCascade(jid) {
  const metodos = [
    async () => {
      await global.conn.updateBlockStatus(jid, 'block');
      return true;
    },
    async () => {
      await global.conn.query({
        tag: 'iq',
        attrs: {type: 'set', xmlns: 'blocklist', to: '@s.whatsapp.net'},
        content: [{tag: 'item', attrs: {action: 'block', jid}}]
      });
      return true;
    },
    async () => {
      if (typeof global.conn.blockUser === 'function') {
        await global.conn.blockUser(jid);
        return true;
      }
      return false;
    }
  ];
  for (const metodo of metodos) {
    try {
      if (await metodo()) return true;
    } catch {}
  }
  return false;
}

let _qr = 'El código QR es invalido, posiblemente ya se escaneo el código QR.';
let qrListenerBoundTo = null;

function ensureQrListenerAttached() {
  if (global.conn && global.conn !== qrListenerBoundTo) {
    global.conn.ev.on('connection.update', function appQR({qr}) {
      if (qr) _qr = qr;
    });
    qrListenerBoundTo = global.conn;
  }
}

function connect(conn, PORT) {
  const app = global.app = express();
  const server = global.server = createServer(app);
  app.use(express.json({limit: '20mb'}));

  ensureQrListenerAttached();
  setInterval(ensureQrListenerAttached, 5000);

  app.get('/panel/ping', requirePanelAuth, (req, res) => {
    res.json({ok: true, port: PORT});
  });

  app.get('/panel', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'src/libraries/base/dashboard.html'));
  });

  app.get('/panel/registered', (req, res) => {
    res.json({ok: true, registered: isRegistered()});
  });

  app.post('/panel/login', (req, res) => {
    const ip = req.ip;
    if (isLoginRateLimited(ip)) {
      const lockUntil = getStrikeLockout(ip);
      const error = lockUntil > Date.now()
        ? `Demasiados intentos fallidos. Esperá ${Math.ceil((lockUntil - Date.now()) / 60000)} minuto(s) y volvé a intentar.`
        : 'Demasiados intentos. Esperá un minuto y volvé a intentar.';
      return res.status(429).json({ok: false, error});
    }
    const {username, password} = req.body || {};
    if (!verifyCredentials(username, password)) {
      registerFailedLogin(ip);
      return res.status(401).json({ok: false});
    }
    clearLoginStrikes(ip);
    res.json({ok: true});
  });

  app.get('/panel/subbots', requirePanelAuth, (req, res) => {
    res.json({ok: true, subbots: listSubbotsData()});
  });

  app.post('/panel/subbots/:dirName/disconnect', requirePanelAuth, async (req, res) => {
    await disconnectSubbot(req.params.dirName);
    res.json({ok: true});
  });

  app.post('/panel/subbots/:dirName/delete', requirePanelAuth, async (req, res) => {
    await disconnectSubbot(req.params.dirName);
    const userPath = path.join('./sub-lunabot/', req.params.dirName);
    try {
      fs.rmSync(userPath, {recursive: true, force: true});
    } catch {}
    res.json({ok: true});
  });

  app.get('/panel/groups', requirePanelAuth, async (req, res) => {
    try {
      const groupsObj = await getGroupsCached();
      const permissions = getAllPermissions();
      const allGroups = Object.entries(groupsObj).map(([jid, meta]) => ({
        jid,
        name: meta.subject || jid,
        participants: meta.participants?.length || 0,
        enabled: jid in permissions ? !!permissions[jid] : true,
        banned: !!(getConfig(jid) || {}).isBanned
      }));
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 50));
      const start = (page - 1) * pageSize;
      const paged = allGroups.slice(start, start + pageSize);
      res.json({
        ok: true,
        groups: paged,
        total: allGroups.length,
        enabledCount: allGroups.filter((g) => g.enabled).length,
        page,
        pageSize,
        hasMore: start + pageSize < allGroups.length
      });
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.get('/panel/groups/:jid/status', requirePanelAuth, async (req, res) => {
    try {
      const {jid} = req.params;
      const groupsObj = await getGroupsCached();
      const meta = groupsObj[jid];
      if (!meta) return res.status(404).json({ok: false, error: 'Grupo no encontrado'});
      const permissions = getAllPermissions();
      res.json({
        ok: true,
        jid,
        name: meta.subject || jid,
        participants: meta.participants?.length || 0,
        enabled: jid in permissions ? !!permissions[jid] : true,
        banned: !!(getConfig(jid) || {}).isBanned
      });
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.get('/panel/groups/names', requirePanelAuth, async (req, res) => {
    try {
      const groupsObj = await getGroupsCached();
      const groups = Object.entries(groupsObj).map(([jid, meta]) => ({jid, name: meta.subject || jid}));
      res.json({ok: true, groups});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.post('/panel/groups/:jid/toggle', requirePanelAuth, (req, res) => {
    const {jid} = req.params;
    const {enabled} = req.body || {};
    setGroupDownloadEnabled(jid, enabled);
    res.json({ok: true});
  });

  app.get('/panel/downloads', requirePanelAuth, (req, res) => {
    res.json({ok: true, downloads: getRecentDownloads()});
  });

  app.get('/panel/groups/:jid/functions', requirePanelAuth, (req, res) => {
    const {jid} = req.params;
    const chatConfig = getConfig(jid) || {};
    const functions = Object.entries(GROUP_FUNCTIONS).map(([key, label]) => ({
      key,
      label,
      enabled: !!chatConfig[key]
    }));
    res.json({ok: true, functions});
  });

  app.post('/panel/groups/:jid/functions', requirePanelAuth, async (req, res) => {
    const {jid} = req.params;
    const {key, enabled} = req.body || {};
    if (!GROUP_FUNCTIONS[key]) return res.status(400).json({ok: false, error: 'Función inválida'});
    const chatConfig = getConfig(jid) || {};
    chatConfig[key] = !!enabled;
    setConfig(jid, chatConfig);
    try {
      await global.conn.sendMessage(jid, {
        text: `⚙️ *${GROUP_FUNCTIONS[key]}* fue ${enabled ? 'activada ✅' : 'desactivada ❌'} desde el panel del owner.`
      });
    } catch {}
    res.json({ok: true});
  });

  app.post('/panel/groups/:jid/ban', requirePanelAuth, async (req, res) => {
    const {jid} = req.params;
    try {
      const chatConfig = getConfig(jid) || {};
      chatConfig.isBanned = true;
      setConfig(jid, chatConfig);
      try {
        await global.conn.sendMessage(jid, {
          text: '🚫 Este grupo fue baneado por el owner desde el panel. El bot no va a responder acá hasta que lo desbaneen.'
        });
      } catch {}
      res.json({ok: true});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.post('/panel/groups/:jid/unban', requirePanelAuth, async (req, res) => {
    const {jid} = req.params;
    try {
      const chatConfig = getConfig(jid) || {};
      chatConfig.isBanned = false;
      setConfig(jid, chatConfig);
      try {
        await global.conn.sendMessage(jid, {
          text: '✅ Este grupo fue desbaneado por el owner desde el panel. El bot vuelve a responder normalmente acá.'
        });
      } catch {}
      res.json({ok: true});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.post('/panel/groups/:jid/leave', requirePanelAuth, async (req, res) => {
    const {jid} = req.params;
    try {
      await global.conn.groupLeave(jid);
      groupsCache.data = null;
      res.json({ok: true});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  let lastChatSendAt = 0;
  const CHAT_SEND_COOLDOWN_MS = 5000;

  app.post('/panel/chat/send', requirePanelAuth, async (req, res) => {
    const now = Date.now();
    if (now - lastChatSendAt < CHAT_SEND_COOLDOWN_MS) {
      return res.status(429).json({ok: false, error: 'Esperá unos segundos antes de mandar otro mensaje.'});
    }
    const {jid, message, media, mentionAll} = req.body || {};
    if (!jid || (!message && !media)) return res.status(400).json({ok: false, error: 'Falta jid o contenido'});
    try {
      let extraOptions = {};
      if (mentionAll) {
        const groupsObj = await getGroupsCached();
        const meta = groupsObj[jid];
        const jids = (meta?.participants || []).map((p) => p.id).filter(Boolean);
        extraOptions = {mentions: jids, mentionAll: true};
      }
      if (media && media.data && media.mimetype) {
        const buffer = Buffer.from(media.data, 'base64');
        const isVideo = media.mimetype.startsWith('video/');
        const payload = isVideo
          ? {video: buffer, mimetype: media.mimetype, caption: message || undefined, ...extraOptions}
          : {image: buffer, mimetype: media.mimetype, caption: message || undefined, ...extraOptions};
        await global.conn.sendMessage(jid, payload);
      } else {
        await global.conn.sendMessage(jid, {text: message, ...extraOptions});
      }
      lastChatSendAt = now;
      res.json({ok: true});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.post('/panel/groups/:jid/poll', requirePanelAuth, async (req, res) => {
    const {jid} = req.params;
    const {question, options} = req.body || {};
    const cleanOptions = Array.isArray(options) ? options.map((o) => String(o || '').trim()).filter(Boolean) : [];
    if (!question || !question.trim()) return res.status(400).json({ok: false, error: 'Falta la pregunta'});
    if (cleanOptions.length < 2 || cleanOptions.length > 12) {
      return res.status(400).json({ok: false, error: 'Necesitás entre 2 y 12 opciones'});
    }
    try {
      await global.conn.sendMessage(jid, {
        poll: {
          name: question.trim(),
          values: cleanOptions,
          selectableCount: 1
        }
      });
      res.json({ok: true});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.get('/panel/users', requirePanelAuth, async (req, res) => {
    const users = global.db?.data?.users || {};
    const search = (req.query.search || '').replace(/[^0-9]/g, '');
    let allJids = Object.keys(users);
    if (search) allJids = allJids.filter((jid) => jid.includes(search));

    const warned = await listWarnings();
    const warnMap = new Map(warned.map((w) => [w.id, w.warns]));

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 50));
    const start = (page - 1) * pageSize;
    const pagedJids = allJids.slice(start, start + pageSize);

    const list = pagedJids.map((jid) => ({
      jid,
      banned: !!users[jid]?.banned,
      warns: warnMap.get(jid) || 0
    }));

    res.json({
      ok: true,
      users: list,
      total: allJids.length,
      page,
      pageSize,
      hasMore: start + pageSize < allJids.length
    });
  });

  app.get('/panel/users/:jid', requirePanelAuth, async (req, res) => {
    const jid = normalizeUserJid(req.params.jid);
    const users = global.db?.data?.users || {};
    const warned = await listWarnings();
    const warnEntry = warned.find((w) => w.id === jid);
    let blocked = false;
    try {
      const blocklist = await global.conn.fetchBlocklist();
      blocked = Array.isArray(blocklist) && blocklist.includes(jid);
    } catch {}
    res.json({
      ok: true,
      jid,
      banned: !!users[jid]?.banned,
      warns: warnEntry?.warns || 0,
      reasons: warnEntry?.reasons || [],
      blocked
    });
  });

  app.get('/panel/blocklist', requirePanelAuth, async (req, res) => {
    try {
      const blocklist = await global.conn.fetchBlocklist();
      res.json({ok: true, blocked: Array.isArray(blocklist) ? blocklist : []});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.post('/panel/users/:jid/ban', requirePanelAuth, (req, res) => {
    const jid = normalizeUserJid(req.params.jid);
    if (!global.db.data.users[jid]) global.db.data.users[jid] = {};
    global.db.data.users[jid].banned = true;
    res.json({ok: true});
  });

  app.post('/panel/users/:jid/unban', requirePanelAuth, (req, res) => {
    const jid = normalizeUserJid(req.params.jid);
    if (!global.db.data.users[jid]) global.db.data.users[jid] = {};
    global.db.data.users[jid].banned = false;
    res.json({ok: true});
  });

  app.post('/panel/users/:jid/block', requirePanelAuth, async (req, res) => {
    const jid = normalizeUserJid(req.params.jid);
    try {
      const success = await blockUserCascade(jid);
      if (!success) return res.status(500).json({ok: false, error: 'WhatsApp rechazó el bloqueo. Probá bloquearlo manualmente desde el celular principal.'});
      res.json({ok: true});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.post('/panel/users/:jid/unblock', requirePanelAuth, async (req, res) => {
    const jid = normalizeUserJid(req.params.jid);
    try {
      await global.conn.updateBlockStatus(jid, 'unblock');
      res.json({ok: true});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.post('/panel/users/:jid/warn', requirePanelAuth, async (req, res) => {
    const jid = normalizeUserJid(req.params.jid);
    const reason = (req.body?.reason || 'Sin motivo').trim();
    try {
      const warns = await addWarning(jid, reason, 'Panel', 'panel');
      res.json({ok: true, warns});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.post('/panel/users/:jid/unwarn', requirePanelAuth, async (req, res) => {
    const jid = normalizeUserJid(req.params.jid);
    try {
      const warns = await removeWarning(jid);
      res.json({ok: true, warns});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.post('/panel/users/:jid/reset-warnings', requirePanelAuth, async (req, res) => {
    const jid = normalizeUserJid(req.params.jid);
    try {
      await resetWarnings(jid);
      res.json({ok: true});
    } catch (e) {
      res.status(500).json({ok: false, error: e.message});
    }
  });

  app.use(async (req, res) => {
    res.setHeader('content-type', 'image/png');
    res.end(await toBuffer(_qr));
  });

  server.listen(PORT, () => {
    console.log('[ ℹ️ ] Panel y QR listos (ignorar si ya escaneo el código QR)');
    startCloudflareTunnel(PORT);
    if (opts['keepalive']) keepAlive();
  });
}

function keepAlive() {
  const url = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  if (/(\/\/|\.)undefined\./.test(url)) return;
  setInterval(() => {
    fetch(url).catch(() => {});
  }, 5 * 1000 * 60);
}

export default connect;
