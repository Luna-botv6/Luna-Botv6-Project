import fs from 'fs';
const configContent = fs.readFileSync('./config.js', 'utf-8');
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado: Luna-Botv6 no encontrado.');

import fetch from 'node-fetch';
import yts from 'yt-search';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

const _0x5678 = (function() {
  const _0xdef = ['sendMessage','relayMessage','audio','fileName','mimetype','quoted'];
  return function(i){ return _0xdef[i]; };
})();

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text || !text.trim()) {
      return await conn[_0x5678(0)](m.chat, {
        text: '⚠️ Escribe el nombre de la canción o artista\n\nEjemplo: /playlist ozuna el mar'
      }, { quoted: m });
    }

    await conn.sendMessage(m.chat, { text: '🔍 Buscando resultados...' }, { quoted: m });

    const searchResults = await yts(text);
    const videos = searchResults.videos.slice(0, 20);

    if (!videos || videos.length === 0) {
      return await conn[_0x5678(0)](m.chat, {
        text: `❌ No se encontraron resultados para: "${text}"`
      }, { quoted: m });
    }

    let fkontak = { 
      key: { 
        participants: "0@s.whatsapp.net", 
        remoteJid: "status@broadcast", 
        fromMe: false, 
        id: "Luna-Playlist" 
      }, 
      message: { 
        contactMessage: { 
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:🎵 Luna-Botv6 Playlist\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` 
        }
      }, 
      participant: "0@s.whatsapp.net" 
    };

    const buttonParamsJson = {
      title: "🎵 RESULTADOS DE BÚSQUEDA",
      sections: [
        {
          title: `🎧 DESCARGAR AUDIO MP3`,
          rows: videos.map((v, i) => ({
            header: `${i + 1}. ${v.title.substring(0, 50)}${v.title.length > 50 ? '...' : ''}`,
            title: `${v.author.name}`,
            description: `⏱️ ${secondString(v.duration.seconds)} | 👁️ ${MilesNumber(v.views)} vistas`,
            id: `${usedPrefix}ytmp3 ${v.url}`
          }))
        },
        {
          title: "🎬 DESCARGAR VIDEO MP4",
          rows: videos.slice(0, 10).map((v, i) => ({
            header: `VIDEO ${i + 1}: ${v.title.substring(0, 45)}...`,
            title: `${v.author.name}`,
            description: `⏱️ ${secondString(v.duration.seconds)} | Descargar video`,
            id: `${usedPrefix}ytmp4 ${v.url}`
          }))
        }
      ]
    };

    const name = await conn.getName(m.sender);
    
    const interactiveMsg = generateWAMessageFromContent(m.chat, proto.Message.fromObject({
      interactiveMessage: {
        header: { 
          title: "", 
          subtitle: "🎵 Selecciona tu música", 
          hasMediaAttachment: false 
        },
        body: { 
          text: `╭─────°.🌙.°·─────
│🎵 Luna-Botv6 Playlist
│🔍 Búsqueda: ${text}
│📊 Resultados: ${videos.length}
│👤 Usuario: ${name}
│🎧 Selecciona audio o video
╰─────°.🌙.°·─────`
        },
        footer: { 
          text: "🌙 Luna-Botv6 | Sistema de Descargas" 
        },
        nativeFlowMessage: {
          buttons: [
            { name: "single_select", buttonParamsJson: JSON.stringify(buttonParamsJson) }
          ]
        }
      }
    }), { quoted: fkontak });

    await conn[_0x5678(1)](m.chat, interactiveMsg.message, { messageId: interactiveMsg.key.id });

  } catch (e) {
    console.error(e);
    await conn[_0x5678(0)](m.chat, {
      text: '❌ Error al procesar la búsqueda. Intenta nuevamente.'
    }, { quoted: m });
  }
};

handler.command = ['playlist', 'playsearch', 'pl'];
handler.help = ['playlist'];
handler.tags = ['downloader'];
export default handler;

function MilesNumber(n) {
  const e = /(\d)(?=(\d{3})+(?!\d))/g;
  const r = '$1.';
  const a = n.toString().split('.');
  a[0] = a[0].replace(e, r);
  return a[1] ? a.join('.') : a[0];
}

function secondString(s) {
  s = Number(s);
  const d = Math.floor(s / (3600 * 24));
  const h = Math.floor((s % (3600 * 24)) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const S = Math.floor(s % 60);
  const dD = d > 0 ? d + (d == 1 ? ' día, ' : ' días, ') : '';
  const hD = h > 0 ? h + (h == 1 ? ' hora, ' : ' horas, ') : '';
  const mD = m > 0 ? m + (m == 1 ? ' minuto, ' : ' minutos, ') : '';
  const sD = S > 0 ? S + (S == 1 ? ' segundo' : ' segundos') : '';
  return dD + hD + mD + sD;
}