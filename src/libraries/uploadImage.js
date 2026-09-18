import fetch from 'node-fetch';
import {FormData, Blob} from 'formdata-node';
import {fileTypeFromBuffer} from 'file-type';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default async (buffer) => {
  if (!buffer || buffer.length > MAX_FILE_SIZE) {
    throw new Error('[uploadImage] Archivo inválido o excede el tamaño máximo permitido (10MB)');
  }
  const type = await fileTypeFromBuffer(buffer);
  if (!type) throw new Error('[uploadImage] No se pudo detectar el tipo de archivo');
  const {ext, mime} = type;
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw new Error('[uploadImage] Tipo de archivo no permitido: ' + mime);
  }
  const uint8 = new Uint8Array(buffer);

  const quax = async () => {
    const form = new FormData();
    form.append('files[]', new Blob([uint8], {type: mime}), 'tmp.' + ext);
    const res = await fetch('https://qu.ax/upload.php', {method: 'POST', body: form});
    const json = await res.json();
    if (!json?.success) throw new Error('qu.ax: ' + JSON.stringify(json));
    return json.files[0].url;
  };

  const telegraph = async () => {
    const form = new FormData();
    form.append('file', new Blob([uint8], {type: mime}), 'tmp.' + ext);
    const res = await fetch('https://telegra.ph/upload', {method: 'POST', body: form});
    const json = await res.json();
    if (Array.isArray(json) && json[0]) {
      const path = json[0].src || json[0].path || json[0].url || null;
      if (path) return 'https://telegra.ph' + path;
    }
    throw new Error('telegra.ph: respuesta inesperada ' + JSON.stringify(json));
  };

  const catbox = async () => {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', new Blob([uint8], {type: mime}), 'tmp.' + ext);
    const res = await fetch('https://catbox.moe/user/api.php', {method: 'POST', body: form});
    const url = await res.text();
    if (!url.startsWith('https://')) throw new Error('catbox: ' + url);
    return url;
  };

  let lastErr;
  for (const [nombre, fn] of [['qu.ax', quax], ['telegra.ph', telegraph], ['catbox', catbox]]) {
    try {
      return await fn();
    } catch (e) {
      console.error('[uploadImage]', nombre, 'falló:', e.message);
      lastErr = e;
    }
  }
  throw lastErr;
};
