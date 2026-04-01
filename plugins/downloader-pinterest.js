//Luna-Botv6-Project 
import axios from 'axios'
const { generateWAMessageContent, generateWAMessageFromContent, proto } = (await import('@whiskeysockets/baileys'))['default']

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const isUrl = (text) => {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch { return false }
}

const isPinterestUrl = (text) => /pinterest\.(com|es|co\.uk|fr|de)|pin\.it/i.test(text)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
  'Referer': 'https://www.pinterest.com/'
}

async function resolveShortUrl(url) {
  let current = url
  try {
    for (let i = 0; i < 10; i++) {
      const res = await axios.get(current, {
        maxRedirects: 0,
        timeout: 10000,
        headers: HEADERS,
        validateStatus: () => true
      })
      if ([301, 302, 303, 307, 308].includes(res.status) && res.headers?.location) {
        current = res.headers.location.startsWith('http') ? res.headers.location : 'https://www.pinterest.com' + res.headers.location
      } else break
    }
  } catch (e) {}
  return current
}

function extractPinId(url) {
  return url.match(/\/pin\/(\d+)/)?.[1] || null
}

function deepSearch(obj, keys, depth = 0) {
  if (depth > 10 || !obj || typeof obj !== 'object') return null
  for (const key of keys) {
    if (obj[key]) return obj[key]
  }
  for (const val of Object.values(obj)) {
    const found = deepSearch(val, keys, depth + 1)
    if (found) return found
  }
  return null
}

async function downloadPin(inputUrl) {
  const resolved = await resolveShortUrl(inputUrl)
  const pinId = extractPinId(resolved)
  if (!pinId) return null

  try {
    const { data: html } = await axios.get(`https://www.pinterest.com/pin/${pinId}/`, {
      timeout: 15000,
      headers: HEADERS
    })

    const pwsMatch = html.match(/<script id="__PWS_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (pwsMatch?.[1]) {
      try {
        const json = JSON.parse(pwsMatch[1])
        const allPins = json?.props?.initialReduxState?.pins || json?.initialReduxState?.pins || json?.props?.pageProps?.pins || {}
        const pin = allPins[pinId] || Object.values(allPins)[0] || null
        if (pin) {
          const videos = pin?.videos?.video_list || {}
          const videoUrl = videos?.V_720P?.url || videos?.V_480P?.url || videos?.V_240P?.url || null
          const imageUrl = pin?.images?.orig?.url || pin?.images?.['736x']?.url || null
          const title = pin?.title || pin?.description || 'Pinterest'
          if (videoUrl || imageUrl) return { video: videoUrl, image: imageUrl, title }
        }
      } catch (e) {}
    }

    for (const [, scriptContent] of [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]) {
      if (!scriptContent.includes(pinId)) continue
      try {
        const parsed = JSON.parse(scriptContent)
        const imageUrl = deepSearch(parsed, ['orig'])?.url || null
        const videoList = deepSearch(parsed, ['video_list'])
        const videoUrl = videoList?.V_720P?.url || videoList?.V_480P?.url || null
        if (imageUrl || videoUrl) return { video: videoUrl || null, image: imageUrl, title: 'Pinterest' }
      } catch { continue }
    }

    const patterns = [
      { type: 'video', regex: /"url"\s*:\s*"(https:\/\/v\.pinimg\.com[^"]+\.mp4[^"]*)"/ },
      { type: 'image', regex: /"url"\s*:\s*"(https:\/\/i\.pinimg\.com\/originals\/[^"]+)"/ },
      { type: 'image', regex: /property="og:image"\s+content="(https:\/\/i\.pinimg\.com[^"]+)"/ }
    ]

    let imageUrl = null
    let videoUrl = null
    for (const { type, regex } of patterns) {
      const match = html.match(regex)
      if (match?.[1]) {
        const u = match[1].replace(/\\\//g, '/')
        if (type === 'video' && !videoUrl) videoUrl = u
        if (type === 'image' && !imageUrl) imageUrl = u
      }
    }

    if (videoUrl || imageUrl) return { video: videoUrl, image: imageUrl, title: 'Pinterest' }
  } catch (e) {}

  return null
}

