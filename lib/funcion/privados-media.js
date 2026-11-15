import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const MEDIA_DIR = './privados-media';
export const MAX_BYTES = 12 * 1024 * 1024;
export const TAMANO_TROZO = 512 * 1024;
const MAX_SUBIDA_MS = 60 * 60 * 1000;
const MAX_TROZOS = 400;

const TIPOS = {
  'image/jpeg': { ext: 'jpg', tipo: 'imagen' },
  'image/jpg': { ext: 'jpg', tipo: 'imagen' },
  'image/png': { ext: 'png', tipo: 'imagen' },
  'image/webp': { ext: 'webp', tipo: 'imagen' },
  'video/mp4': { ext: 'mp4', tipo: 'video' },
  'video/3gpp': { ext: '3gp', tipo: 'video' },
  'video/quicktime': { ext: 'mov', tipo: 'video' },
  'video/webm': { ext: 'webm', tipo: 'video' },
  'audio/mpeg': { ext: 'mp3', tipo: 'audio' },
  'audio/mp3': { ext: 'mp3', tipo: 'audio' },
  'audio/mp4': { ext: 'm4a', tipo: 'audio' },
  'audio/x-m4a': { ext: 'm4a', tipo: 'audio' },
  'audio/ogg': { ext: 'ogg', tipo: 'audio' },
  'audio/opus': { ext: 'opus', tipo: 'audio' },
  'audio/wav': { ext: 'wav', tipo: 'audio' },
  'audio/x-wav': { ext: 'wav', tipo: 'audio' }
};

const subidas = new Map();

function idSeguro(id) {
  return /^[a-zA-Z0-9]{4,64}$/.test(String(id || ''));
}

function asegurarDir() {
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

export function infoMimetype(mimetype) {
  const limpio = String(mimetype || '').toLowerCase().split(';')[0].trim();
  return TIPOS[limpio] || null;
}

export function mimetypesPermitidos() {
  return Object.keys(TIPOS);
}

export function iniciarSubida({ mimetype, nombre, bytes }) {
  const info = infoMimetype(mimetype);
  if (!info) return { ok: false, error: 'Ese formato no se puede enviar. Usá imagen, video o audio.' };
  const tamano = Number(bytes);
  if (!Number.isFinite(tamano) || tamano <= 0) return { ok: false, error: 'El archivo llegó vacío.' };
  if (tamano > MAX_BYTES) return { ok: false, error: 'El archivo supera el límite de 12 MB.' };
  asegurarDir();
  const uploadId = 'up' + crypto.randomBytes(8).toString('hex');
  const trozos = Math.max(1, Math.ceil(tamano / TAMANO_TROZO));
  if (trozos > MAX_TROZOS) return { ok: false, error: 'El archivo tiene demasiados trozos.' };
  subidas.set(uploadId, {
    creadoEn: Date.now(),
    mimetype: String(mimetype).toLowerCase().split(';')[0].trim(),
    info,
    nombre: String(nombre || 'archivo').slice(0, 120),
    bytes: tamano,
    trozos,
    recibidos: 0,
    archivo: path.join(MEDIA_DIR, uploadId + '.part')
  });
  fs.writeFileSync(path.join(MEDIA_DIR, uploadId + '.part'), Buffer.alloc(0));
  return { ok: true, uploadId, trozos, tamanoTrozo: TAMANO_TROZO, maxBytes: MAX_BYTES };
}

export function recibirTrozo({ uploadId, index, data }) {
  const subida = subidas.get(String(uploadId || ''));
  if (!subida) return { ok: false, error: 'La subida expiró. Volvé a elegir el archivo.' };
  if (!idSeguro(uploadId)) return { ok: false, error: 'Subida inválida.' };
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= subida.trozos) return { ok: false, error: 'Trozo inválido.' };
  if (idx !== subida.recibidos) return { ok: false, error: 'Los trozos llegaron desordenados. Probá de nuevo.' };
  let buffer;
  try {
    buffer = Buffer.from(String(data || ''), 'base64');
  } catch {
    return { ok: false, error: 'No se pudo leer el trozo.' };
  }
  if (!buffer.length) return { ok: false, error: 'El trozo llegó vacío.' };
  try {
    fs.appendFileSync(subida.archivo, buffer);
  } catch (e) {
    return { ok: false, error: 'No se pudo guardar el archivo: ' + e.message };
  }
  subida.recibidos += 1;
  return { ok: true, recibidos: subida.recibidos, trozos: subida.trozos };
}

