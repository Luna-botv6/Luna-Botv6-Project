import fs from 'fs'
import { getPlayerState, setPlayerState, getArmorStats, setArmor, addMoney, removeMoney, removeExp, hasArmor } from '../lib/stats.js'

const ARMOR_TYPES = {
  ligera:  { type: 'ligera',  defense: 5,  maxDurability: 5,  cost: 1000,  costExp: 4000,  emoji: '🥋' },
  media:   { type: 'media',   defense: 10, maxDurability: 8,  cost: 3000,  costExp: 8000,  emoji: '⚔️' },
  pesada:  { type: 'pesada',  defense: 15, maxDurability: 12, cost: 6000,  costExp: 15000, emoji: '🛡️' },
  mistica: { type: 'mistica', defense: 20, maxDurability: 25, cost: 10000, costExp: 25000, emoji: '🔮' }
}

const COST_PER_DUR = 50

function durabilityBar(current, max) {
  if (!max) return '░░░░░'
  const filled = Math.round((current / max) * 5)
  return '█'.repeat(filled) + '░'.repeat(5 - filled)
}

function armorStatus(armor) {
  if (!armor || armor.type === 'ninguna') return '—'
  const pct = Math.round(((armor.durability || 0) / (armor.maxDurability || 1)) * 100)
  if (pct <= 0)  return '💔 Rota'
  if (pct <= 25) return '🔴 Crítica'
  if (pct <= 50) return '🟡 Dañada'
  if (pct <= 75) return '🟢 Buena'
  return '✨ Perfecta'
}

const HELP_MSG =
  `🛡️ *Sistema de Armaduras*\n\n` +
  `📋 *Comandos:*\n` +
  `• *armadura comprar <tipo>* — Comprar y equipar armadura\n` +
  `• *armadura ver* — Ver tu armadura actual\n` +
  `• *armadura reparar* — Reparar durabilidad\n` +
  `• *armadura tienda* — Ver tipos disponibles y precios\n\n` +
  `🗡️ *Tipos:* ligera • media • pesada • mistica`