async function searchPinterest(query) {
  const apis = [
    {
      name: 'siputzx',
      url: `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`,
      parse: (data) => (data?.data || []).map(item => ({
        image: item.image_url || null,
        video: item.video_url || null,
        gif: item.gif_url || null,
        title: item.grid_title || item.description || '',
        pin: item.pin || ''
      })).filter(item => item.image || item.video || item.gif)
    },
    {
      name: 'ryzendesu',
      url: `https://api.ryzendesu.vip/api/search/pinterest?query=${encodeURIComponent(query)}`,
      parse: (data) => (Array.isArray(data?.data) ? data.data : []).map(item =>
        typeof item === 'string' ? { image: item, video: null, gif: null, title: '', pin: '' } : {
          image: item.image_url || item.url || null,
          video: item.video_url || null,
          gif: item.gif_url || null,
          title: item.title || '',
          pin: item.pin || ''
        }
      ).filter(item => item.image || item.video || item.gif)
    }
  ]

  for (const api of apis) {
    try {
      const { data } = await axios.get(api.url, { timeout: 10000 })
      const results = api.parse(data)
      if (results.length) return results
    } catch (e) {}
  }
  return []
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return conn.reply(m.chat,
`📌 *Pinterest* 

Con este comando puedes buscar imágenes y videos de Pinterest o descargar un pin directamente con su enlace.

🔎 *Buscar por palabra:*
${usedPrefix + command} Naruto
${usedPrefix + command} aesthetic wallpapers
${usedPrefix + command} recetas de cocina

⬇️ *Descargar con enlace:*
${usedPrefix + command} https://pin.it/xxxxxxx
${usedPrefix + command} https://pinterest.com/pin/123456

Te mostraré hasta 3 imágenes y 1 video si está disponible 🎬`, m)
  }

  if (isUrl(text) && isPinterestUrl(text)) {
    await conn.reply(m.chat, '⬇️ Descargando pin...', m)
    const pinData = await downloadPin(text)

    if (!pinData || (!pinData.video && !pinData.image)) {
      return conn.reply(m.chat, '❌ No pude obtener el contenido de ese pin. Intenta con otro enlace.', m)
    }

    if (pinData.video) {
      await conn.sendMessage(m.chat, { video: { url: pinData.video }, caption: `🎬 ${pinData.title}` }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { image: { url: pinData.image }, caption: `📌 ${pinData.title}` }, { quoted: m })
    }
    return
  }

  await conn.reply(m.chat, '🔎 Buscando en Pinterest...', m)
  const results = await searchPinterest(text)

  if (!results?.length) return conn.reply(m.chat, '❌ No encontré resultados para: ' + text, m)

  const shuffled = results.sort(() => Math.random() - 0.5)
  const images = shuffled.filter(i => i.image && !i.video).slice(0, 3)
  const video = shuffled.find(i => i.video)

  async function buildImageMessage(url) {
    const { imageMessage } = await generateWAMessageContent(
      { image: { url } },
      { upload: conn.waUploadToServer }
    )
    return imageMessage
  }

  const cards = []
  let index = 1

  for (const item of images) {
    try {
      const imageMsg = await buildImageMessage(item.image)
      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: item.title?.trim() || `Imagen - ${index}` }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: global.author || 'Pinterest' }),
        header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: true, imageMessage: imageMsg }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [{
            name: 'cta_url',
            buttonParamsJson: `{"display_text":"Ver en Pinterest 📌","Url":"${item.pin || 'https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(text)}","merchant_url":"https://www.pinterest.com/search/pins/?q=${encodeURIComponent(text)}"}`
          }]
        })
      })
      index++
    } catch (e) { index++ }
  }

  if (cards.length) {
    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({ text: `🔎 Resultados de: *${text}*` }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: '📌 `P I N T E R E S T - S E A R C H`' }),
            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
          })
        }
      }
    }, { quoted: m })
    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
  }

  if (video) {
    await sleep(2000)
    try {
      await conn.sendMessage(m.chat, { video: { url: video.video }, caption: `🎬 ${video.title?.trim() || 'Video - Pinterest'}` }, { quoted: m })
    } catch (e) {}
  }

  if (!cards.length && !video) return conn.reply(m.chat, '❌ No pude cargar los resultados. Intenta de nuevo.', m)
}

handler.help = ['pinterest <búsqueda | enlace>']
handler.tags = ['downloader']
handler.command = /^(pinterest|pin)$/i

export default handler