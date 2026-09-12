import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { addCustomAudio, getCustomAudios, AUDIOS_DIR, ensureDir } from '../lib/funcion/audiosStore.js';
import { AUDIOS_CATALOG } from './audios-globales.js';

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'audio';
}

function convertBufferToOggOpus(buffer) {
  return new Promise((resolve, reject) => {
    const input = new Readable();
    input.push(buffer);
    input.push(null);

    const output = new PassThrough();
    const chunks = [];
    output.on('data', chunk => chunks.push(chunk));
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);

    ffmpeg(input)
      .noVideo()
      .audioCodec('libopus')
      .audioChannels(1)
      .audioFrequency(48000)
      .audioBitrate('128k')
      .outputOptions(['-map', '0:a:0', '-map_metadata', '-1', '-application', 'voip', '-frame_duration', '20', '-packet_loss', '0'])
      .format('ogg')
      .on('error', reject)
      .pipe(output);
  });
}

async function downloadQuotedAudio(quoted) {
  if (typeof quoted.download === 'function') {
    try {
      return await quoted.download();
    } catch {}
  }

  const audioMsg = quoted.message?.audioMessage || quoted.audioMessage;
  if (!audioMsg) return null;

  const stream = await downloadContentFromMessage(audioMsg, 'audio');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.agregar_audio || {};
  if (!m.isGroup) return m.reply(t.solo_grupos || '❌ Este comando solo funciona en grupos.');

  const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
  if (!groupData.isAdmin && !groupData.isRAdmin) return m.reply(t.solo_admins || '❌ Solo los administradores pueden agregar audios.');

  const frase = args.join(' ').trim();
  if (!frase) {
    return m.reply(t.falta_frase?.replace('{prefix}', `${usedPrefix}${command}`) || `❌ Debes indicar la frase que activará el audio.\n\n📌 Ejemplo: responde a un audio con:\n${usedPrefix}${command} Holis chicos`);
  }

  const quoted = m.quoted;
  if (!quoted) {
    return m.reply(t.falta_cita?.replace('{prefix}', `${usedPrefix}${command}`).replace('{frase}', frase) || `❌ Debes responder a un audio o nota de voz con:\n${usedPrefix}${command} ${frase}`);
  }

  const mtype = quoted.mtype || Object.keys(quoted.message || {})[0];
  if (mtype !== 'audioMessage') {
    return m.reply(t.no_es_audio || '❌ El mensaje al que respondes no es un audio ni una nota de voz.');
  }

  const triggerKey = frase.toLowerCase();

  const collideDefault = AUDIOS_CATALOG.some(entry => entry.keywords.includes(triggerKey));
  if (collideDefault) return m.reply(t.colision_default || '❌ Esa frase ya está usada por un audio del bot, elige otra.');

  const customAudios = getCustomAudios();
  if (customAudios[triggerKey]) return m.reply(t.ya_existe || '❌ Ya existe un audio guardado con esa frase, elige otra.');

  let rawBuffer;
  try {
    rawBuffer = await downloadQuotedAudio(quoted);
  } catch {
    rawBuffer = null;
  }

  if (!rawBuffer || !rawBuffer.length) return m.reply(t.no_descarga || '❌ No pude descargar el audio, intenta de nuevo.');

  let oggBuffer;
  try {
    oggBuffer = await convertBufferToOggOpus(rawBuffer);
  } catch {
    return m.reply(t.error_convertir || '❌ Error al convertir el audio.');
  }

  if (!oggBuffer || !oggBuffer.length) return m.reply(t.conversion_vacia || '❌ La conversión del audio no generó ningún archivo válido.');

  ensureDir();

  const filename = `${slugify(frase)}-${Date.now()}.ogg`;
  const filepath = path.join(AUDIOS_DIR, filename);

  try {
    fs.writeFileSync(filepath, oggBuffer);
  } catch {
    return m.reply(t.error_guardar || '❌ No pude guardar el audio en el servidor.');
  }

  await addCustomAudio(triggerKey, {
    file: filename,
    original: frase,
    addedBy: m.sender,
    chat: m.chat,
    date: Date.now()
  });

  await m.reply(t.exito?.replace('{frase}', frase).replace('{frase}', frase).replace('{archivo}', filename) || `✅ *Audio agregado correctamente*\n\n🗣️ *Frase:* _${frase}_\n📁 *Archivo:* ${filename}\n\n_Cuando alguien escriba "${frase}" en cualquier grupo, el bot responderá con este audio._\n_Podés desactivarlo por grupo con el comando de configuración de audios._`);
};

handler.command = /^agaudios$/i;
handler.group = true;

export default handler;
