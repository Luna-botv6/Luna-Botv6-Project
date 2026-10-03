import { downloadMediaMessage } from '@whiskeysockets/baileys'
import * as _baileys from '@whiskeysockets/baileys'

const areJidsSameUser = _baileys.areJidsSameUser || ((a, b) => String(a || '').split('@')[0].split(':')[0] === String(b || '').split('@')[0].split(':')[0])

import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import { dispatchToPlugins } from './pluginDispatch.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'
import { obtenerMenuChat, verificarMenuChat } from '../src/assets/images/menu/languages/es/menu-img.js'
import { getConfig } from '../lib/funcConfig.js'
import { checkUserPermissions } from '../lib/funcion/userPermissions.js'

try { verificarMenuChat() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuChat()
const API_KEY = cargarOGenerarAPIKey()

function _decodeJid(j, conn) {
  try {
    const fn = conn?.decodeJid || global?.conn?.decodeJid
    if (fn) return fn.call(conn || global.conn, j)
  } catch {}
  return j
}

function _normNum(j) {
  try { return String(j || '').replace(/\D/g, '') } catch { return '' }
}

function _sameUser(a, b, conn) {
  if (!a || !b) return false
  try { if (areJidsSameUser(_decodeJid(a, conn), _decodeJid(b, conn))) return true } catch {}
  const na = _normNum(a), nb = _normNum(b)
  if (na && nb && na === nb) return true
  return false
}

function _getBaseMessage(msg) {
  if (!msg || !msg.message) return msg || {}
  return (
    msg.message.viewOnceMessage?.message ||
    msg.message.viewOnceMessageV2?.message ||
    msg.message.viewOnceMessageV2Extension?.message ||
    msg.message
  )
}

function getAudioMessage(msg) {
  const m = _getBaseMessage(msg)
  return m?.audioMessage || m?.pttMessage || null
}

function _getBaseQuoted(q) {
  if (!q) return q
  return (
    q.viewOnceMessage?.message ||
    q.viewOnceMessageV2?.message ||
    q.viewOnceMessageV2Extension?.message ||
    q
  )
}

function getQuotedAudio(msg) {
  const ctx = getQuotedContext(msg)
  const q = ctx?.quotedMessage
  if (!q) return null
  const qb = _getBaseQuoted(q)
  return qb?.audioMessage || qb?.pttMessage || null
}

function getQuotedContext(msg) {
  const m = _getBaseMessage(msg)
  const ctx =
    m?.extendedTextMessage?.contextInfo ||
    m?.imageMessage?.contextInfo ||
    m?.videoMessage?.contextInfo ||
    m?.documentMessage?.contextInfo ||
    m?.stickerMessage?.contextInfo ||
    m?.audioMessage?.contextInfo ||
    m?.pttMessage?.contextInfo ||
    m?.buttonsMessage?.contextInfo ||
    m?.templateMessage?.contextInfo ||
    m?.listMessage?.contextInfo ||
    m?.contactMessage?.contextInfo ||
    m?.locationMessage?.contextInfo ||
    m?.pollCreationMessage?.contextInfo ||
    null
  return ctx
}

export function isVoiceMessage(msg, conn) {
  const audio = getAudioMessage(msg)
  if (!audio) return false
  const ctx = getQuotedContext(msg)
  if (!ctx?.quotedMessage) return false
  const botCandidates = [
    conn?.user?.jid,
    conn?.user?.id,
    global?.conn?.user?.jid,
    global?.conn?.user?.id,
    conn?.user?.lid,
    global?.conn?.user?.lid
  ].filter(Boolean)
  const check = [
    ctx?.participant,
    ctx?.senderJid,
    ctx?.quotedParticipant,
    ctx?.quotedRemoteJid,
    ctx?.remoteJid,
    ...(Array.isArray(ctx?.mentionedJid) ? ctx.mentionedJid : []),
    ...(Array.isArray(ctx?.contextInfo?.mentionedJid) ? ctx.contextInfo?.mentionedJid : [])
  ].filter(Boolean)
  if (botCandidates.length === 0) return true
  for (const b of botCandidates) {
    for (const s of check) {
      if (_sameUser(s, b, conn)) return true
    }
  }
  return false
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

function puedeUsarIA(conn, msg, chatId) {
  try {
    const settings = global.db?.data?.settings?.[conn?.user?.jid]
    if (settings?.iaLunaActive === false) return false

    const sender = msg.key.participant || msg.key.remoteJid
    const senderNum = String(sender || '').replace(/\D/g, '')
    let isOwner = false
    let isROwner = false
    try {
      if (!msg.sender) msg.sender = sender
      if (!msg.chat) msg.chat = chatId
      const perms = checkUserPermissions(msg, conn)
      isOwner = !!perms?.isOwner
      isROwner = !!perms?.isROwner
    } catch {
      const ownerNums = [...(global.owner || []).map(o => Array.isArray(o) ? o[0] : o), ...(global.lidOwners || [])].map(n => String(n || '').replace(/\D/g, '')).filter(Boolean)
      isOwner = !!senderNum && ownerNums.includes(senderNum)
    }

    if (String(chatId || '').endsWith('@g.us')) {
      const chat = getConfig(chatId)
      if (chat?.modoadmin && !isOwner && !isROwner) return false

      const muteDB = global.db?.data?.mutes || {}
      const muted = Object.entries(muteDB).some(([k, val]) => {
        if (!k.startsWith(chatId + '_')) return false
        if (!k.replace(/[^0-9]/g, '').includes(senderNum)) return false
        if (val?.until && Date.now() > val.until) return false
        return true
      })
      if (muted) return false
    }

    if (global.db?.data?.users?.[sender]?.banned) return false
    return true
  } catch (e) {
    console.error('[VOICE-HANDLER] Error validando permisos:', e.message)
    return false
  }
}

export async function handleVoiceMessage(conn, msg, chatId, recentMsgs) {
  try {
    const directAudio = getAudioMessage(msg)
    const audioMsg = directAudio || getQuotedAudio(msg)
    if (!audioMsg) return
    if (!puedeUsarIA(conn, msg, chatId)) return

    let dlMsg
    if (directAudio) {
      const base = _getBaseMessage(msg)
      dlMsg = base ? { key: msg.key, message: base } : msg
    } else {
      dlMsg = msg
    }
    const buffer = await downloadMediaMessage(dlMsg, 'buffer', {})
    if (!buffer || !buffer.length) {
      await conn.sendMessage(chatId, { text: 'No pude descargar ese audio, podÃ©s mandarlo de nuevo' }, { quoted: msg })
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
        const ytLine     = song.youtube ? `\n\nEscuchala aca: ${song.youtube}` : ''
        await conn.sendMessage(chatId, { text: `La cancion es *${song.title}*${artistLine}.${ytLine}` }, { quoted: msg })
        return
      }
      await conn.sendMessage(chatId, { text: 'No logre entender bien ese audio, me lo escribis o lo repetis mas clarito?' }, { quoted: msg })
      return
    }

    const senderId = msg.key.participant || msg.key.remoteJid
    const groupData = await getGroupDataForPlugin(conn, chatId, senderId)

    const context = {
      conn,
      msg,
      jid: chatId,
      isGroup: String(chatId || '').endsWith('@g.us'),
      isPrivate: !String(chatId || '').endsWith('@g.us'),
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
      await conn.sendMessage(chatId, { text: 'Tuve un problema procesando ese audio, proba de nuevo.' }, { quoted: msg })
    } catch {}
  }
}
