import { loadAntiSpam, saveAntiSpam } from '../lib/antispamDB.js'
import { logSpamWarning, logSpamBan, logOwnerSpam } from '../lib/antispamLogger.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import fs from 'fs'

const SPAM_THRESHOLD = 18
const INTERVAL_MS = 30 * 1000
const WARNINGS_BEFORE_BAN_GROUP = 4
const WARNINGS_BEFORE_BAN_PRIVATE = 2
const WARNING_COOLDOWN = 3 * 60 * 1000
global.antispamActivo = true

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

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`))
  const t = _translate.plugins.antispam_before

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
      const frase = t.frases_owner[Math.floor(Math.random() * t.frases_owner.length)]
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
      const [mainOwnerNum] = global.owner[0]
      const users = global.db.data.users
      if (!users[sender]) users[sender] = {}
      users[sender].banned = true

      try {
        const ownersToNotify = (global.owner || [])
          .map(([num]) => String(num).replace(/[^0-9]/g, ''))
          .filter(num => num.length >= 10)

        const n = t.notify_owner
        const ownerMsg =
          `${n[0]}\n\n` +
          `${n[1]} @${senderNum}\n` +
          `${n[2]} ${isGroup ? n[3] : n[4]}${isGroup && groupName ? ` — ${groupName}` : ''}\n` +
          `${n[5]} ${sender}\n\n` +
          `${n[6]}\n` +
          `• ${n[7]} ${data.warns}/${warningsLimit}\n` +
          `• ${n[8]} ${data.totalMessages}\n` +
          `• ${n[9]} ${data.count} ${n[10]} ${INTERVAL_MS / 1000}s\n\n` +
          n[11]

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

      const b = t.ban
      const mensajeBan =
        `${b[0]}\n\n` +
        `${b[1]}${data.count}${b[2]}${INTERVAL_MS / 1000}${b[3]}${data.warns - 1}${data.warns - 1 !== 1 ? b[4] : b[5]}${b[6]}\n\n` +
        `${b[7]}\n\n` +
        `${b[8]}\n` +
        `📱 wa.me/${mainOwnerNum}`

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
      const w = t.warn
      const mensajeAdvertencia =
        `${w[0]}\n\n` +
        `${w[1]}${data.count}${w[2]}${INTERVAL_MS / 1000}${w[3]}\n\n` +
        `${w[4]}${data.warns} ${w[5]} ${warningsLimit}*.\n` +
        `${restantes === 1 ? w[6] : `${w[7]}${restantes}${w[8]}`}\n\n` +
        w[9]

      await conn.sendMessage(m.chat, { text: mensajeAdvertencia }, { quoted: m })
      logSpamWarning(sender, data, data.comandos || [], context)
    }
  }

  antispam[sender] = data
  saveAntiSpam(antispam)
}