export function finalizarSubida(uploadId) {
  const subida = subidas.get(String(uploadId || ''));
  if (!subida) return { ok: false, error: 'La subida expiró. Volvé a elegir el archivo.' };
  if (subida.recibidos !== subida.trozos) {
    return { ok: false, error: 'Faltan trozos del archivo (' + subida.recibidos + ' de ' + subida.trozos + ').' };
  }
  let peso = 0;
  try {
    peso = fs.statSync(subida.archivo).size;
  } catch {
    return { ok: false, error: 'No se encontró el archivo subido.' };
  }
  if (peso !== subida.bytes) {
    return { ok: false, error: 'El archivo llegó incompleto (' + peso + ' de ' + subida.bytes + ' bytes).' };
  }
  const mediaId = 'md' + crypto.randomBytes(8).toString('hex');
  const destino = path.join(MEDIA_DIR, mediaId + '.' + subida.info.ext);
  try {
    fs.renameSync(subida.archivo, destino);
  } catch (e) {
    return { ok: false, error: 'No se pudo cerrar el archivo: ' + e.message };
  }
  const media = {
    id: mediaId,
    archivo: destino,
    mimetype: subida.mimetype,
    tipo: subida.info.tipo,
    nombre: subida.nombre,
    bytes: subida.bytes
  };
  try {
    fs.writeFileSync(path.join(MEDIA_DIR, mediaId + '.json'), JSON.stringify(media, null, 2));
  } catch {}
  subidas.delete(String(uploadId));
  return { ok: true, media };
}

export function obtenerMedia(mediaId) {
  if (!idSeguro(mediaId)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(MEDIA_DIR, mediaId + '.json'), 'utf8'));
    if (!meta || meta.id !== mediaId) return null;
    if (!fs.existsSync(meta.archivo)) return { ...meta, faltante: true };
    return meta;
  } catch {
    return null;
  }
}

export function borrarMedia(media) {
  if (!media) return false;
  let borrado = false;
  try {
    if (media.archivo && fs.existsSync(media.archivo)) {
      fs.unlinkSync(media.archivo);
      borrado = true;
    }
  } catch {}
  try {
    const sidecar = path.join(MEDIA_DIR, media.id + '.json');
    if (media.id && fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
  } catch {}
  return borrado;
}

export function limpiarSubidasViejas(ahora = Date.now()) {
  asegurarDir();
  let borrados = 0;
  try {
    for (const archivo of fs.readdirSync(MEDIA_DIR)) {
      const ruta = path.join(MEDIA_DIR, archivo);
      let stat;
      try {
        stat = fs.statSync(ruta);
      } catch {
        continue;
      }
      if (archivo.endsWith('.part') && ahora - stat.mtimeMs > MAX_SUBIDA_MS) {
        try {
          fs.unlinkSync(ruta);
          borrados += 1;
        } catch {}
      }
    }
  } catch {}
  for (const [id, subida] of subidas) {
    if (ahora - subida.creadoEn > MAX_SUBIDA_MS) subidas.delete(id);
  }
  return borrados;
}

export function mediaHuerfana(archivosEnUso, ahora = Date.now()) {
  asegurarDir();
  const enUso = new Set((archivosEnUso || []).filter(Boolean).map((ruta) => path.basename(String(ruta))));
  const RETENCION_HUERFANA_MS = 2 * 60 * 60 * 1000;
  let borrados = 0;
  try {
    for (const archivo of fs.readdirSync(MEDIA_DIR)) {
      if (!/\.(json|jpg|png|webp|mp4|3gp|mov|webm|mp3|m4a|ogg|opus|wav)$/i.test(archivo)) continue;
      if (enUso.has(archivo)) continue;
      if (enUso.has(archivo.replace(/\.json$/i, ''))) continue;
      const ruta = path.join(MEDIA_DIR, archivo);
      let stat;
      try {
        stat = fs.statSync(ruta);
      } catch {
        continue;
      }
      if (ahora - stat.mtimeMs < RETENCION_HUERFANA_MS) continue;
      try {
        fs.unlinkSync(ruta);
        borrados += 1;
      } catch {}
    }
  } catch {}
  return borrados;
}
