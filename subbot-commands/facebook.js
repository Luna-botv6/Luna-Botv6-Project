import axios from 'axios'
import * as cheerio from 'cheerio'
const userRequestTimes = new Map()
const MIN_DELAY = 5000

function checkRateLimit(userId) {
  const now = Date.now()
  const last = userRequestTimes.get(userId) || 0
  const diff = now - last
  if (diff < MIN_DELAY) {
    return { allowed: false, wait: Math.ceil((MIN_DELAY - diff) / 1000) }
  }
  userRequestTimes.set(userId, now)
  return { allowed: true, wait: 0 }
}

// Función para validar URLs de Facebook
function isValidFacebookUrl(url) {
  return /facebook\.com|fb\.watch|m\.facebook\.com/.test(url)
}

// Función para obtener los enlaces de descarga
async function fetchDownloadLinks(url) {
  const SITE_URL = 'https://instatiktok.com/'
  const form = new URLSearchParams()
  form.append('url', url)
  form.append('platform', 'facebook')
  form.append('siteurl', SITE_URL)

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
    })

    const html = res?.data?.html
    
    if (!html || res?.data?.status !== 'success') {
      throw new Error('No se pudieron obtener datos del servidor')
    }

    const $ = cheerio.load(html)
    const links = []
    
    $('a.btn[href^="http"]').each((_, el) => {
      const link = $(el).attr('href')
      if (link && !links.includes(link)) {
        links.push(link)
      }
    })

    return links.length > 0 ? links.at(-1) : null // Retorna el último (mejor calidad)

  } catch (error) {
    throw new Error(`Error de conexión: ${error.message}`)
  }
}

export default async function handler(sock, m, args) {
  try {
    const url = args.join(' ').trim()
    
    // Validar que se proporcione una URL
    if (!url) {
      return sock.sendMessage(m.chat, { 
        text: '❗ Proporciona un enlace de Facebook.\n\n📌 Ejemplo: /fb https://www.facebook.com/watch?v=123456789' 
      }, { quoted: m })
    }

    // Validar que sea una URL de Facebook
    if (!isValidFacebookUrl(url)) {
      return sock.sendMessage(m.chat, { 
        text: '❗ El enlace no es válido de Facebook.\n\n📌 Debe ser de: facebook.com, fb.watch o m.facebook.com' 
      }, { quoted: m })
    }

    // Verificar rate limiting
    const rate = checkRateLimit(m.sender)
    if (!rate.allowed) {
      return sock.sendMessage(m.chat, {
        text: `⏳ Espera ${rate.wait}s antes de usar este comando otra vez.`
      }, { quoted: m })
    }

    // Mensaje de descarga
    await sock.sendMessage(m.chat, {
      text: '📱 Descargando video de Facebook...\n⏱️ Esto puede tomar unos momentos.'
    }, { quoted: m })

    // Obtener enlace de descarga
    const downloadLink = await fetchDownloadLinks(url)
    
    if (!downloadLink) {
      throw new Error('No se encontraron enlaces de descarga disponibles')
    }

    // Determinar tipo de archivo
    const isVideo = downloadLink.includes('.mp4') || downloadLink.includes('video')
    const caption = `✅ *VIDEO DE FACEBOOK*\n\n🎬 Descargado exitosamente\n📡 Fuente: InstaTikTok\n🔗 Original: ${url.substring(0, 50)}...`

    // Enviar el archivo
    if (isVideo) {
      await sock.sendMessage(m.chat, { 
        video: { url: downloadLink }, 
        caption: caption
      }, { quoted: m })
    } else {
      await sock.sendMessage(m.chat, { 
        image: { url: downloadLink }, 
        caption: caption
      }, { quoted: m })
    }

  } catch (e) {
    console.error('❌ Error en /fb:', e)
    sock.sendMessage(m.chat, {
      text: `❌ Error descargando video de Facebook:\n${typeof e === 'string' ? e : e.message}`
    }, { quoted: m })
  }
}