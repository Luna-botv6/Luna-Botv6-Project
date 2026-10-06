import { getConfig } from '../lib/funcConfig.js';
import { getAudiosDelGrupo } from '../lib/funcion/audiosGrupos.js';
import { resolveMenuMedia } from '../lib/funcion/menu-media.js';

function entradasOrdenadas(audios) {
  return Object.entries(audios).sort((a, b) => {
    const na = (a[1] && a[1].original) || a[0];
    const nb = (b[1] && b[1].original) || b[0];
    return na.localeCompare(nb);
  });
}

const handler = async (m, { conn, usedPrefix }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let tradutor = {};
  try {
    const _tr = await global.loadTranslation?.(idioma);
    tradutor = _tr?.plugins?.menu_audios || {};
  } catch {}

  const prefix = usedPrefix || '.';
  const grupoAudios = getAudiosDelGrupo(m.chat);
  const entries = entradasOrdenadas(grupoAudios);

  let permisoAbierto = false;
  try {
    permisoAbierto = !!getConfig(m.chat)?.agaudios;
  } catch {
    permisoAbierto = false;
  }

  const nombreBot = global.BotName || 'LUNA BOT V6';
  const lineaSub = tradutor.subtitulo || '🎧 *Menú de audios*';
  const lineaFrases = tradutor.frases || 'Audios de este grupo';
  const lineaVacio = tradutor.vacio || 'Este grupo todavía no tiene audios.';
  const lineaEscribi = tradutor.escribi || '✍️ Escribí la frase y listo';

  let str = `🔮 *${nombreBot}*\n${lineaSub}\n\n┏━ *${lineaFrases}* ━┓\n`;
  if (!entries.length) {
    str += `\n${lineaVacio}\n`;
  } else {
    str += `\n`;
    entries.forEach((([trigger, data], i) => {
      str += `▶️ *${i + 1}.* ${data.original || trigger}\n`;
    }));
  }
  str += `\n┗━━━━━━━━━━━━━━┛\n${lineaEscribi}\n`;
  str += `\n┏━ *Cómo funciona* ━┓\n`;
  str += `\n*1.* Cada grupo tiene sus audios: lo que se agrega aquí no suena en otro grupo.`;
  str += `\n*2.* Solo el owner agrega con *${prefix}agaudios frase* respondiendo a un audio.`;
  str += `\n*3.* Con *${prefix}enable agaudios* el owner deja que los admins también agreguen en este grupo${permisoAbierto ? ' *(activo aquí)*' : ''}. Con *${prefix}disable agaudios* lo cierra.`;
  str += `\n*4.* Con *${prefix}importaudios* el owner trae la biblioteca del bot a este grupo: *${prefix}importaudios todo* trae todos, *${prefix}importaudios 1 3 5* solo esos números de la lista.`;
  str += `\n*5.* Con *${prefix}elaudios frase o número* se borra de este grupo. Solo el owner puede borrar de todos lados con *${prefix}elaudios global frase*.`;
  str += `\n\n┗━━━━━━━━━━━━━━┛`;

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
