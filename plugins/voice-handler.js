import { downloadMediaMessage } from '@whiskeysockets/baileys'

import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import { dispatchToPlugins } from './pluginDispatch.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'
import { obtenerMenuChat, verificarMenuChat } from '../src/assets/images/menu/languages/es/menu-img.js'

try { verificarMenuChat() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuChat()
const API_KEY = cargarOGenerarAPIKey()

function getAudioMessage(msg) {
  return msg?.message?.audioMessage || null
}

export function isVoiceMessage(msg) {
  return !!getAudioMessage(msg)
}

async function transcribir(base64, mimeType) {
  try {
    const res = await fetch(SERVER_URL + '/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ audioBase64: base64, mimeType }),
      signal: AbortSignal.timeout(30000)
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.text || null
  } catch {
    return null
  }
}

async function reconocerCancion(base64, mimeType) {
  try {
    const res = await fetch(SERVER_URL + '/recognize-song', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify({ audioBase64: base64, mimeType }),
      signal: AbortSignal.timeout(40000)
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.match) return null
    return data
  } catch {
    return null
  }
}

const SONG_ASK_RE = /(?:como\s+se\s+llama\s*(?:esta|esa|la)?|que\s+(?:cancion|musica|tema|rola)\s+(?:es|esta|esa|esta\s+sonando|suena)|cual\s+es\s+(?:la\s+)?(?:cancion|musica|tema|rola)|nombre\s+de\s+(?:esta\s+|la\s+)?(?:cancion|musica|tema)|reconoc(e|es)\s+(?:esta\s+)?(?:cancion|musica|tema)|identifica\s+(?:esta\s+)?(?:cancion|musica|tema)|de\s+quien\s+es\s+(?:esta\s+)?(?:cancion|musica|tema))/i

export async function handleVoiceMessage(conn, msg, chatId, recentMsgs) {
  try {
    const audioMsg = getAudioMessage(msg)
    if (!audioMsg) return

   
    const audioIAEnabled = !!global.db?.data?.chats?.[chatId]?.audioIAEnabled
    if (!audioIAEnabled) return

    const buffer = await downloadMediaMessage(msg, 'buffer', {})
    if (!buffer || !buffer.length) {
      await conn.sendMessage(chatId, { text: '😅 No pude descargar ese audio, ¿podés mandarlo de nuevo?' }, { quoted: msg })
      return
    }

    const mimeType = audioMsg.mimetype || 'audio/ogg'
    const base64 = buffer.toString('base64')
    const voiceAudio = { base64, mimeType }

    await conn.sendPresenceUpdate?.('composing', chatId)
    const texto = await transcribir(base64, mimeType)

    const esInaudible = !texto || !texto.trim()

    if (esInaudible) {
      const song = await reconocerCancion(base64, mimeType)
      if (song) {
        const artistLine = song.artist ? ` de *${song.artist}*` : ''
        const ytLine     = song.youtube ? `\n\n▶️ Escuchala acá: ${song.youtube}` : ''
        await conn.sendMessage(chatId, { text: `🎵 La canción es *${song.title}*${artistLine}.${ytLine}` }, { quoted: msg })
        return
      }
      await conn.sendMessage(chatId, { text: '🎧 No logré entender bien ese audio, ¿me lo escribís o lo repetís más clarito?' }, { quoted: msg })
      return
    }

    const senderId = msg.key.participant || msg.key.remoteJid
    const groupData = await getGroupDataForPlugin(conn, chatId, senderId)

    const context = {
      conn,
      msg,
      jid: chatId,
      isGroup: true,
      isPrivate: false,
      groupData,
      mentionedJids: [],
      mentionedNames: {},
      botNumber: null,
      voiceAudio,
      forceVoiceReply: true
    }

    await dispatchToPlugins(texto, context)
  } catch (e) {
    console.error('[VOICE-HANDLER] Error:', e.message)
    try {
      await conn.sendMessage(chatId, { text: '😅 Tuve un problema procesando ese audio, probá de nuevo.' }, { quoted: msg })
    } catch {}
  }
}
