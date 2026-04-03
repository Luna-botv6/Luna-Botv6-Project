import { loadAntiSpam, saveAntiSpam } from '../lib/antispamDB.js'
import { logSpamWarning, logSpamBan, logOwnerSpam } from '../lib/antispamLogger.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const SPAM_THRESHOLD = 18
const INTERVAL_MS = 30 * 1000
const WARNINGS_BEFORE_BAN_GROUP = 4
const WARNINGS_BEFORE_BAN_PRIVATE = 2
const WARNING_COOLDOWN = 3 * 60 * 1000

global.antispamActivo = true

const frasesOwnerSpam = [
  '👀 Ey jefe, tranquilo con los comandos que hasta yo me marco...',
  '😅 Casi te mando una advertencia, menos mal que eres el owner.',
  '🤙 Oye, ni yo aguanto tanto comando seguido. Respira un poco jefe.',
  '😂 Si fueras otro usuario ya te hubiera bloqueado. Pero bueno, eres el jefe.',
  '🙈 Detecte actividad sospechosa... ah no, eres tu. Sigue nomás.',
  '🫡 A tus ordenes, aunque me cansas un poco con tanto comando...',
]

function getRealSender(sender, conn) {
  if (sender.includes('@lid')) {
    const decoded = conn.decodeJid(sender)
    return decoded || sender
  }
  return sender
}

