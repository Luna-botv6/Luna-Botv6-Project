import fs from 'fs';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { getConfig } from '../lib/funcConfig.js';
import { addCustomAudio, getCustomAudios, AUDIOS_DIR, ensureDir } from '../lib/funcion/audiosStore.js';
import { getAudiosDelGrupo, setAudioEnGrupo } from '../lib/funcion/audiosGrupos.js';
import { slugifyFrase, convertBufferToOggOpus } from '../lib/funcion/audioConverter.js';

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

const handler = async (m, { conn, args, usedPrefix, command, isOwner, isROwner }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.agregar_audio || {};
  if (!m.isGroup) return m.reply(t.solo_grupos || '❌ Este comando solo funciona en grupos.');

  const esOwner = !!(isOwner || isROwner);
  if (!esOwner) {
    let habilitado = false;
    try {
      habilitado = !!getConfig(m.chat)?.agaudios;
    } catch {
      habilitado = false;
    }
    if (!habilitado) return m.reply(t.solo_owner || '❌ Solo el owner puede agregar audios en este grupo.');
    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    if (!groupData.isAdmin && !groupData.isRAdmin) return m.reply(t.solo_admins || '❌ Solo los administradores pueden agregar audios.');
  }

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

  const grupoAudios = getAudiosDelGrupo(m.chat);
  if (grupoAudios[triggerKey]) return m.reply(t.ya_existe || '❌ Ya existe un audio guardado con esa frase, elige otra.');
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

  const filename = `${slugifyFrase(frase)}-${Date.now()}.ogg`;
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
  setAudioEnGrupo(m.chat, triggerKey, {
    file: filename,
    original: frase,
    addedBy: m.sender,
    date: Date.now()
  });

  await m.reply(t.exito?.replace('{frase}', frase).replace('{frase}', frase).replace('{archivo}', filename) || `✅ *Audio agregado correctamente*\n\n🗣️ *Frase:* _${frase}_\n📁 *Archivo:* ${filename}\n\n_Cuando alguien escriba "${frase}" en este grupo, el bot responderá con este audio._`);
};

handler.command = /^agaudios$/i;
handler.group = true;

export default handler;
