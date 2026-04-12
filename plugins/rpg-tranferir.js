import fs from 'fs'
import { getUserStats, setUserStats } from '../lib/stats.js'

const items = ['exp', 'money']
const confirmation = {}

async function handler(m, { conn, args, usedPrefix }) {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_transferir

  if (confirmation[m.sender]) {
    return conn.sendMessage(m.chat, { text: `⏳ ${tradutor.texto1}` }, { quoted: m })
  }

  const user = getUserStats(m.sender)
  const type = (args[0] || '').toLowerCase()
  const countArg = args[1]
  const whoMention = m.mentionedJid && m.mentionedJid[0]

  const helpMessage = `
📢 *${tradutor.texto2[0]}*

${tradutor.texto2[1]}:

👉 *${usedPrefix}transferir exp 100 @usuario* ${tradutor.texto2[2]} 100 ⭐ EXP

👉 *${usedPrefix}transferir money 50 @usuario* ${tradutor.texto2[2]} 50 💎 ${tradutor.texto3}

*${tradutor.texto2[3]}:* ${tradutor.texto2[4]}

${tradutor.texto2[5]} *${tradutor.confirmar}* ${tradutor.texto2[6]} *${tradutor.cancelar}* ${tradutor.texto2[7]}.
  `.trim()

  if (!items.includes(type) || !countArg || !whoMention) {
    return conn.sendMessage(m.chat, { text: helpMessage, mentions: [m.sender] }, { quoted: m })
  }

  const count = Math.max(1, parseInt(countArg) || 1)

  if (user[type] < count) {
    return conn.sendMessage(m.chat, { text: `❌ ${tradutor.texto4} *${type === 'money' ? '💎 ' + tradutor.texto3 : '⭐ EXP'}* ${tradutor.texto5}.` }, { quoted: m })
  }

  const confirmMessage = `
💰 *${tradutor.texto6[0]}* 💰

${tradutor.texto6[1]} *${count} ${type === 'money' ? '💎 ' + tradutor.texto3 : '⭐ EXP'}* ${tradutor.texto6[2]} *@${whoMention.split('@')[0]}*?

${tradutor.texto2[5]} *${tradutor.confirmar}* ${tradutor.texto6[3]} *${tradutor.cancelar}* ${tradutor.texto6[4]}.
  `.trim()

  await conn.sendMessage(m.chat, { text: confirmMessage, mentions: [whoMention] }, { quoted: m })

  confirmation[m.sender] = {
    sender: m.sender,
    to: whoMention,
    type,
    count,
    message: m,
    timeout: setTimeout(() => {
      conn.sendMessage(m.chat, { text: `⌛️ *${tradutor.texto7}*` }, { quoted: m })
      delete confirmation[m.sender]
    }, 60 * 1000)
  }
}

handler.before = async (m, { conn }) => {
  if (!confirmation[m.sender]) return
  if (!m.text) return

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_transferir

  const { sender, to, type, count, timeout, message } = confirmation[m.sender]

  if (m.id === message.id) return

  if (new RegExp(`^${tradutor.cancelar}$`, 'i').test(m.text)) {
    clearTimeout(timeout)
    delete confirmation[sender]
    return conn.sendMessage(m.chat, { text: `❌ *${tradutor.texto8}*` }, { quoted: m })
  }

  if (new RegExp(`^${tradutor.confirmar}$`, 'i').test(m.text)) {
    const senderStats = getUserStats(sender)
    const receiverStats = getUserStats(to)

    if (senderStats[type] < count) {
      clearTimeout(timeout)
      delete confirmation[sender]
      return conn.sendMessage(m.chat, { text: `❌ ${tradutor.texto9} *${type === 'money' ? '💎 ' + tradutor.texto3 : '⭐ EXP'}* ${tradutor.texto5}.` }, { quoted: m })
    }

    senderStats[type] -= count
    receiverStats[type] += count

    setUserStats(sender, senderStats)
    setUserStats(to, receiverStats)

    clearTimeout(timeout)
    delete confirmation[sender]

    return conn.sendMessage(m.chat, { text: `✅ ${tradutor.texto10[0]} *${count} ${type === 'money' ? '💎 ' + tradutor.texto3 : '⭐ EXP'}* ${tradutor.texto10[1]} *@${to.split('@')[0]}*.` }, { mentions: [to], quoted: m })
  }
}

handler.help = ['transferir <exp|money> <cantidad> @usuario']
handler.tags = ['economia', 'xp']
handler.command = ['transferir', 'dar', 'darxp', 'dardiamantes']

export default handler