const handler = async (m, { conn, args }) => {
  const userId = m.sender
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''

  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(HELP_MSG)

  // ─── TIENDA ───
  if (cmd === 'tienda' || cmd === 'shop' || cmd === 'lista') {
    const lines = Object.values(ARMOR_TYPES).map(a =>
      `${a.emoji} *${a.type.charAt(0).toUpperCase() + a.type.slice(1)}*\n` +
      `   🗡️ DEF: ${a.defense} • ❤️ Usos: ${a.maxDurability} • 💎 ${a.cost} + ⭐ ${a.costExp} EXP`
    ).join('\n\n')

    const user = getPlayerState(userId)
    return m.reply(
      `🏪 *Tienda de Armaduras*\n\n${lines}\n\n` +
      `💎 Tu saldo: *${user.money || 0} diamantes*\n` +
      `💡 Comprar: *armadura comprar <tipo>*`
    )
  }

  // ─── COMPRAR ───
  if (cmd === 'comprar' || cmd === 'buy') {
    const tipo = args?.[1]?.toLowerCase()
    if (!tipo || !ARMOR_TYPES[tipo]) {
      return m.reply(`❌ Tipo inválido.\n\n🗡️ Disponibles: ligera, media, pesada, mistica\n💡 Usa *armadura tienda* para ver precios.`)
    }

    const armorDef = ARMOR_TYPES[tipo]
    const user = getPlayerState(userId)
    const currentArmor = getArmorStats(userId)
    const saldo = user.money || 0

    const userExp = user.exp || 0
    if (saldo < armorDef.cost || userExp < armorDef.costExp) {
      const faltaDiamantes = Math.max(0, armorDef.cost - saldo)
      const faltaExp = Math.max(0, armorDef.costExp - userExp)
      return m.reply(
        `❌ *Sin recursos suficientes.*\n\n` +
        `${armorDef.emoji} ${armorDef.type}: *${armorDef.cost} 💎* + *${armorDef.costExp} EXP*\n` +
        (faltaDiamantes > 0 ? `Te faltan: *${faltaDiamantes} 💎*\n` : '') +
        (faltaExp > 0 ? `Te falta: *${faltaExp} EXP*` : '')
      )
    }


    const tieneActual = currentArmor && currentArmor.type !== 'ninguna'
    removeMoney(userId, armorDef.cost)
    removeExp(userId, armorDef.costExp)
    setArmor(userId, {
      type: armorDef.type,
      defense: armorDef.defense,
      durability: armorDef.maxDurability,
      maxDurability: armorDef.maxDurability
    })

    return m.reply(
      `${armorDef.emoji} *Armadura equipada!*\n\n` +
      `🛡️ Tipo: *${armorDef.type}*\n` +
      `⚔️ Defensa: *${armorDef.defense}*\n` +
      `❤️ Durabilidad: *${armorDef.maxDurability}/${armorDef.maxDurability}* ${durabilityBar(armorDef.maxDurability, armorDef.maxDurability)}\n` +
      `💎 Pagaste: *${armorDef.cost}*\n` +
      `💰 Saldo restante: *${saldo - armorDef.cost}*` +
      (tieneActual ? `\n\n⚠️ Reemplazaste tu armadura *${currentArmor.type}* anterior.` : '')
    )
  }

  // ─── VER ───
  if (cmd === 'ver' || cmd === 'verarmadura' || cmd === 'info') {
    const armor = getArmorStats(userId)
    const user = getPlayerState(userId)

    if (!armor || armor.type === 'ninguna') {
      return m.reply(
        `🚫 *No tienes armadura equipada.*\n\n` +
        `💡 Usa *armadura tienda* para ver opciones.\n` +
        `❤️ HP: *${user.hp || 0}/${user.maxHp || 100}*`
      )
    }

    const armorDef = ARMOR_TYPES[armor.type] || {}
    const bar = durabilityBar(armor.durability || 0, armor.maxDurability || 1)
    const status = armorStatus(armor)
    const repairCost = ((armor.maxDurability || 0) - (armor.durability || 0)) * COST_PER_DUR

    return m.reply(
      `🛡️ *Tu Armadura*\n\n` +
      `${armorDef.emoji || '🛡️'} Tipo: *${armor.type}*\n` +
      `⚔️ Defensa: *${armor.defense || 0}*\n` +
      `❤️ Durabilidad: *${armor.durability || 0}/${armor.maxDurability || 0}* ${bar}\n` +
      `📊 Estado: ${status}\n` +
      (repairCost > 0 ? `🔧 Reparación: *${repairCost} 💎*\n` : '') +
      `\n💎 Saldo: *${user.money || 0}*\n` +
      `❤️ HP: *${user.hp || 0}/${user.maxHp || 100}*`
    )
  }

  // ─── REPARAR ───
  if (cmd === 'reparar' || cmd === 'repair') {
    const armor = getArmorStats(userId)

    if (!armor || armor.type === 'ninguna') {
      return m.reply('❌ No tienes armadura que reparar.\n💡 Usa *armadura comprar <tipo>* para equiparte.')
    }

    const missing = (armor.maxDurability || 0) - (armor.durability || 0)
    if (missing <= 0) {
      return m.reply(
        `✨ *Tu armadura está en perfectas condiciones.*\n\n` +
        `🛡️ ${armor.type} • ${durabilityBar(armor.durability, armor.maxDurability)} ${armor.durability}/${armor.maxDurability}`
      )
    }

    const totalCost = missing * COST_PER_DUR
    const user = getPlayerState(userId)
    const saldo = user.money || 0

    if (saldo < totalCost) {
      return m.reply(
        `❌ *Sin fondos para reparar.*\n\n` +
        `🔧 Costo de reparación: *${totalCost} 💎*\n` +
        `💎 Tu saldo: *${saldo}*\n` +
        `Te faltan: *${totalCost - saldo} 💎*\n\n` +
        `📊 Durabilidad actual: *${armor.durability}/${armor.maxDurability}* ${durabilityBar(armor.durability, armor.maxDurability)}`
      )
    }

    removeMoney(userId, totalCost)
    setArmor(userId, { ...armor, durability: armor.maxDurability })

    return m.reply(
      `🔧 *Armadura reparada!*\n\n` +
      `🛡️ Tipo: *${armor.type}*\n` +
      `❤️ Durabilidad: *${armor.maxDurability}/${armor.maxDurability}* ${durabilityBar(armor.maxDurability, armor.maxDurability)}\n` +
      `📊 Estado: ✨ Perfecta\n` +
      `💎 Pagaste: *${totalCost}*\n` +
      `💰 Saldo restante: *${saldo - totalCost}*`
    )
  }

  return m.reply(`❓ Subcomando no reconocido.\n\n${HELP_MSG}`)
}

handler.help = ['armadura']
handler.tags = ['rpg']
handler.command = ['armadura', 'armor', 'buyarmor', 'buyarmadura']

export default handler