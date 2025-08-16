import { getUserStats, setUserStats } from '../lib/stats.js'

const items = ['exp', 'money']  // exp o diamantes (money)

const confirmation = {}

async function handler(m, { conn, args, usedPrefix }) {
  if (confirmation[m.sender]) {
    return conn.sendMessage(m.chat, { text: '⏳ *Tienes una transferencia pendiente.* Responde *Si* o *No* para continuar.' }, { quoted: m })
  }

  const user = getUserStats(m.sender)

  const type = (args[0] || '').toLowerCase()
  const countArg = args[1]
  const whoMention = m.mentionedJid && m.mentionedJid[0]

  // Mensaje de ayuda bonito y claro
  const helpMessage = `
📢 *Comando Transferir*

Transfiere tus recursos a otro usuario con este comando:

👉 *${usedPrefix}transferir exp 100 @usuario*  
Para transferir 100 ⭐ EXP

👉 *${usedPrefix}transferir money 50 @usuario*  
Para transferir 50 💎 diamantes

*Nota:* Debes mencionar al usuario destinatario.

Responde *Si* para confirmar la transferencia o *No* para cancelarla cuando se te pida.
  `.trim()

  if (!items.includes(type) || !countArg || !whoMention) {
    return conn.sendMessage(m.chat, { text: helpMessage, mentions: [m.sender] }, { quoted: m })
  }

  const count = Math.max(1, parseInt(countArg) || 1)

  if (user[type] < count) {
    return conn.sendMessage(m.chat, { text: `❌ No tienes suficientes *${type === 'money' ? '💎 diamantes' : '⭐ EXP'}* para transferir.` }, { quoted: m })
  }

  const confirmMessage = `
💰 *Confirmación de transferencia* 💰

¿Quieres transferir *${count} ${type === 'money' ? '💎 diamantes' : '⭐ EXP'}* a *@${whoMention.split('@')[0]}*?

Responde *Si* para confirmar o *No* para cancelar.
  `.trim()

  await conn.sendMessage(m.chat, { text: confirmMessage, mentions: [whoMention] }, { quoted: m })

  confirmation[m.sender] = {
    sender: m.sender,
    to: whoMention,
    type,
    count,
    message: m,
    timeout: setTimeout(() => {
      conn.sendMessage(m.chat, { text: '⌛️ *Tiempo agotado, transferencia cancelada.*' }, { quoted: m })
      delete confirmation[m.sender]
    }, 60 * 1000)
  }
}

handler.before = async (m, { conn }) => {
  if (!confirmation[m.sender]) return
  if (!m.text) return

  const { sender, to, type, count, timeout, message } = confirmation[m.sender]

  if (m.id === message.id) return

  if (/^no$/i.test(m.text)) {
    clearTimeout(timeout)
    delete confirmation[sender]
    return conn.sendMessage(m.chat, { text: '❌ *Transferencia cancelada.*' }, { quoted: m })
  }

  if (/^si$/i.test(m.text)) {
    const senderStats = getUserStats(sender)
    const receiverStats = getUserStats(to)

    if (senderStats[type] < count) {
      clearTimeout(timeout)
      delete confirmation[sender]
      return conn.sendMessage(m.chat, { text: `❌ Ya no tienes suficientes *${type === 'money' ? '💎 diamantes' : '⭐ EXP'}* para transferir.` }, { quoted: m })
    }

    senderStats[type] -= count
    receiverStats[type] += count

    setUserStats(sender, senderStats)
    setUserStats(to, receiverStats)

    clearTimeout(timeout)
    delete confirmation[sender]

    return conn.sendMessage(m.chat, { text: `✅ Has transferido *${count} ${type === 'money' ? '💎 diamantes' : '⭐ EXP'}* a *@${to.split('@')[0]}*.` }, { mentions: [to], quoted: m })
  }
}

handler.help = ['transferir <exp|money> <cantidad> @usuario']
handler.tags = ['economia', 'xp']
handler.command = ['transferir', 'dar', 'darxp', 'dardiamantes']

export default handler


