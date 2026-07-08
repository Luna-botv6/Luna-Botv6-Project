import { downloadMediaMessage } from '@whiskeysockets/baileys'
// ⚠️ CONFIRMAR: asumí que tu bot usa @whiskeysockets/baileys y esta función
// para descargar medios. Si tu fork usa otra cosa (por ejemplo
// `conn.downloadMediaMessage(msg)`, `conn.downloadM(msg)`, o un helper propio
// en lib/), cambiá SOLO esta línea de import y la línea marcada más abajo
// donde se llama — el resto del archivo no depende de cuál sea.

import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import { dispatchToPlugins } from './pluginDispatch.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const SERVER_URL = 'http://nweb.boxmine.xyz:4017'
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

export async function handleVoiceMessage(conn, msg, chatId, recentMsgs) {
  try {
    const audioMsg = getAudioMessage(msg)
    if (!audioMsg) return

    // Por default el bot NO escucha audios en un grupo: hace falta que un
    // admin lo prenda con el comando /audioia on. Si está apagado, se
    // ignora el audio en silencio (no se descarga ni se transcribe nada).
    const audioIAEnabled = !!global.db?.data?.chats?.[chatId]?.audioIAEnabled
    if (!audioIAEnabled) return

    // ⚠️ Línea a confirmar/ajustar si tu fork descarga medios distinto.
    const buffer = await downloadMediaMessage(msg, 'buffer', {})
    if (!buffer || !buffer.length) {
      await conn.sendMessage(chatId, { text: '😅 No pude descargar ese audio, ¿podés mandarlo de nuevo?' }, { quoted: msg })
      return
    }

    const mimeType = audioMsg.mimetype || 'audio/ogg'
    const base64 = buffer.toString('base64')

    await conn.sendPresenceUpdate?.('composing', chatId)
    const texto = await transcribir(base64, mimeType)

    if (!texto || !texto.trim()) {
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
      // Como el pedido llegó por voz, es natural que la respuesta también
      // vaya por voz — conversation-plugin.js usa este flag para pedirle
      // al server que fuerce audio en esta respuesta puntual.
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
