import fs from 'fs'
import { getUserStats, getRoleByLevel, getPlayerState, setPlayerState, applyDeathPenalty, releasePlayer } from '../lib/stats.js'
import { getProteccionRestante } from '../lib/usarprote.js'
import { xpRange } from '../lib/levelling.js'
import { resolveMention } from '../lib/mentionHelper.js'

async function handler(m, { conn, args }) {
  const idioma = global.db.data.users?.[m.sender]?.language || global.defaultLenguaje || 'es'
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.stats

  const mentioned = resolveMention(m, args)
  const userId = mentioned || m.sender

  let name = userId.split('@')[0]
  try {
    const contact = await conn.getContact(userId)
    name = contact.notify || contact.name || name
  } catch {}

  // Aplicar daño acumulado por rescate pendiente antes de mostrar
  const _u = getPlayerState(userId)
  if (_u?.rescueRequest?.active && _u.rescueRequest.startedAt) {
    const _alreadyApplied = _u.rescueRequest.damageApplied || 0
    const _ticks = Math.floor((Date.now() - _u.rescueRequest.startedAt) / 60000)
    const _totalDue = _ticks * 8
    const _newDamage = _totalDue - _alreadyApplied
    if (_newDamage > 0) {
      _u.rescueRequest.damageApplied = _totalDue
      _u.hp = Math.max(0, (_u.hp || 100) - _newDamage)
      setPlayerState(userId, _u)
    }
    if (_u.hp <= 0) {
      applyDeathPenalty(userId)
      releasePlayer(userId)
    }
  }

  const stats = getUserStats(userId)
  const currentRole = getRoleByLevel(stats.level)

  const { min, max } = xpRange(stats.level, global.multiplier || 1)
  const expForNextLevel = max - stats.exp
  const expProgress = `${stats.exp}/${max}`

  const protectionMs = typeof getProteccionRestante === 'function' ? getProteccionRestante(userId) : 0
  const protectionText = protectionMs > 0 ? msToTime(protectionMs) : (stats.protectActive || stats.protectExpires > Date.now() ? 'Activo' : '—')
  const armor = stats.armor || { type: 'ninguna', durability: 0, maxDurability: 0 }
  const bountyStars = stats.bountyStars || 0
  const bountyFine = stats.bountyFine || 0
  const capturedText = stats.isCaptured ? '⛓️ Capturado' : '✅ Libre'

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
┃ *❤️ Vida:* ${stats.hp || 0}/${stats.maxHp || 0}
┃ *🥼 Armadura:* ${armor.type} (${armor.durability || 0}/${armor.maxDurability || 0})
┃ *🛡️ Protección:* ${protectionText}
┃ *🚨 Bounty:* ${'⭐'.repeat(bountyStars) || '—'} (${formatNumber(bountyFine)} diamantes)
┃ *⛓️ Estado:* ${capturedText}
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

function msToTime(duration) {
  if (!duration || duration <= 0) return '0s'
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const days = Math.floor(duration / (1000 * 60 * 60 * 24))
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
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