function isBotMessage(m) {
  if (m.isBaileys || m.fromMe) return true
  if (!m.text) return false
  const text = m.text
  const hasManyEmojis = (text.match(/[\u{1F300}-\u{1FFFF}]/gu) || []).length > 15
  const hasMenuStructure = (text.match(/[│┌┐└┘├┤]/g) || []).length > 3
  const hasCommandList = (text.match(/^[\/\!\.\,\#\*].+/gm) || []).length > 5
  const isVeryLong = text.length > 3000
  return (hasManyEmojis && isVeryLong) || hasMenuStructure || (hasCommandList && isVeryLong)
}

export async function before(m, { isCommand, conn }) {
  if (!global.antispamActivo || !m.sender || m.isBaileys || m.fromMe) return
  if (!m.text || !m.text.startsWith('/')) return
  if (isBotMessage(m)) return

  const sender = getRealSender(m.sender, conn)
  const senderNum = sender.split('@')[0]
  const isOwner = global.owner.some(([num]) => senderNum === num) || global.lidOwners.includes(senderNum)
  const now = Date.now()
  const isGroup = m.chat.endsWith('@g.us')

  const antispam = loadAntiSpam()
  antispam[sender] = antispam[sender] || {
    count: 0,
    lastTime: 0,
    warns: 0,
    lastWarnTime: 0,
    totalMessages: 0,
    comandos: [],
    firstDetection: Date.now()
  }
  const data = antispam[sender]

  data.totalMessages += 1

  const comando = m.text.split(' ')[0]
  if (!data.comandos) data.comandos = []
  data.comandos.push(`${comando} (${new Date().toLocaleTimeString('es-ES')})`)
  if (data.comandos.length > 50) data.comandos = data.comandos.slice(-50)

  if (now - data.lastTime < INTERVAL_MS) {
    data.count += 1
  } else {
    data.count = 1
  }
  data.lastTime = now

  let groupName = null
  if (isGroup) {
    try {
      const groupData = await getGroupDataForPlugin(conn, m.chat, sender)
      groupName = groupData.groupMetadata?.subject || null
    } catch (e) {}
  }

  const context = {
    isGroup,
    chatId: m.chat,
    groupName,
    intervalSeconds: INTERVAL_MS / 1000,
    warningsLimit: isGroup ? WARNINGS_BEFORE_BAN_GROUP : WARNINGS_BEFORE_BAN_PRIVATE
  }

  if (isOwner) {
    if (data.count > SPAM_THRESHOLD) {
      const frase = frasesOwnerSpam[Math.floor(Math.random() * frasesOwnerSpam.length)]
      await conn.sendMessage(m.chat, { text: frase }, { quoted: m })
      logOwnerSpam(sender, data.comandos || [], context)
    }
    saveAntiSpam(antispam)
    return
  }

  const warningsLimit = context.warningsLimit

  if (data.count > SPAM_THRESHOLD) {
    if (now - data.lastWarnTime < WARNING_COOLDOWN) {
      saveAntiSpam(antispam)
      return
    }

    data.warns += 1
    data.lastWarnTime = now

    if (data.warns >= warningsLimit) {
      const [ownerNum] = global.owner[0]

      const users = global.db.data.users
      if (!users[sender]) users[sender] = {}
      users[sender].banned = true

      try {
        const ownersToNotify = (global.owner || [])
          .map(([num]) => String(num).replace(/[^0-9]/g, ''))
          .filter(num => num.length >= 10)

        const ownerMsg =
          `🚨 *Anti-Spam — Usuario bloqueado*\n\n` +
          `👤 *Usuario:* @${senderNum}\n` +
          `📍 *Contexto:* ${isGroup ? 'Grupo' : 'Chat privado'}${isGroup && groupName ? ` — ${groupName}` : ''}\n` +
          `🆔 *ID:* ${sender}\n\n` +
          `📊 *Estadisticas:*\n` +
          `• Advertencias: ${data.warns}/${warningsLimit}\n` +
          `• Mensajes totales: ${data.totalMessages}\n` +
          `• Rafaga detectada: ${data.count} comandos en ${INTERVAL_MS / 1000}s\n\n` +
          `⛔ El usuario fue baneado y bloqueado automaticamente.`

        for (const ownerNum of ownersToNotify) {
          try {
            const jidOwner = `${ownerNum}@s.whatsapp.net`
            await new Promise((resolve, reject) => {
              conn.sendMessage(jidOwner, { text: ownerMsg, mentions: [sender] })
                .then(resolve)
                .catch(reject)
              setTimeout(() => reject(new Error('Timeout')), 5000)
            })
          } catch (e) {
            console.error(`Error notificando owner ${ownerNum} antispam:`, e.message)
          }
          await new Promise(r => setTimeout(r, 3000))
        }
      } catch (e) {
        console.error('Error notificando owners antispam:', e.message)
      }

      const mensajeBan =
        `⛔ *Fuiste bloqueado por exceso de comandos*\n\n` +
        `Mandaste *${data.count} comandos* en menos de *${INTERVAL_MS / 1000} segundos* y ya habia recibido *${data.warns - 1} advertencia${data.warns - 1 !== 1 ? 's' : ''}* antes.\n\n` +
        `El bot ya no respondera a tus mensajes.\n\n` +
        `Si crees que fue un error, contacta al owner:\n` +
        `📱 wa.me/${ownerNum}`

      await conn.sendMessage(m.chat, { text: mensajeBan }, { quoted: m })

      logSpamBan(sender, data, data.comandos || [], context)
      await conn.updateBlockStatus(sender, 'block')

      global.db.data.baneados = global.db.data.baneados || {}
      global.db.data.baneados[sender] = {
        motivo: 'spam automatico',
        fecha: Date.now(),
        bloqueadoPor: 'antispam',
        advertencias: data.warns,
        mensajesTotales: data.totalMessages,
        ultimoConteo: data.count,
        contexto: isGroup ? 'grupo' : 'privado',
        comandos: data.comandos || []
      }

      delete antispam[sender]
      saveAntiSpam(antispam)
      return !0

    } else {
      const restantes = warningsLimit - data.warns

      const mensajeAdvertencia =
        `⚠️ *Oye, frena un poco!*\n\n` +
        `Detecte *${data.count} comandos* en menos de *${INTERVAL_MS / 1000} segundos*. Eso es demasiado rapido.\n\n` +
        `Esta es tu advertencia *${data.warns} de ${warningsLimit}*.\n` +
        `${restantes === 1
          ? '🔴 Una mas y quedas bloqueado permanentemente.'
          : `🟡 Te quedan *${restantes} oportunidades* antes del bloqueo.`}\n\n` +
        `Espera un momento y sigue usando el bot con calma. 🙏`

      await conn.sendMessage(m.chat, { text: mensajeAdvertencia }, { quoted: m })
      logSpamWarning(sender, data, data.comandos || [], context)
    }
  }

  antispam[sender] = data
  saveAntiSpam(antispam)
}
