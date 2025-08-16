import axios from 'axios';
import * as cheerio from 'cheerio';

const handler = async (m, { conn, args, command, usedPrefix }) => {
  if (!args[0]) {
    return conn.reply(m.chat, `*[!] Ingresa un enlace de Facebook para descargar el video.*\n\n*Ejemplo:*\n${usedPrefix + command} https://www.facebook.com/watch?v=123456789`, m);
  }
  
  if (!args[0].match(/facebook\.com|fb\.watch|m\.facebook\.com/)) {
    return conn.reply(m.chat, `*[!] El enlace no parece ser válido de Facebook.*\n\n*Ejemplo:*\n${usedPrefix + command} https://www.facebook.com/watch?v=123456789`, m);
  }

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
  
  const contenido = `✅ *VIDEO DE FACEBOOK*\n\n📱 *Descargando...*`;
  await conn.reply(m.chat, contenido, m);

  try {
    // Usar la API de instatiktok.com
    const links = await fetchDownloadLinks(args[0], 'facebook', conn, m);
    
    if (!links) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      return;
    }

    if (links.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      return await conn.reply(m.chat, '*[❌] No se encontraron enlaces de descarga.*', m);
    }

    // Obtener el enlace de descarga para Facebook
    let download = getDownloadLink('facebook', links);

    if (!download) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      return await conn.reply(m.chat, '*[❌] Error al obtener el enlace de descarga.*', m);
    }

    try {
      const ext = download.includes('.mp4') ? 'mp4' : 'jpg';
      const caption = `✅ *VIDEO DE FACEBOOK*\n\n🎬 *Descargado exitosamente*\n📡 *Fuente:* InstaTikTok`;

      if (ext === 'mp4') {
        await conn.sendMessage(m.chat, { 
          video: { url: download }, 
          caption: caption 
        }, { quoted: m });
      } else {
        await conn.sendMessage(m.chat, { 
          image: { url: download }, 
          caption: caption 
        }, { quoted: m });
      }

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});

    } catch (sendError) {
      console.log('Error al enviar el archivo:', sendError.message);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      return await conn.reply(m.chat, `*[❌] Error al enviar el archivo:* ${sendError.message}`, m);
    }

  } catch (error) {
    console.log('Error en downloader:', error);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
    return await conn.reply(m.chat, `*[❌] Ocurrió un error:*\n${error.message || error}`, m);
  }
};

// Función para obtener los enlaces de descarga
async function fetchDownloadLinks(text, platform, conn, m) {
  const { SITE_URL, form } = createApiRequest(text, platform);

  try {
    const res = await axios.post(`${SITE_URL}api`, form.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': SITE_URL,
        'Referer': SITE_URL,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 15000
    });

    const html = res?.data?.html;
    
    if (!html || res?.data?.status !== 'success') {
      await conn.reply(m.chat, '*[❌] Error al obtener datos del servidor.*', m);
      return null;
    }

    const $ = cheerio.load(html);
    const links = [];
    
    $('a.btn[href^="http"]').each((_, el) => {
      const link = $(el).attr('href');
      if (link && !links.includes(link)) {
        links.push(link);
      }
    });

    console.log('Enlaces encontrados:', links);
    return links;

  } catch (error) {
    console.log('Error en fetchDownloadLinks:', error.message);
    await conn.reply(m.chat, `*[❌] Error de conexión:* ${error.message}`, m);
    return null;
  }
}

// Función para crear la petición a la API
function createApiRequest(text, platform) {
  const SITE_URL = 'https://instatiktok.com/';
  const form = new URLSearchParams();
  form.append('url', text);
  form.append('platform', platform);
  form.append('siteurl', SITE_URL);
  return { SITE_URL, form };
}

// Función para obtener el enlace de descarga según la plataforma
function getDownloadLink(platform, links) {
  if (platform === 'instagram') {
    return links;
  } else if (platform === 'tiktok') {
    return links.find(link => /hdplay/.test(link)) || links[0];
  } else if (platform === 'facebook') {
    // Para Facebook, toma el último enlace (generalmente la mejor calidad)
    return links.at(-1);
  }
  return null;
}

handler.help = ['facebook', 'fb'];
handler.tags = ['downloader'];
handler.command = /^(facebook|fb|facebookdl|fbdl)$/i;
handler.limit = 3;
handler.register = true;

export default handler;