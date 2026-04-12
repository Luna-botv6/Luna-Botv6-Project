import fs from 'fs'
import { getUserStats, getRoleByLevel } from '../lib/stats.js'
import { xpRange } from '../lib/levelling.js'

async function handler(m, { conn }) {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.stats

  let userId = m.mentionedJid && m.mentionedJid.length ? m.mentionedJid[0] : m.sender

  let name = userId.split('@')[0]
  try {
    const contact = await conn.getContact(userId)
    name = contact.notify || contact.name || name
  } catch {}

  const stats = getUserStats(userId)
  const currentRole = getRoleByLevel(stats.level)

  const { min, max } = xpRange(stats.level, global.multiplier || 1)
  const expForNextLevel = max - stats.exp
  const expProgress = `${stats.exp}/${max}`

  const text = `
╭━━━〔 *📊 ${tradutor.texto1}* 〕━━━⬣
┃ *👤 ${tradutor.texto2}:* @${userId.split('@')[0]}
┃
┃ *📈 ${tradutor.texto3}:* ${stats.level}
┃ *🏅 ${tradutor.texto4}:* ${currentRole}
┃ *⚡ ${tradutor.texto5}:* ${formatNumber(stats.exp)}
┃ *📊 ${tradutor.texto6}:* ${expProgress}
┃ *🎯 ${tradutor.texto7}:* ${formatNumber(expForNextLevel)} exp
┃
┃ *💰 ${tradutor.texto8}:*
┃ *💎 ${tradutor.texto9}:* ${formatNumber(stats.money)}
┃ *🌙 ${tradutor.texto10}:* ${formatNumber(stats.lunaCoins)}
┃ *🔮 ${tradutor.texto11}:* ${formatNumber(stats.mysticcoins)}
┃
┃ *📋 ${tradutor.texto12}:*
┃ *📦 ${tradutor.texto13}:* ${stats.limit}
┃ *🎮 ${tradutor.texto14}:* ${stats.joincount}
┃ *🪙 ${tradutor.texto15}:* ${stats.premiumTime > 0 ? tradutor.texto16 : tradutor.texto17}
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

💬 ${getMotivationalMessage(stats.level, tradutor)}
  `.trim()

  await m.reply(text, null, { mentions: [userId] })
}

function formatNumber(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function getMotivationalMessage(level, tradutor) {
  if (level >= 500) return tradutor.texto18
  if (level >= 400) return tradutor.texto19
  if (level >= 300) return tradutor.texto20
  if (level >= 200) return tradutor.texto21
  if (level >= 150) return tradutor.texto22
  if (level >= 120) return tradutor.texto23
  if (level >= 100) return tradutor.texto24
  if (level >= 80) return tradutor.texto25
  if (level >= 70) return tradutor.texto26
  if (level >= 60) return tradutor.texto27
  if (level >= 50) return tradutor.texto28
  if (level >= 40) return tradutor.texto29
  if (level >= 30) return tradutor.texto30
  if (level >= 20) return tradutor.texto31
  if (level >= 15) return tradutor.texto32
  if (level >= 10) return tradutor.texto33
  if (level >= 5) return tradutor.texto34
  return tradutor.texto35
}

handler.help = ['verexp', 'stats', 'estadisticas']
handler.tags = ['xp', 'rpg']
handler.command = /^(verexp|estadisticas|stats)$/i

export default handler