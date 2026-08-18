import { canalStore } from './canal-relay-store.js';
import { smsg } from '../../src/libraries/simple.js';

const colaEnvio = [];
let procesandoCola = false;
const DELAY_MIN_MS = 2500;
const DELAY_MAX_MS = 5000;

function jitterDelay() {
  return DELAY_MIN_MS + Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS));
}

async function procesarCola() {
  if (procesandoCola) return;
  procesandoCola = true;
  while (colaEnvio.length > 0) {
    const tarea = colaEnvio.shift();
    await tarea().catch(() => {});
    await new Promise((res) => setTimeout(res, jitterDelay()));
  }
  procesandoCola = false;
}

function encolar(tarea) {
  colaEnvio.push(tarea);
  procesarCola();
}

function tipoDeMensaje(message) {
  if (!message) return null;
  if (message.conversation || message.extendedTextMessage) return 'texto';
  if (message.imageMessage) return 'imagen';
  if (message.videoMessage) return 'video';
  if (message.stickerMessage) return 'sticker';
  if (message.audioMessage) return 'audio';
  if (message.pollCreationMessage || message.pollCreationMessageV3) return 'encuesta';
  return null;
}

const CAMPO_POR_TIPO = {
  imagen: 'imageMessage',
  video: 'videoMessage',
  sticker: 'stickerMessage',
  audio: 'audioMessage'
};

async function descargarDesdeCanal(message, tipo) {
  const campo = CAMPO_POR_TIPO[tipo];
  const contenido = message.message?.[campo];
  const url = contenido?.url;
  if (!url) throw new Error('El mensaje de canal no trae url de media');
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status + ' al bajar media del canal');
  const buffer = Buffer.from(await respuesta.arrayBuffer());
  return { buffer, caption: contenido.caption || undefined };
}

async function reenviarMensaje(conn, destino, message, tipo, esFuenteCanal) {
  const destinoEsCanal = destino.endsWith('@newsletter');

  if (tipo === 'texto') {
    if (destinoEsCanal) {
      const texto = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
      if (!texto) return;
      await conn.sendMessage(destino, { text: texto });
      return;
    }
    await conn.copyNForward(destino, message, true);
    return;
  }

  let buffer;
  let caption;

  if (esFuenteCanal) {
    const resultado = await descargarDesdeCanal(message, tipo);
    buffer = resultado.buffer;
    caption = resultado.caption;
  } else {
    const serializado = smsg(conn, message);
    buffer = await serializado.download();
    caption = serializado.text || undefined;
  }

  if (tipo === 'imagen') {
    await conn.sendMessage(destino, { image: buffer, caption });
    return;
  }
  if (tipo === 'video') {
    await conn.sendMessage(destino, { video: buffer, caption });
    return;
  }
  if (tipo === 'sticker') {
    await conn.sendMessage(destino, { sticker: buffer });
    return;
  }
  if (tipo === 'audio') {
    await conn.sendMessage(destino, { audio: buffer, mimetype: 'audio/mp4' });
    return;
  }

  if (destinoEsCanal) return;
  await conn.copyNForward(destino, message, true);
}

export async function manejarCanalRelay(conn) {
  const inicioBotTimestamp = Date.now();

  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      if (type !== 'notify') return;
      if (Date.now() - inicioBotTimestamp < 10000) return;

      for (const message of messages) {
        if (!message?.message) continue;

        const chatId = message.key?.remoteJid;
        const esCanal = chatId?.endsWith('@newsletter');
        const esGrupo = chatId?.endsWith('@g.us');
        if (!esCanal && !esGrupo) continue;

        if (message.key?.fromMe && !esCanal) continue;

        const vinculacion = canalStore.buscarPorPrincipal(chatId);
        if (!vinculacion || !vinculacion.activo) continue;
        if (!vinculacion.destinos.length) continue;

        const tipo = tipoDeMensaje(message.message);
        if (!tipo) continue;
        if (vinculacion.tipos[tipo] === false) continue;

        for (const destino of vinculacion.destinos) {
          encolar(async () => {
            await reenviarMensaje(conn, destino, message, tipo, esCanal);
          });
        }
      }
    } catch (e) {}
  });
}
