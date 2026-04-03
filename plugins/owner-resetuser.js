import { readFileSync } from 'fs'
import { getUserStats, setUserStats } from '../lib/stats.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.owner_resetuser

  if (text && text.trim().toLowerCase() === 'todos') {
    const confirmMsg = await conn.sendMessage(m.chat, {
      text: `⚠️ *Vas a resetear los datos de TODOS los usuarios del bot.*\n\nEsta accion no se puede deshacer facilmente.\n\n*Responde "si" para confirmar o "no" para cancelar.*`
    }, { quoted: m })

    const confirmation = await waitForUserResponse(conn, m.chat, m.sender, 30000)

    if (!confirmation || !['si', 'sí', 'yes', 'confirmar'].includes(confirmation.toLowerCase())) {
      return conn.sendMessage(m.chat, { text: `❌ *Operacion cancelada.*` }, { quoted: m })
    }

    const resetData = {
      exp: 0,
      level: 0,
      money: 0,
      joincount: 0,
      premiumTime: 0,
      mysticcoins: 0,
      lunaCoins: 0,
      role: '🧰 Novato',
      limit: 10
    }

    let count = 0
    const allUsers = Object.keys(global.db.data.users || {})

    for (const userId of allUsers) {
      setUserStats(userId, resetData)
      const u = global.db.data.users[userId]
      if (u) {
        global.db.data.users[userId] = {
          language: u.language || global.defaultLenguaje,
          banned: u.banned || false,
          premium: u.premium || false,
          lastResetUser: 0
        }
      }
      count++
    }

    return conn.sendMessage(m.chat, {
      text: `✅ *Reset masivo completado.*\n\n👥 Usuarios reseteados: *${count}*\n🗑️ Todos los datos de economia y experiencia han sido eliminados.`
    }, { quoted: m })
  }

  const cooldownTime = 300000
  const lastUsed = global.db.data.users[m.sender].lastResetUser || 0
  const now = Date.now()

  if (now - lastUsed < cooldownTime) {
    const remainingTime = Math.ceil((cooldownTime - (now - lastUsed)) / 1000)
    const minutes = Math.floor(remainingTime / 60)
    const seconds = remainingTime % 60
    return conn.sendMessage(m.chat, {
      text: `⏰ *Espera ${minutes}m ${seconds}s antes de usar este comando nuevamente.*`
    }, { quoted: m })
  }

  let user = ''
  let userNumber = ''
  let originalMention = ''

  if (m.mentionedJid && m.mentionedJid.length > 0) {
    const mentionedUser = m.mentionedJid[0]
    user = conn.decodeJid(mentionedUser)
    if (user.includes('@lid')) {
      const lidToJidCache = global.lidToJidCache || new Map()
      const realJid = lidToJidCache.get(user)
      user = realJid || user.split('@')[0] + '@s.whatsapp.net'
    }
    userNumber = user.split('@')[0]
    originalMention = mentionedUser
  } else if (text) {
    const numberMatches = text.match(/\d+/g)
    if (numberMatches) {
      const number = numberMatches.join('')
      if (number.length >= 10) {
        user = number + '@s.whatsapp.net'
        userNumber = number
        originalMention = user
      } else {
        return conn.sendMessage(m.chat, {
          text: `❌ *Numero invalido.* Usa: ${usedPrefix}${command} <numero>`
        }, { quoted: m })
      }
    }
  } else if (m.quoted && m.quoted.sender) {
    user = conn.decodeJid(m.quoted.sender)
    if (user.includes('@lid')) {
      const lidToJidCache = global.lidToJidCache || new Map()
      const realJid = lidToJidCache.get(user)
      user = realJid || user.split('@')[0] + '@s.whatsapp.net'
    }
    userNumber = user.split('@')[0]
    originalMention = m.quoted.sender
  } else {
    return conn.sendMessage(m.chat, {
      text: tradutor.texto2 || `📋 *Uso:* ${usedPrefix}${command} <@usuario>\n*Ejemplo:* ${usedPrefix}${command} @usuario\n\nPara resetear todos: ${usedPrefix}${command} todos`
    }, { quoted: m })
  }

  let currentStats = getUserStats(user)

  if (!currentStats || (currentStats.exp === 0 && currentStats.level === 0 && currentStats.money === 0)) {
    const globalUser = global.db.data.users[user]
    if (!globalUser) {
      const possibleJids = [
        userNumber + '@s.whatsapp.net',
        userNumber + '@c.us',
        userNumber + '@lid'
      ]
      let found = false
      for (const jid of possibleJids) {
        const testStats = getUserStats(jid)
        if (testStats && (testStats.exp > 0 || testStats.level > 0 || testStats.money > 0)) {
          user = jid
          currentStats = testStats
          found = true
          break
        }
      }
      if (!found) {
        return conn.sendMessage(m.chat, {
          text: tradutor.texto3?.[0]
            ? `${tradutor.texto3[0]} @${userNumber} ${tradutor.texto3[1]}`
            : `❌ El usuario @${userNumber} no tiene datos registrados.`,
          mentions: [originalMention]
        }, { quoted: m })
      }
    } else {
      currentStats = {
        exp: globalUser.exp || 0,
        level: globalUser.level || 0,
        money: globalUser.money || 0,
        mysticcoins: globalUser.mysticcoins || 0,
        lunaCoins: globalUser.lunaCoins || 0,
        role: globalUser.role || '🧰 Novato',
        limit: globalUser.limit || 10
      }
    }
  }

  await conn.sendMessage(m.chat, {
    text: `⚠️ *Estas seguro de resetear todos los datos de @${userNumber}?*\n\n` +
      `📊 *Datos actuales:*\n` +
      `• Experiencia: ${currentStats.exp}\n` +
      `• Nivel: ${currentStats.level}\n` +
      `• Dinero: ${currentStats.money}\n` +
      `• MysticCoins: ${currentStats.mysticcoins}\n` +
      `• LunaCoins: ${currentStats.lunaCoins}\n\n` +
      `*Responde con "si" para confirmar o "no" para cancelar.*`,
    mentions: [originalMention]
  }, { quoted: m })

  const confirmation = await waitForUserResponse(conn, m.chat, m.sender, 30000)

  if (!confirmation || !['si', 'sí', 'yes', 'confirmar'].includes(confirmation.toLowerCase())) {
    return conn.sendMessage(m.chat, { text: `❌ *Operacion cancelada.*` }, { quoted: m })
  }

  try {
    const previousStats = {
      exp: currentStats.exp,
      level: currentStats.level,
      money: currentStats.money,
      joincount: currentStats.joincount || 0,
      premiumTime: currentStats.premiumTime || 0,
      mysticcoins: currentStats.mysticcoins,
      lunaCoins: currentStats.lunaCoins,
      role: currentStats.role,
      limit: currentStats.limit
    }

    if (!global.db.data.backups) global.db.data.backups = {}
    global.db.data.backups[user] = {
      userId: user,
      userNumber,
      previousStats,
      resetBy: m.sender,
      resetDate: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)
    }

    setUserStats(user, {
      exp: 0,
      level: 0,
      money: 0,
      joincount: 0,
      premiumTime: 0,
      mysticcoins: 0,
      lunaCoins: 0,
      role: '🧰 Novato',
      limit: 10
    })

    if (global.db.data.users[user]) {
      global.db.data.users[user] = {
        language: global.db.data.users[user].language || global.defaultLenguaje,
        banned: global.db.data.users[user].banned || false,
        premium: global.db.data.users[user].premium || false,
        lastResetUser: 0
      }
    }

    global.db.data.users[m.sender].lastResetUser = Date.now()

    const successMessage = tradutor.texto4?.[0]
      ? `${tradutor.texto4[0]} @${userNumber} ${tradutor.texto4[1]}\n\n`
      : `✅ *Datos reseteados exitosamente para @${userNumber}*\n\n`

    await conn.sendMessage(m.chat, {
      text: successMessage +
        `📊 *DATOS ANTERIORES:*\n` +
        `• Experiencia: ${previousStats.exp.toLocaleString()}\n` +
        `• Nivel: ${previousStats.level}\n` +
        `• Dinero: ${previousStats.money.toLocaleString()}\n` +
        `• MysticCoins: ${previousStats.mysticcoins.toLocaleString()}\n` +
        `• LunaCoins: ${previousStats.lunaCoins.toLocaleString()}\n\n` +
        `🆕 *DATOS ACTUALES:*\n` +
        `• Todo reseteado a 0\n` +
        `• Rol: 🧰 Novato\n\n` +
        `🔄 Usa \`${usedPrefix}restoreuser @${userNumber}\` para restaurar (valido 24h)`,
      mentions: [originalMention]
    }, { quoted: m })

  } catch (error) {
    console.error('Error al resetear usuario:', error)
    await conn.sendMessage(m.chat, {
      text: `❌ *Error al resetear los datos del usuario.* Intentalo nuevamente.`
    }, { quoted: m })
  }
}

const waitForUserResponse = async (conn, chatId, senderId, timeout = 30000) => {
  return new Promise((resolve) => {
    const responseHandler = (update) => {
      try {
        if (update.messages && update.messages.length > 0) {
          const message = update.messages[0]
          if (message.key.remoteJid === chatId &&
            message.key.participant === senderId &&
            message.message) {
            const text = message.message.conversation ||
              message.message.extendedTextMessage?.text || ''
            conn.ev.off('messages.upsert', responseHandler)
            resolve(text.trim())
          }
        }
      } catch (error) {
        console.error('Error en responseHandler:', error)
      }
    }
    conn.ev.on('messages.upsert', responseHandler)
    setTimeout(() => {
      conn.ev.off('messages.upsert', responseHandler)
      resolve(null)
    }, timeout)
  })
}

handler.tags = ['owner']
handler.command = /(restablecerdatos|deletedatauser|resetuser)$/i
handler.rowner = true
handler.group = false
handler.private = false
export default handler
