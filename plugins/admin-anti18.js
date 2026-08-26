import { getConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';
import { addWarning, resetWarnings } from '../lib/advertencias.js';
import { createHash } from 'crypto';
import fs from 'fs';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js';

const SERVER_URL = 'https://project-via.boxmine.xyz';
const API_KEY = cargarOGenerarAPIKey();

const MAX_WARNS = 3;

const CACHE_PATH = './database/anti18-cache.json';
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_SAVE_DEBOUNCE_MS = 3000;
const MAX_CONCURRENT_CLASSIFY = 2;

const FRASES_OWNER = [
  'Uhmm... enviaste algo que no está permitido pero sos mi creador/a 😳 no te lo voy a borrar pero por favor dá el ejemplo 💢',
  'Uhmm te pasaste, activaste una función para bloquear contenido +18 pero sos owner y no te lo puedo borrar porque fui configurada así 😠 se supone que debés dar el ejemplo!! 💢',
  'Ay ay ay creador/a mío/a... justo vos mandando esto 😤 no te lo elimino porque no tengo permiso, pero quedó anotado en mi corazoncito de bot 💢',
  'Con que vos también, eh? 🙄 no te voy a borrar nada porque sos mi owner, pero la próxima da el ejemplo por favor 😠',
  'Owner activando anti18 y owner rompiendo anti18 en el mismo día... la ironía 😑 no te elimino nada, pero casi casi 💢',
  'No puedo hacer nada porque sos vos quien me programó así 🙃 igual quiero que sepas que estoy un poquito decepcionada 💢',
  'Che, en serio? Justo el/la que me armó mandando esto 😤 te libro esta, pero no abuses eh',
  'Uhmm... esto va contra mis reglas pero contra vos no puedo actuar 😔 solo te dejo en claro que no está bueno 💢'
];

const FRASES_ADMIN = [
  'Uhmm... enviaste algo que no está permitido pero sos admin, así que no te lo puedo borrar 😠 pero la próxima ojo eh 💢',
  'Justo el/la admin mandando +18... 🙄 no te elimino nada porque tenés el rango, pero se supone que tenés que dar el ejemplo!! 💢',
  'Ehh admin, esto no se hace 😤 no te lo borro porque sos rango alto, pero quedó anotado 💢',
  'Con permisos de admin te salvás del borrado, pero no de mi cara de enojada 😑💢',
  'Uhmm... siendo admin deberías cuidar más el grupo, no ensuciarlo 😠 no te elimino nada, pero avisado quedás',
  'Los admins también tienen que respetar las reglas eh 💢 esta vez no borro nada porque no puedo, pero no te acostumbres',
  'Che admin, con el poder viene la responsabilidad 🙃 no te toco el mensaje, pero dá el ejemplo la próxima porfa',
  'Uhmm... siendo vos quien modera el grupo, esto queda medio raro no? 😤 no elimino nada, pero atenti'
];

function elegirFrase(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

const _cache = new Map();
let _cacheLoaded = false;
let _saveTimer = null;

function ensureDatabaseDir() {
  if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
  }
}

function loadCache() {
  if (_cacheLoaded) return;
  _cacheLoaded = true;

  try {
    ensureDatabaseDir();
    if (!fs.existsSync(CACHE_PATH)) return;

    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    const data = JSON.parse(raw);
    const now = Date.now();

    for (const [hash, entry] of Object.entries(data)) {
      if (entry && typeof entry.ts === 'number' && (now - entry.ts) < CACHE_TTL_MS) {
        _cache.set(hash, entry);
      }
    }
  } catch (e) {
    console.error('[anti18] error cargando cache:', e.message);
  }
}

function scheduleSaveCache() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    persistCache();
  }, CACHE_SAVE_DEBOUNCE_MS);
}

