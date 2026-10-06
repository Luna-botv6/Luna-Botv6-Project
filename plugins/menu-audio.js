import { getCustomAudios } from '../lib/funcion/audiosStore.js';
import { resolveMenuMedia } from '../lib/funcion/menu-media.js';

const handler = async (m, { conn, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let tradutor = {};
  try {
    const _tr = await global.loadTranslation?.(idioma);
    tradutor = _tr?.plugins?.menu_audios || {};
  } catch {}

  const customAudios = getCustomAudios();
  const frases = Object.entries(customAudios).map(([, data]) => data.original || '').filter(Boolean);

  const lineaVacio = tradutor.vacio || 'Todavía no hay audios agregados.';
  const nombreBot = global.BotName || 'LUNA BOT V6';
  const lineaSub = tradutor.subtitulo || '🎧 _Menú de audios_';
  const lineaFrases = tradutor.frases || 'Frases disponibles';
  const lineaEscribi = tradutor.escribi || '✍️ Escribí la frase y listo';
  const lineaAgregar = (tradutor.agregar || '➕ Agregar: `{prefix}agaudios frase`').replace('{prefix}', usedPrefix || '.');

  let str = `🔮 *${nombreBot}*\n${lineaSub}\n\n┏━ *${lineaFrases}* ━┓\n`;
  if (!frases.length) {
    str += `\n${lineaVacio}\n`;
  } else {
    str += `\n`;
    for (const frase of frases) str += `› ${frase}\n`;
  }
  str += `\n┗━━━━━━━━━━━━━━┛\n${lineaEscribi}\n\n${lineaAgregar}`;

  let mediaPath = null;
  let mediaType = null;
  try {
    ({ path: mediaPath, type: mediaType } = await resolveMenuMedia(conn, idioma, 'video'));
  } catch {}

  if (mediaType === 'video' && mediaPath) {
    await conn.sendMessage(m.chat, { video: { url: mediaPath }, gifPlayback: true, caption: str.trim() }, { quoted: m });
  } else if (mediaPath) {
    await conn.sendMessage(m.chat, { image: { url: mediaPath }, caption: str.trim() }, { quoted: m });
  } else {
    await conn.sendMessage(m.chat, { text: str.trim() }, { quoted: m });
  }
};

handler.help = ['menuaudios'];
handler.tags = ['audio'];
handler.command = /^(menu2|audios|menú2|menuaudio|menuaudios)$/i;
export default handler;
