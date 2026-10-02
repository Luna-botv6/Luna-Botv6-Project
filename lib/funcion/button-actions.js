import fs from 'fs';
import path from 'path';

const RUTA_ARCHIVO = path.join(process.cwd(), 'database', 'button-actions.json');
const DIR_MEDIA = './botones-media';
const PREFIJO_BOTON = 'lb1_';
const MAX_BOTONES = 3;
const MAX_NOMBRE = 30;
const MAX_TEXTO = 1024;
const MAX_COMANDO = 40;
const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const COOLDOWN_MS = 1500;

let cache = null;
const ultimoUso = new Map();

function cargarCache() {
  if (cache) return cache;
  try {
    const contenido = fs.readFileSync(RUTA_ARCHIVO, 'utf-8');
    cache = JSON.parse(contenido);
  } catch {
    cache = {};
  }
  if (!cache || typeof cache !== 'object' || Array.isArray(cache)) cache = {};
  return cache;
}

function guardarCache(data) {
  cache = data;
  const dir = path.dirname(RUTA_ARCHIVO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const rutaTmp = `${RUTA_ARCHIVO}.tmp`;
  fs.writeFileSync(rutaTmp, JSON.stringify(data, null, 2));
  fs.renameSync(rutaTmp, RUTA_ARCHIVO);
}

function generarId() {
  let id = '';
  for (let i = 0; i < 8; i++) id += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return id;
}

function limpiarTexto(valor, max) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function borrarArchivo(ruta) {
  if (!ruta) return;
  try {
    if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
  } catch {}
}

function claveDe(ownerTipo, ownerId) {
  return `${ownerTipo}:${ownerId}`;
}

function obtenerDueño(data, ownerTipo, ownerId) {
  const clave = claveDe(ownerTipo, ownerId);
  if (!data[clave] || typeof data[clave] !== 'object') return null;
  if (!Array.isArray(data[clave].botones)) data[clave].botones = [];
  if (!data[clave].acciones || typeof data[clave].acciones !== 'object') data[clave].acciones = {};
  return data[clave];
}

function esBotonAccion(id) {
  return typeof id === 'string' && id.startsWith(PREFIJO_BOTON);
}

function extraerAccionId(id) {
  if (!esBotonAccion(id)) return null;
  const limpio = id.slice(PREFIJO_BOTON.length).trim().toUpperCase();
  return /^[A-Z2-9]{4,16}$/.test(limpio) ? limpio : null;
}

function extensionDe(mimetype) {
  const mime = String(mimetype || '').toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('mp4') || mime.includes('3gpp') || mime.includes('mpeg')) return 'mp4';
  return 'jpg';
}

function guardarMedia(media, mimetype) {
  if (!media || typeof media.data !== 'string' || !media.data) return null;
  let bytes;
  try {
    bytes = Buffer.byteLength(media.data, 'base64');
  } catch {
    return null;
  }
  if (!bytes || bytes > MAX_MEDIA_BYTES) return null;
  if (!fs.existsSync(DIR_MEDIA)) fs.mkdirSync(DIR_MEDIA, { recursive: true });
  const mime = String(mimetype || media.mimetype || '');
  const nombre = `btn_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extensionDe(mime)}`;
  const ruta = path.join(DIR_MEDIA, nombre);
  try {
    fs.writeFileSync(ruta, Buffer.from(media.data, 'base64'));
  } catch {
    return null;
  }
  return { ruta, nombre, tipo: mime.startsWith('video/') ? 'video' : 'image' };
}

function procesarMedia(accionPrevia, boton) {
  if (boton.quitarMedia) {
    borrarArchivo(accionPrevia?.mediaPath);
    return { ruta: null, nombre: null, tipo: null };
  }
  const nueva = guardarMedia(boton.media, boton.mediaMimetype || boton.media?.mimetype);
  if (nueva) {
    borrarArchivo(accionPrevia?.mediaPath);
    return { ruta: nueva.ruta, nombre: nueva.nombre, tipo: nueva.tipo };
  }
  return {
    ruta: accionPrevia?.mediaPath || null,
    nombre: accionPrevia?.mediaName || null,
    tipo: accionPrevia?.mediaTipo || null
  };
}

