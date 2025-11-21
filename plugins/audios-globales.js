import fs from 'fs'
import { getConfig } from '../lib/funcConfig.js'

const handler = (m) => m

const recentAudios = new Map()
const MAX_AUDIO_CACHE = 100 
const AUDIO_CACHE_TTL = 15000

function cleanupAudioCache() {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, timestamp] of recentAudios.entries()) {
    if (now - timestamp > AUDIO_CACHE_TTL) {
      recentAudios.delete(key)
      cleaned++
    }
  }
  

  if (recentAudios.size > MAX_AUDIO_CACHE) {
    const entriesToDelete = Math.ceil((recentAudios.size - MAX_AUDIO_CACHE) * 1.5)
    let deleted = 0
    for (const [key] of recentAudios.entries()) {
      if (deleted >= entriesToDelete) break
      recentAudios.delete(key)
      deleted++
    }
    cleaned += deleted
  }
  
  return cleaned
}

function isDuplicateAudio(messageId, trigger) {
  if (!messageId || !trigger) return false
  const key = `${messageId}_${trigger}`
  
 
  if (recentAudios.size % 50 === 0 && recentAudios.size > 0) {
    cleanupAudioCache()
  }
  
  if (recentAudios.has(key)) return true
  
  recentAudios.set(key, Date.now())
  return false
}

handler.all = async function (m, { conn }) {
  try {
    if (!m || m.fromMe || m.isBaileys || !m.id) return

    const text = (m.text || '').trim()
    if (!text) return

    if (text.length < 2) return

    const chat = getConfig(m.chat) || {}
    const settings = (global.db.data.settings && global.db.data.settings[conn.user.jid]) || {}

    if (chat.isBanned) return

    const audiosEnabled = chat.audios !== undefined ? chat.audios : true
    const audiosBotEnabled = settings.audios_bot !== undefined ? settings.audios_bot : true
    if (!audiosEnabled || !audiosBotEnabled) return

    const audios = {
      'hola': '01J673CQ9ZE93TRQKCKN9Q8Z0M.mp3',
      'que no': '01J6745EH5251SV6HT327JJW9G.mp3',
      'anadieleimporta|a nadie le importa': '01J6734W48PG8EA14QW517QR2K.mp3',
      'araara|ara ara': '01J672TYT2TFVG5NT5QVPJ8XHX.mp3',
      'miarda de bot|mierda de bot|mearda de bot': '01J673T2Q92H3A0AW5B8RHA2N0.mp3',
      'baÃ±ate': '01J672VZBZ488TCVYA7KBB3TFG.mp3',
      'baneado': '01J672WYXHW6JM3T8PCNQHH6MN.mp3',
      'bebito fiu fiu|bff': '01J672XP5MW9J5APRSDFYRTTE9.mp3',
      'buenas noches|boanoite': '01J672YMA8AS2Z8YFMHB68GBQX.mp3',
      'buenas tardes|boatarde': '01J672ZCDK26GJZQ5GDP60TZ37.mp3',
      'buenos dias|buenos dÃ­as': '01J6730WRS4KJEZ281N2KJR1SV.mp3',
      'sexo|hora de sexo': 'AUD-20250531-WA0049.mp3',
      'gemidos|gemime|gime': '01J673B4CRSS9Z2CX6E4R8MZPZ.mp3',
      'audio hentai|audiohentai': '01J673BTPKK29A7CVJW9WKXE9T.mp3',
      'fiesta del admin': '01J672T4VQFK8ZSSD1G0MXMPD3.mp3',
      'te amo|teamo': '01J6748B0RYBJWX5TBMWQZYX95.mp3',
      'siu|siiuu|siuuu': '01J6747RFN09GR42AXY18VFW10.mp3',
      'uwu': '01J674A7N7KNER6GY6FCYTTZSR.mp3',
      'yamete|yamete kudasai': '01J674DR0CB7BD43HHBN1CBBC8.mp3',
      'vivan los novios': '01J674D3S12JTFDETTNF12V4W8.mp3',
      'gatito|gato|oiia|oia|uiia|Gato|Gatito|Oiia|Oia|Uiia': 'gatoxd.mp3',
      'A': '01J672JMF3RCG7BPJW4X2P94N2.mp3',
      'pasa pack': '01J6735MY23DV6ES9XHBP06K9R.mp3'
    }

    const lower = text.toLowerCase()

    let matchedKeyword = null
    let filePath = null

    for (const [trigger, file] of Object.entries(audios)) {
      const keywords = trigger.split('|')
      const found = keywords.find(k => lower.includes(k))
      if (found) {
        matchedKeyword = found
        filePath = `./src/assets/audio/${file}`
        break
      }
    }

    if (!matchedKeyword || !filePath) return

    if (!fs.existsSync(filePath)) return
    if (isDuplicateAudio(m.id, matchedKeyword)) return

    try {
      await conn.sendPresenceUpdate('recording', m.chat)
      await new Promise(resolve => setTimeout(resolve, 1200))

      await conn.sendFile(m.chat, filePath, 'audio.mp3', '', m, true, {
        mimetype: 'audio/mpeg'
      })
    } catch (sendError) {
      console.error('Error enviando audio global:', sendError)
    }
  } catch (e) {
    console.error('Error en audios-globales.js:', e)
  }
}

export default handler