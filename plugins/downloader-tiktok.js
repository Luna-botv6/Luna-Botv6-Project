import axios from 'axios';
import * as cheerio from 'cheerio';

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  if (!text) {
    return conn.reply(
      m.chat,
      `Ingresa un enlace de TikTok.\n\nEjemplo:\n${usedPrefix + command} https://www.tiktok.com/@lunabotv6/video/7562318278455037191`,
      m
    );
  }

  if (!/(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(text)) {
    return conn.reply(
      m.chat,
      `El enlace no parece ser válido.\n\nEjemplo:\n${usedPrefix + command} https://www.tiktok.com/@lunabotv6/video/7562318278455037191`,
      m
    );
  }

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  await conn.reply(m.chat, `Descargando video...`, m);

  try {
    const links = await fetchTikTokDownloadLinks(args[0]);
    if (!links?.length) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return conn.reply(m.chat, 'No se pudo obtener el video.', m);
    }

    const download = getTikTokDownloadLink(links);
    if (!download) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return conn.reply(m.chat, 'No se encontró un enlace de descarga válido.', m);
    }

    await conn.sendMessage(
      m.chat,
      {
        video: { url: download },
        caption: `✅ VIDEO DE TIKTOK\n\nDescargado exitosamente\nSin marca de agua\nFuente: InstaTikTok`
      },
      { quoted: m }
    );

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    return conn.reply(m.chat, `Error al descargar el video. Intenta con otro enlace.`, m);
  }
};

async function fetchTikTokDownloadLinks(url) {
  const SITE_URL = 'https://instatiktok.com/';
  const form = new URLSearchParams();
  form.append('url', url);
  form.append('platform', 'tiktok');
  form.append('siteurl', SITE_URL);

  const res = await axios.post(`${SITE_URL}api`, form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Origin': SITE_URL,
      'Referer': SITE_URL,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest'
    },
    timeout: 15000
  });

  const html = res?.data?.html;
  if (!html || res?.data?.status !== 'success') throw new Error('Respuesta inválida del servidor');

  const $ = cheerio.load(html);
  const links = [];
  $('a.btn[href^="http"]').each((_, el) => {
    const link = $(el).attr('href');
    if (link && !links.includes(link)) links.push(link);
  });
  return links;
}

function getTikTokDownloadLink(links) {
  if (!links?.length) return null;
  const hd = links.find(l => /hdplay/i.test(l));
  if (hd) return hd;
  const noWm = links.find(l => /nowm|no.*watermark/i.test(l));
  if (noWm) return noWm;
  return links[0];
}

handler.help = ['tiktok', 'tt'];
handler.tags = ['downloader'];
handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt|ttnowm|tiktokaudio)$/i;

export default handler;