function guardarBotones(ownerTipo, ownerId, botones) {
  const data = cargarCache();
  const clave = claveDe(ownerTipo, ownerId);
  const previo = data[clave] || { botones: [], acciones: {} };
  if (!Array.isArray(previo.botones)) previo.botones = [];
  if (!previo.acciones || typeof previo.acciones !== 'object') previo.acciones = {};

  const lista = Array.isArray(botones) ? botones.slice(0, MAX_BOTONES) : [];
  const botonesNuevos = [];
  const accionesNuevas = {};
  const sobrevividos = new Set();

  for (const b of lista) {
    if (!b || typeof b !== 'object') continue;

    const nombre = limpiarTexto(b.nombre, MAX_NOMBRE);
    if (!nombre) continue;

    const activo = b.activo !== false;

    if (b.tipo === 'comando') {
      const comando = limpiarTexto(b.comando, MAX_COMANDO).toLowerCase().replace(/[^a-z0-9_\-.]/g, '');
      if (!comando) continue;
      botonesNuevos.push({ activo, nombre, tipo: 'comando', comando });
      continue;
    }

    const cuerpo = limpiarTexto(b.texto, MAX_TEXTO);
    if (!cuerpo) continue;

    const pedido = limpiarTexto(b.accionId, 16).toUpperCase();
    let accionId = pedido && previo.acciones[pedido] ? pedido : null;
    if (!accionId) {
      accionId = generarId();
      while (accionesNuevas[accionId] || previo.acciones[accionId]) accionId = generarId();
    }
    sobrevividos.add(accionId);

    const anterior = previo.acciones[accionId] || null;
    const media = procesarMedia(anterior, b);

    accionesNuevas[accionId] = {
      texto: cuerpo,
      mediaPath: media.ruta,
      mediaName: media.nombre,
      mediaTipo: media.tipo,
      creado: anterior?.creado || Date.now()
    };

    botonesNuevos.push({ activo, nombre, tipo: 'texto', accionId });
  }

  for (const [id, accion] of Object.entries(previo.acciones)) {
    if (sobrevividos.has(id)) continue;
    borrarArchivo(accion.mediaPath);
  }

  data[clave] = { botones: botonesNuevos, acciones: accionesNuevas };
  guardarCache(data);

  return listarBotones(ownerTipo, ownerId);
}

function listarBotones(ownerTipo, ownerId) {
  const data = cargarCache();
  const dueno = data[claveDe(ownerTipo, ownerId)];
  if (!dueno) return [];
  const botones = Array.isArray(dueno.botones) ? dueno.botones : [];
  const acciones = dueno.acciones || {};
  return botones.slice(0, MAX_BOTONES).map((b) => {
    const accion = b.accionId ? acciones[b.accionId] : null;
    return {
      activo: b.activo !== false,
      nombre: b.nombre || '',
      tipo: b.tipo === 'comando' ? 'comando' : 'texto',
      comando: b.comando || '',
      texto: accion?.texto || '',
      accionId: b.accionId || '',
      tieneMedia: !!accion?.mediaPath,
      mediaTipo: accion?.mediaTipo || ''
    };
  });
}

function limpiarBotones(ownerTipo, ownerId) {
  const data = cargarCache();
  const clave = claveDe(ownerTipo, ownerId);
  const dueno = data[clave];
  if (!dueno) return;
  for (const accion of Object.values(dueno.acciones || {})) borrarArchivo(accion.mediaPath);
  delete data[clave];
  guardarCache(data);
}

function resolverAccion(accionId) {
  if (!accionId) return null;
  const data = cargarCache();
  for (const dueno of Object.values(data)) {
    const accion = dueno?.acciones?.[accionId];
    if (accion) return { id: accionId, ...accion };
  }
  return null;
}

