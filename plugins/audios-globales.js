import fetch from 'node-fetch'
import ffmpeg from 'fluent-ffmpeg'
import { Readable } from 'stream'
import { PassThrough } from 'stream'
import { getConfig } from '../lib/funcConfig.js'
import { getSinPrefijo } from '../lib/sinPrefijo.js'

const BASE = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/audio'

const handler = (m) => m

handler.all = async function (m, { conn }) {
  try {
    if (!m || m.fromMe || m.isBaileys || !m.id) return
    if (!conn?.user) return
    if (!m.chat.endsWith('@g.us')) return

    const text = (m.text || '').trim()
    if (!text) return

    const sinPrefijoActivo = getSinPrefijo(m.chat)
    if (sinPrefijoActivo) return

    const first = text.trim().split(/\s+/)[0]
    const prefijos = ['.', '#', '/', '!', '?', '$', '%', '&', '*']
    if (prefijos.includes(first[0])) return
    if (m.isCommand) return
    if (m.commandSinPrefijo) return
    if (text.length < 2) return

    const chat = getConfig(m.chat) || {}
    const audiosEnabled = chat.audios !== undefined ? chat.audios : true
    if (chat.isBanned) return
    if (!audiosEnabled) return

    const audios = {
      'hola bot': 'holis.mp3',
      'que no': 'elmo-si-o-no.mp3',
      'anadieleimporta|a nadie le importa': '01J6734W48PG8EA14QW517QR2K.mp3',
      'araara|ara ara': 'ara-ara_NGiqCMS.mp3',
      'miarda de bot|mierda de bot|mearda de bot': '01J673T2Q92H3A0AW5B8RHA2N0.mp3',
      'bañate': '01J672VZBZ488TCVYA7KBB3TFG.mp3',
      'baneado': '01J672WYXHW6JM3T8PCNQHH6MN.mp3',
      'bebito fiu fiu|bff': '01J672XP5MW9J5APRSDFYRTTE9.mp3',
      'buenas noches|boanoite': '01J672YMA8AS2Z8YFMHB68GBQX.mp3',
      'buenas tardes|boatarde': '01J672ZCDK26GJZQ5GDP60TZ37.mp3',
      'buenos dias|buenos días': '01J6730WRS4KJEZ281N2KJR1SV.mp3',
      'sexo|hora de sexo': 'AUD-20250531-WA0049.mp3',
      'gemidos|gemime|gime': '01J673B4CRSS9Z2CX6E4R8MZPZ.mp3',
      'audio hentai|audiohentai': '01J673BTPKK29A7CVJW9WKXE9T.mp3',
      'fiesta del admin': '01J672T4VQFK8ZSSD1G0MXMPD3.mp3',
      'te amo|teamo': '01J6748B0RYBJWX5TBMWQZYX95.mp3',
      'siu|siiuu|siuuu': '01J6747RFN09GR42AXY18VFW10.mp3',
      'uwu': '01J674A7N7KNER6GY6FCYTTZSR.mp3',
      'yamete|yamete kudasai': 'yamete-kudasai-ah-made-with-Voicemod.mp3',
      'vivan los novios': '01J674D3S12JTFDETTNF12V4W8.mp3',
      'gatito|gato|oiia|oia|uiia': 'gatoxd.mp3',
      'free fire|noche de free fire': 'hoy-es-noche-de-free-fire-made-with-Voicemod.mp3',
      'pasa pack': '01J6735MY23DV6ES9XHBP06K9R.mp3',
      'la bebesita|la bebecita|la bbsita|santurrona': 'la-bebecita-saturado.mp3',
      '5 noche con mi tío|5 noches con mi tio|5 noches con alfredo|fainas and freddy': '5-noches-con-mi-tio.mp3',
       'no digas mamadas|no mamadas|no digas eso': 'no-digas-mamadas_4Q3vIm8.mp3',
       'ay despacito|ay despacio|ay despacio|ay suave': 'ay-despacito.mp3',
       'comando estelar|estelar|comando|refuerzos': 'comando-estelar-necesito-ayuda.mp3',
       'decir estupideces|estupideces|decir tonterías': 'decir-estupideces.mp3',
       'mil quiniento|pvtas|cuanto cobras': '1500-es-hora-y-media.mp3',
       'a mi se me hace que': 'a-mi-se-me-hace-que-eres-marica_INzinVu.mp3',
       'que dificil|dificil|complicado|que complicado': 'que-dificil-me-la-pusiste-diablo.mp3',
       'troleado|troll|trolls': 'whatsapp-audio-2019-09-08-at-225441.mp3',
       'por fin apareció|por fin apareciste|al fin llegas|te tarda|por fin llegas|por fin llegaste|te tardaste': 'por-fin-apareciste-malnacido-picoro.mp3' 
    }

    const lower = text.toLowerCase()
    let matchedFile = null

    for (const [trigger, file] of Object.entries(audios)) {
      const keywords = trigger.split('|')
      if (keywords.find(k => lower.includes(k))) {
        matchedFile = file
        break
      }
    }

    if (!matchedFile) return

    const audioUrl = `${BASE}/${encodeURIComponent(matchedFile)}`
    const res = await fetch(audioUrl)
    if (!res.ok) return

    const mp3Buffer = Buffer.from(await res.arrayBuffer())
    const oggBuffer = await convertToOgg(mp3Buffer)

    await conn.sendPresenceUpdate('recording', m.chat)
    await new Promise(res => setTimeout(res, 1200))

    if (!conn?.user) return

    await conn.sendMessage(m.chat, { audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })

  } catch (e) {
    console.error('[AUDIO-DEBUG] 💥 Error inesperado:', e)
  }

  return false
}

function convertToOgg(mp3Buffer) {
  return new Promise((resolve, reject) => {
    const input = new Readable()
    input.push(mp3Buffer)
    input.push(null)

    const output = new PassThrough()
    const chunks = []
    output.on('data', chunk => chunks.push(chunk))
    output.on('end', () => resolve(Buffer.concat(chunks)))
    output.on('error', reject)

    ffmpeg(input)
      .inputFormat('mp3')
      .audioCodec('libopus')
      .audioChannels(1)
      .audioFrequency(48000)
      .audioBitrate('128k')
      .outputOptions(['-application voip', '-frame_duration 20', '-packet_loss 0'])
      .format('ogg')
      .on('error', reject)
      .pipe(output)
  })
}

export default handler
