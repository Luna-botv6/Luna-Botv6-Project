import fs from 'fs';
import { getConfig } from '../lib/funcConfig.js';
import { getSinPrefijo } from '../lib/sinPrefijo.js';
import { getAudioFilePath } from '../lib/funcion/audiosStore.js';
import { getAudiosDelGrupo } from '../lib/funcion/audiosGrupos.js';

export const AUDIOS_CATALOG = [];

const handler = (m) => m;

function isAudioEnabled(audiosConfig, id) {
  return audiosConfig[id] !== false;
}

handler.all = async function (m, { conn }) {
  try {
    if (!m || m.fromMe || m.isBaileys || !m.id) return;
    if (!conn?.user) return;
    if (!m.chat.endsWith('@g.us')) return;

    const text = (m.text || '').trim();
    if (!text) return;

    const sinPrefijoActivo = getSinPrefijo(m.chat);
    if (sinPrefijoActivo) return;

    const first = text.trim().split(/\s+/)[0];
    const prefijos = ['.', '#', '/', '!', '?', '$', '%', '&', '*'];
    if (prefijos.includes(first[0])) return;
    if (m.isCommand) return;
    if (m.commandSinPrefijo) return;
    if (text.length < 2) return;

    const chat = getConfig(m.chat) || {};
    const audiosEnabled = chat.audios !== undefined ? chat.audios : true;
    if (chat.isBanned) return;
    if (!audiosEnabled) return;

    const audiosConfig = chat.audiosConfig || {};
    const lower = text.toLowerCase();

    let matchedFile = null;

    const customAudios = getAudiosDelGrupo(m.chat);
    for (const [trigger, data] of Object.entries(customAudios)) {
      if (!isAudioEnabled(audiosConfig, trigger)) continue;
      if (lower.includes(trigger)) {
        matchedFile = data.file;
        break;
      }
    }

    if (!matchedFile) return;

    let oggBuffer;
    try {
      oggBuffer = fs.readFileSync(getAudioFilePath(matchedFile));
    } catch {
      return;
    }

    await conn.sendPresenceUpdate('recording', m.chat);
    await new Promise(res => setTimeout(res, 1200));

    if (!conn?.user) return;

    await conn.sendMessage(m.chat, { audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m });

  } catch (e) {
    console.error('[AUDIO-DEBUG] 💥 Error inesperado:', e);
  }

  return false;
};

export default handler;