function obtenerPrefijo() {
  const prefijo = global.prefix;
  if (typeof prefijo === 'string' && prefijo) return prefijo;
  const clase = String(prefijo?.source || '').match(/^\^\[(.*)\]$/);
  if (clase) {
    const contenido = clase[1];
    for (let i = 0; i < contenido.length; i++) {
      if (contenido[i] !== '\\') return contenido[i];
      if (!contenido[i + 1]) break;
      return contenido[i + 1];
    }
  }
  return '/';
}

export function armarBotones(ownerTipo, ownerId) {
  const botones = listarBotones(ownerTipo, ownerId).filter((b) => b.activo && b.nombre);
  if (!botones.length) return null;
  const prefijo = obtenerPrefijo();
  return botones.slice(0, MAX_BOTONES).map((b) => ({
    buttonId: b.tipo === 'comando'
      ? `${prefijo}${b.comando}`
      : `${PREFIJO_BOTON}${b.accionId}`,
    buttonText: { displayText: b.nombre },
    type: 1
  }));
}

function estaEnCooldown(clave) {
  const ahora = Date.now();
  const previo = ultimoUso.get(clave);
  if (previo && ahora - previo < COOLDOWN_MS) return true;
  ultimoUso.set(clave, ahora);
  if (ultimoUso.size > 500) {
    for (const [k, t] of ultimoUso) {
      if (ahora - t > COOLDOWN_MS * 4) ultimoUso.delete(k);
    }
  }
  return false;
}

function responderAccion(conn, chatId, quoted, texto, mediaPath, mediaTipo) {
  if (mediaPath && fs.existsSync(mediaPath)) {
    const buffer = fs.readFileSync(mediaPath);
    const esVideo = mediaTipo === 'video';
    const opciones = esVideo
      ? { video: buffer, mimetype: 'video/mp4', caption: texto }
      : { image: buffer, mimetype: 'image/jpeg', caption: texto };
    return conn.sendMessage(chatId, opciones, quoted ? { quoted } : undefined);
  }
  return conn.sendMessage(chatId, { text: texto }, quoted ? { quoted } : undefined);
}

async function ejecutarAccion(conn, msg, botonId) {
  if (!esBotonAccion(botonId)) return false;

  const accionId = extraerAccionId(botonId);
  if (!accionId) return true;

  const accion = resolverAccion(accionId);
  if (!accion) return true;

  const message = msg?.messages?.[0];
  const chatId = message?.key?.remoteJid;
  const sender = message?.key?.participant || message?.key?.remoteJid;
  if (!chatId || !sender) return true;

  if (estaEnCooldown(sender + accionId)) return true;

  try {
    await responderAccion(conn, chatId, message, accion.texto || '', accion.mediaPath, accion.mediaTipo);
  } catch {}

  return true;
}

function limpiarMediaHuerfana() {
  const data = cargarCache();
  const rutas = new Set();
  for (const dueno of Object.values(data)) {
    for (const accion of Object.values(dueno?.acciones || {})) {
      if (accion.mediaPath) rutas.add(accion.mediaPath);
    }
  }
  try {
    if (!fs.existsSync(DIR_MEDIA)) return;
    for (const nombre of fs.readdirSync(DIR_MEDIA)) {
      const ruta = path.join(DIR_MEDIA, nombre);
      if (!rutas.has(ruta)) borrarArchivo(ruta);
    }
  } catch {}
}

export const buttonActions = {
  MAX_BOTONES,
  MAX_NOMBRE,
  MAX_TEXTO,
  MAX_COMANDO,
  MAX_MEDIA_BYTES,
  esBotonAccion,
  extraerAccionId,
  guardarBotones,
  listarBotones,
  limpiarBotones,
  resolverAccion,
  armarBotones,
  estaEnCooldown,
  ejecutarAccion,
  limpiarMediaHuerfana
};