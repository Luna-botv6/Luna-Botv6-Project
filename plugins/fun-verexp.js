import fs from 'fs'
import { getUserStats, getPlayerState, setPlayerState, getArmorStats, addExp, removeMoney, cleanExpiredBuffs } from '../lib/stats.js'
import { getProteccionRestante } from '../lib/usarprote.js'
import { xpRange } from '../lib/levelling.js'
import { resolveMention } from '../lib/mentionHelper.js'
import { idCanonico, mismoUsuario } from '../lib/identidad.js'
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js'
import { getHunterStatus } from '../lib/hunterSystem.js'

const COSTO_ESCANEO = 200
const EXP_GANADA = 50

async function handler(m, { conn, args }) {
  const idioma = global.db.data.users?.[m.sender]?.language || global.defaultLenguaje || 'es'
  let tradutor = {}
  try { tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.stats } catch {}
  try { if (!tradutor || !tradutor.texto1) tradutor = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json')).plugins.stats } catch {}

  const tieneObjetivo = !!(m.mentionedJid?.[0] || m.message?.contextInfo?.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.quoted?.sender)
  const mentionedRaw = tieneObjetivo ? resolveMention(m, args) : null
  const mentioned = mentionedRaw ? (idCanonico(mentionedRaw) || mentionedRaw) : null
  const propio = idCanonico(m.sender) || m.sender
  const esOtro = !!mentioned && !mismoUsuario(mentioned, propio)
  const userId = esOtro ? mentioned : propio
  const consultante = propio

  if (esOtro) {
    const uConsultante = getPlayerState(consultante)
    const saldo = uConsultante?.money || 0
    if (saldo < COSTO_ESCANEO) {
      return m.reply(`❌ Necesitas *${COSTO_ESCANEO} 💎* para escanear a otro jugador.\nTu saldo: *${saldo} 💎*`)
    }
  }

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
      const { applyDeathPenalty, releasePlayer } = await import('../lib/stats.js')
      applyDeathPenalty(userId)
      releasePlayer(userId)
    }
  }

  cleanExpiredBuffs(userId)

  const stats = getUserStats(userId)
  const currentRole = (await import('../lib/stats.js')).getRoleByLevel(stats.level)
  const { min, max } = xpRange(stats.level, global.multiplier || 1)
  const expForNextLevel = max - stats.exp
  const expProgress = `${stats.exp}/${max}`

  const protectionMs = typeof getProteccionRestante === 'function' ? getProteccionRestante(userId) : 0
  const protectionText = protectionMs > 0 ? msToTime(protectionMs) : (stats.protectActive || stats.protectExpires > Date.now() ? 'Activo' : '—')
  const armor = stats.armor || { type: 'ninguna', durability: 0, maxDurability: 0, defense: 0 }
  const bountyStars = stats.bountyStars || 0
  const bountyFine = stats.bountyFine || 0
  const capturedText = stats.isCaptured ? '⛓️ Capturado' : '✅ Libre'
  const hunterStatus = getHunterStatus(userId)
  const buffs = (stats.activeBuffs || []).filter(b => b.expiresAt > Date.now())
  const inv = stats.inventory || {}
  const invItems = Object.entries(inv).filter(([, q]) => q > 0).map(([k, q]) => `${k} x${q}`).join(', ') || '—'

  let name = (resolveJidToPhone(userId) || 'desconocido')
  try {
    const contact = await conn.getContact(userId)
    name = contact.notify || contact.name || name
  } catch {}

  const buffText = buffs.length
    ? buffs.map(b => `${b.type} (${msToTime(b.expiresAt - Date.now())})`).join(', ')
    : '—'

  const text = `
╭━━━〔 *📊 ${tradutor.texto1 || 'Estadísticas'}* 〕━━━⬣
┃ *👤 ${tradutor.texto2 || 'Usuario'}:* @${(resolveJidToPhone(userId) || 'desconocido')}
┃
┃ *📈 ${tradutor.texto3 || 'Nivel'}:* ${stats.level}
┃ *🏅 ${tradutor.texto4 || 'Rango'}:* ${currentRole}
┃ *⚡ ${tradutor.texto5 || 'EXP'}:* ${formatNumber(stats.exp)}
┃ *📊 ${tradutor.texto6 || 'Progreso'}:* ${expProgress}
┃ *🎯 ${tradutor.texto7 || 'Para siguiente'}:* ${formatNumber(expForNextLevel)} exp
┃
┃ *💰 ${tradutor.texto8 || 'Economía'}:*
┃ *💎 ${tradutor.texto9 || 'Diamantes'}:* ${formatNumber(stats.money)}
┃ *🌙 ${tradutor.texto10 || 'LunaCoins'}:* ${formatNumber(stats.lunaCoins)}
┃ *🔮 ${tradutor.texto11 || 'MysticCoins'}:* ${formatNumber(stats.mysticcoins)}
┃
┃ *❤️ Vida:* ${stats.hp || 0}/${stats.maxHp || 0}
┃ *🥼 Armadura:* ${armor.type} (${armor.durability || 0}/${armor.maxDurability || 0}) DEF ${armor.defense || 0}
┃ *🛡️ Protección:* ${protectionText}
┃ *🚨 Bounty:* ${'⭐'.repeat(bountyStars) || '—'} (${formatNumber(bountyFine)} diamantes)
┃ *⛓️ Estado:* ${capturedText}
┃ *🎯 Amenaza cazador:* ${hunterStatus.threat}% (${hunterStatus.active ? 'ACTIVO' : 'inactivo'})
┃
┃ *✨ Buffs:* ${buffText}
┃ *🎒 Inventario:* ${invItems}
┃
┃ *📋 ${tradutor.texto12 || 'Otros'}:*
┃ *📦 ${tradutor.texto13 || 'Límites'}:* ${stats.limit}
┃ *🎮 ${tradutor.texto14 || 'Usos'}:* ${stats.joincount}
┃ *🪙 ${tradutor.texto15 || 'Premium'}:* ${stats.premiumTime > 0 ? (tradutor.texto16 || 'Sí') : (tradutor.texto17 || 'No')}
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

💬 ${getMotivationalMessage(stats.level, tradutor)}
  `.trim()

  if (esOtro) {
    removeMoney(consultante, COSTO_ESCANEO)
    addExp(consultante, EXP_GANADA)
  }

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
  if (level >= 500) return tradutor.texto18 || '¡Eres una leyenda!'
  if (level >= 400) return tradutor.texto19 || '¡Imparable!'
  if (level >= 300) return tradutor.texto20 || '¡Gran guerrero!'
  if (level >= 200) return tradutor.texto21 || '¡Sigue así!'
  if (level >= 150) return tradutor.texto22 || '¡Buen progreso!'
  if (level >= 120) return tradutor.texto23 || '¡Avanzando!'
  if (level >= 100) return tradutor.texto24 || '¡Centurión!'
  if (level >= 80) return tradutor.texto25 || '¡Fuerte!'
  if (level >= 70) return tradutor.texto26 || '¡Creciendo!'
  if (level >= 60) return tradutor.texto27 || '¡Mejorando!'
  if (level >= 50) return tradutor.texto28 || '¡A la mitad!'
  if (level >= 40) return tradutor.texto29 || '¡Avanzado!'
  if (level >= 30) return tradutor.texto30 || '¡Intermedio!'
  if (level >= 20) return tradutor.texto31 || '¡Novato+!'
  if (level >= 15) return tradutor.texto32 || '¡Aprendiendo!'
  if (level >= 10) return tradutor.texto33 || '¡Principiante!'
  if (level >= 5) return tradutor.texto34 || '¡Iniciado!'
  return tradutor.texto35 || '¡Comienza tu aventura!'
}

handler.help = ['verexp', 'stats', 'estadisticas']
handler.tags = ['xp', 'rpg']
handler.command = /^(verexp|estadisticas|stats)$/i

export default handler