function persistCache() {
  try {
    ensureDatabaseDir();
    const now = Date.now();
    const obj = {};
    for (const [hash, entry] of _cache.entries()) {
      if ((now - entry.ts) < CACHE_TTL_MS) obj[hash] = entry;
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('[anti18] error guardando cache:', e.message);
  }
}

function hashBuffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function getCachedResult(hash) {
  loadCache();
  const entry = _cache.get(hash);
  if (!entry) return null;
  if ((Date.now() - entry.ts) >= CACHE_TTL_MS) {
    _cache.delete(hash);
    return null;
  }
  return entry.flagged;
}

function setCachedResult(hash, flagged) {
  loadCache();
  _cache.set(hash, { flagged, ts: Date.now() });
  scheduleSaveCache();
}

const MAX_PROCESSED_IDS = 200;
const PROCESSED_TTL_MS = 60 * 1000;
const _processedIds = new Map();

function yaProcesado(id) {
  if (!id) return false;
  const ts = _processedIds.get(id);
  if (!ts) return false;
  return (Date.now() - ts) < PROCESSED_TTL_MS;
}

function marcarProcesado(id) {
  if (!id) return;
  _processedIds.set(id, Date.now());
  if (_processedIds.size > MAX_PROCESSED_IDS) {
    const oldestKey = _processedIds.keys().next().value;
    _processedIds.delete(oldestKey);
  }
}

let _activeSlots = 0;
const _waitQueue = [];

function acquireSlot() {
  return new Promise((resolve) => {
    if (_activeSlots < MAX_CONCURRENT_CLASSIFY) {
      _activeSlots++;
      resolve();
    } else {
      _waitQueue.push(resolve);
    }
  });
}

function releaseSlot() {
  _activeSlots--;
  const next = _waitQueue.shift();
  if (next) {
    _activeSlots++;
    next();
  }
}

async function fetchWithTimeout(url, options = {}, timeout = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const MAX_FRAMES_ANIMADO = 3;

async function stickerAPng(webpBuffer) {
  return sharp(webpBuffer, { animated: false }).png().toBuffer();
}

async function getStickerFrames(webpBuffer) {
  try {
    const meta = await sharp(webpBuffer, { animated: true }).metadata();
    const pageCount = meta.pages || 1;

    if (pageCount <= 1) {
      return [await stickerAPng(webpBuffer)];
    }

    const indices = new Set([
      0,
      Math.floor(pageCount / 2),
      pageCount - 1
    ]);

    const frames = [];
    for (const idx of indices) {
      if (frames.length >= MAX_FRAMES_ANIMADO) break;
      try {
        const frameBuf = await sharp(webpBuffer, { animated: false, page: idx }).png().toBuffer();
        frames.push(frameBuf);
      } catch {
        // si un frame puntual falla, seguimos con los demás
      }
    }

    return frames.length ? frames : [await stickerAPng(webpBuffer)];
  } catch {
    return [await stickerAPng(webpBuffer)];
  }
}

async function esContenido18(buffer) {
  const hash = hashBuffer(buffer);
  const cached = getCachedResult(hash);
  if (cached !== null) return cached;

  await acquireSlot();
  let flagged = false;
  let success = false;

  try {
    const res = await fetchWithTimeout(SERVER_URL + '/classify-nsfw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ imageBase64: buffer.toString('base64') })
    }, 20000);

    if (res && res.ok) {
      const data = await res.json();
      if (data?.status) {
        flagged = !!data.flagged;
        success = true;
      }
    }
    if (!success) {
      console.error('[anti18] server de IA no clasificó la imagen, se deja pasar sin bloquear');
    }
  } catch (e) {
    console.error('[anti18] error consultando server de IA:', e.message);
  } finally {
    releaseSlot();
  }

  if (success) setCachedResult(hash, flagged);
  return flagged;
}

function esOwner(sender, conn) {
  const realNum = sender.replace(/[^0-9]/g, '');
  const clean = (n) => n.toString().replace(/[^0-9]/g, '');

  if (global.owner?.length) {
    for (const o of global.owner) {
      const n = clean(Array.isArray(o) ? o[0] : o);
      if (n && n === realNum) return true;
    }
  }
  if (global.lidOwners?.length) {
    for (const o of global.lidOwners) {
      if (clean(o) === realNum) return true;
    }
  }
  return sender === conn?.user?.jid;
}

const handler = async () => {};

handler.before = async function (m, { conn }) {
  if (!m.isGroup) return;
  if (!m.message) return;

  const tipo = m.mtype;
  if (tipo !== 'imageMessage' && tipo !== 'stickerMessage') return;

  const config = getConfig(m.chat) || {};
  if (!config.anti18) return;

  if (yaProcesado(m.key?.id)) return;

  const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
  if (!groupData.isBotAdmin) return;

  marcarProcesado(m.key?.id);

  const isOwnerSender = esOwner(m.sender, conn);
  const isPrivilegiado = groupData.isAdmin || isOwnerSender;

  try {
    const media = m.message[tipo];
    const raw = await conn.downloadM(media, tipo === 'stickerMessage' ? 'sticker' : 'image');
    if (!raw || !raw.length) return;

    let flagged = false;

    if (tipo === 'stickerMessage') {
      const frames = await getStickerFrames(raw);
      for (const frameBuf of frames) {
        flagged = await esContenido18(frameBuf);
        if (flagged) break;
      }
    } else {
      flagged = await esContenido18(raw);
    }

    if (!flagged) return;

    const tag = m.sender.split('@')[0];

    if (isPrivilegiado) {
      const frase = isOwnerSender ? elegirFrase(FRASES_OWNER) : elegirFrase(FRASES_ADMIN);
      await conn.sendMessage(m.chat, {
        text: `@${tag} ${frase}`,
        mentions: [m.sender]
      });
      return;
    }

    await conn.sendMessage(m.chat, { delete: m.key });

    const warns = await addWarning(m.sender, 'Contenido +18 detectado automáticamente', 'AntiNSFW', m.sender);

    await conn.sendMessage(m.chat, {
      text: `🔞 *Contenido +18 detectado*\n\n@${tag} tu mensaje fue eliminado, este grupo no permite contenido para adultos.\n📌 Advertencia ${warns}/${MAX_WARNS}`,
      mentions: [m.sender]
    });

    if (warns >= MAX_WARNS) {
      await resetWarnings(m.sender);
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
      clearGroupCache(m.chat, conn);
      await conn.sendMessage(m.chat, {
        text: `🚫 @${tag} fue expulsado del grupo por acumular ${MAX_WARNS} advertencias de contenido +18.`,
        mentions: [m.sender]
      });
    }
  } catch (e) {
    const detalle = e instanceof Error ? (e.stack || e.message) : (JSON.stringify(e) ?? String(e));
    console.error('[anti18] error procesando media:', detalle);
  }
};

export default handler;