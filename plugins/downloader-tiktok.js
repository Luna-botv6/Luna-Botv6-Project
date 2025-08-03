import axios from 'axios';
import * as cheerio from 'cheerio';

const handler = async (m, {conn, text, args, usedPrefix, command}) => {
  // Validaciones básicas
  if (!text) {
    return conn.reply(m.chat, `*[!] Ingresa un enlace de TikTok para descargar el video.*\n\n*Ejemplo:*\n${usedPrefix + command} https://vm.tiktok.com/ZM686Q4ER/`, m);
  }
  
  if (!/(?:https:?\/{2})?(?:w{3}|vm|vt|t)?\.?tiktok.com\/([^\s&]+)/gi.test(text)) {
    return conn.reply(m.chat, `*[!] El enlace no parece ser válido de TikTok.*\n\n*Ejemplo:*\n${usedPrefix + command} https://vm.tiktok.com/ZM686Q4ER/`, m);
  }
  
  // Reacción de carga
  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
  
  // Mensaje de descarga simple
  const loadingMsg = await conn.reply(m.chat, `✅ *TIKTOK DOWNLOADER*\n\n📱 *Descargando video...*`, m);
  
  try {
    // Usar InstaTikTok API
    const links = await fetchTikTokDownloadLinks(args[0]);
    
    if (!links || links.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      return conn.reply(m.chat, '*[❌] No se pudo obtener el video. Verifica que el enlace sea válido y público.*', m);
    }

    // Obtener el mejor enlace de descarga
    const download = getTikTokDownloadLink(links);
    
    if (!download) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      return conn.reply(m.chat, '*[❌] No se encontró un enlace de descarga válido.*', m);
    }

    // Enviar el video sin marca de agua
    const caption = `✅ *VIDEO DE TIKTOK*\n\n🎬 *Descargado exitosamente*\n🚫 *Sin marca de agua*\n📡 *Fuente:* InstaTikTok`;
    
    await conn.sendMessage(m.chat, {
      video: { url: download }, 
      caption: caption
    }, { quoted: m });

    // Reacción de éxito
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
    
  } catch (error) {
    console.log('❌ Error en TikTok downloader:', error.message);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
    return conn.reply(m.chat, `*[❌] Error al descargar el video*\n\n*Posibles causas:*\n• Video privado\n• Enlace expirado\n• Servidor temporalmente fuera de servicio\n\n*Intenta con otro enlace*`, m);
  }
};

// Función para obtener enlaces de TikTok usando InstaTikTok
async function fetchTikTokDownloadLinks(url) {
  const SITE_URL = 'https://instatiktok.com/';
  const form = new URLSearchParams();
  form.append('url', url);
  form.append('platform', 'tiktok');
  form.append('siteurl', SITE_URL);

  try {
    const res = await axios.post(`${SITE_URL}api`, form.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': SITE_URL,
        'Referer': SITE_URL,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 15000
    });

    const html = res?.data?.html;
    
    if (!html || res?.data?.status !== 'success') {
      throw new Error('Respuesta inválida del servidor');
    }

    const $ = cheerio.load(html);
    const links = [];
    
    // Extraer todos los enlaces de descarga
    $('a.btn[href^="http"]').each((_, el) => {
      const link = $(el).attr('href');
      if (link && !links.includes(link)) {
        links.push(link);
      }
    });

    console.log(`✅ ${links.length} enlaces encontrados para TikTok`);
    return links;

  } catch (error) {
    console.log('❌ Error fetchTikTokDownloadLinks:', error.message);
    throw error;
  }
}

// Función para obtener el mejor enlace de descarga para TikTok
function getTikTokDownloadLink(links) {
  if (!links || links.length === 0) return null;
  
  // Prioridad 1: Buscar enlace con 'hdplay' (alta calidad sin marca de agua)
  const hdLink = links.find(link => /hdplay/i.test(link));
  if (hdLink) {
    console.log('✅ Enlace HD sin marca de agua encontrado');
    return hdLink;
  }
  
  // Prioridad 2: Buscar enlace con 'nowm' (sin marca de agua)
  const nowmLink = links.find(link => /nowm|no.*watermark/i.test(link));
  if (nowmLink) {
    console.log('✅ Enlace sin marca de agua encontrado');
    return nowmLink;
  }
  
  // Prioridad 3: Primer enlace disponible
  console.log('✅ Usando primer enlace disponible');
  return links[0];
}

handler.help = ['tiktok', 'tt'];
handler.tags = ['downloader'];
handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt|ttnowm|tiktokaudio)$/i;
handler.limit = 3;
handler.register = true;

export default handler;