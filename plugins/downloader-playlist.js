import fs from 'fs';
import fetch from 'node-fetch';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js';
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js';

const configContent = fs.readFileSync('./config.js', 'utf-8');
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado: Luna-Botv6 no encontrado.');
try { verificarMenuIuman(); } catch { throw new Error('Archivo de configuracion faltante o invalido'); }

const SERVER_URL = obtenerMenuIuman();
const API_KEY = cargarOGenerarAPIKey();
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY };
const TIMEOUT = 15000;

const BOT = () => global.BotName || 'LUNA';

const ft = async (url, headers = {}) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT);
  try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r; }
  catch (e) { clearTimeout(t); throw e; }
};

function MilesNumber(n) {
  return n.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

function secondString(secs) {
  secs = Number(secs);
  const d  = Math.floor(secs / (3600 * 24));
  const h  = Math.floor(secs % (3600 * 24) / 3600);
  const m  = Math.floor(secs % 3600 / 60);
  const s  = Math.floor(secs % 60);
  const ds = d > 0 ? d + (d === 1 ? ' día, '    : ' días, ')    : '';
  const hs = h > 0 ? h + (h === 1 ? ' hora, '   : ' horas, ')   : '';
  const ms = m > 0 ? m + (m === 1 ? ' minuto, '  : ' minutos, ') : '';
  const ss = s > 0 ? s + (s === 1 ? ' segundo'   : ' segundos')  : '';
  return ds + hs + ms + ss;
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text || !text.trim()) {
      return await conn.sendMessage(m.chat, {
        text: (
          `🎵 *${BOT()} — Buscador de Playlist*\n` +
          '\n' +
          '⚠️ No escribiste ningún artista o canción\n' +
          '\n' +
          '💡 Usá el formato correcto:\n' +
          `_/${command} ozuna el mar_\n` +
          `_/${command} bad bunny tití me preguntó_\n` +
          '\n' +
          '_Indicame qué querés escuchar_ 🌙'
        )
      }, { quoted: m });
    }

    const res = await ft(SERVER_URL + '/api/yt/search?q=' + encodeURIComponent(text), DL_HEADERS);
    if (!res.ok) throw new Error('Error al conectar con el servidor');
    const data = await res.json();

    const videos = data?.videos?.slice(0, 20);

    if (!videos || videos.length === 0) {
      return await conn.sendMessage(m.chat, {
        text: (
          `🎵 *${BOT()} — Buscador de Playlist*\n` +
          '\n' +
          '😔 No encontré resultados para:\n' +
          `"${text}"\n` +
          '\n' +
          '💡 Intentá con otro nombre o revisá la ortografía\n' +
          '_A veces funciona mejor escribirlo en inglés_ 🌙'
        )
      }, { quoted: m });
    }

    const userName = await conn.getName(m.sender);

    const fakeQuoted = {
      key: {
        participants: '0@s.whatsapp.net',
        remoteJid: 'status@broadcast',
        fromMe: false,
        id: 'Luna-Playlist'
      },
      message: {
        contactMessage: {
          vcard:
            'BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:🎵 ' + BOT() + ' Playlist\n' +
            'item1.TEL;waid=' + m.sender.split('@')[0] + ':' + m.sender.split('@')[0] +
            '\nitem1.X-ABLabel:Ponsel\nEND:VCARD'
        }
      },
      participant: '0@s.whatsapp.net'
    };

    const listContent = {
      title: '🎵 RESULTADOS DE BÚSQUEDA',
      sections: [
        {
          title: '🎧 DESCARGAR AUDIO MP3',
          rows: videos.map((v, i) => ({
            header: (i + 1) + '. ' + (v.title || '').substring(0, 50) + (v.title?.length > 50 ? '...' : ''),
            title: '' + (v.author?.name || v.author || 'Desconocido'),
            description:
              '⏱️ ' + secondString(v.duration?.seconds || 0) +
              ' | 👁️ ' + MilesNumber(v.views || 0) + ' vistas',
            id: usedPrefix + 'ytmp3 ' + v.url
          }))
        },
        {
          title: '🎬 DESCARGAR VIDEO MP4',
          rows: videos.slice(0, 10).map((v, i) => ({
            header: 'VIDEO ' + (i + 1) + ': ' + (v.title || '').substring(0, 45) + '...',
            title: '' + (v.author?.name || v.author || 'Desconocido'),
            description: '⏱️ ' + secondString(v.duration?.seconds || 0) + ' | Descargar video',
            id: usedPrefix + 'ytmp4 ' + v.url
          }))
        }
      ]
    };

    const bodyText =
      '╭─────°.🌙.°·─────\n' +
      `│🎵 ${BOT()} Playlist\n` +
      '│\n' +
      `│🔍 Búsqueda: ${text}\n` +
      `│📊 Resultados: ${videos.length}\n` +
      `│👤 Usuario: ${userName}\n` +
      '│\n' +
      '│🎧 Seleccioná audio o video\n' +
      '╰─────°.🌙.°·─────';

    const waMsg = generateWAMessageFromContent(m.chat,
      proto.Message.fromObject({
        interactiveMessage: {
          header: {
            title: '',
            subtitle: '🎵 Seleccioná tu música',
            hasMediaAttachment: false
          },
          body: { text: bodyText },
          footer: { text: `🌙 ${BOT()} | Sistema de Descargas` },
          nativeFlowMessage: {
            buttons: [{
              name: 'single_select',
              buttonParamsJson: JSON.stringify(listContent)
            }]
          }
        }
      }),
      { quoted: fakeQuoted }
    );

    await conn.relayMessage(m.chat, waMsg.message, { messageId: waMsg.key.id });

  } catch (err) {
    console.error(err);
    await conn.sendMessage(m.chat, {
      text: (
        `🎵 *${BOT()} — Buscador de Playlist*\n` +
        '\n' +
        '❌ No se pudo procesar la búsqueda\n' +
        `📛 ${err.message || 'Error desconocido'}\n` +
        '\n' +
        '_Intentá de nuevo en unos segundos_ 🌙'
      )
    }, { quoted: m });
  }
};

handler.command = ['playlist', 'playsearch', 'pl'];
handler.help    = ['playlist nombre de canción'];
handler.tags    = ['downloader'];

export default handler;
