import fs from 'fs'
import { getPlayerState, removeMoney, trackGain, getArmorStats } from '../lib/stats.js'
import { getHunterStatus } from '../lib/hunterSystem.js'
import { getProteccionRestante } from '../lib/usarprote.js'
import { resolveMention } from '../lib/mentionHelper.js'
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js'
import { idCanonico, mismoUsuario } from '../lib/identidad.js'

const SPY_COST = 500

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_espia || {}
  const id = idCanonico(m.sender) || m.sender
  const tieneObjetivo = !!(m.mentionedJid?.[0] || m.message?.contextInfo?.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.quoted?.sender)
  const targetRaw = tieneObjetivo ? resolveMention(m, args) : null
  const targetId = targetRaw ? (idCanonico(targetRaw) || targetRaw) : null

  if (!targetId) {
    return m.reply(
      t.ayuda || (
      `🕵️ *El Espía — Radar*\n\n` +
      `Menciona a alguien para escanear su equipo y estado.\n\n` +
      `💡 Uso: *espia @usuario*\n` +
      `💎 Costo: *${SPY_COST} diamantes*\n\n` +
      `📋 Info que revela:\n` +
      `• HP y vida máxima\n• Armadura (tipo, durabilidad, defensa)\n• Protección restante\n• Bounty y estado (libre/capturado)\n• Buffs activos\n• Inventario\n• Amenaza de cazador\n\n` +
      `⚠️ El escaneo marca al objetivo: su amenaza de cazador aumenta.`
      )
    )
  }

  if (mismoUsuario(targetId, id)) return m.reply(t.self || '❌ No puedes espiarte a ti mismo.')

  const u = getPlayerState(id)
  if (!u || (u.money || 0) < SPY_COST) {
    return m.reply(tpl(t.sin_dinero || '❌ El espía cobra *{costo}💎*. Tienes *{saldo}💎*.', { costo: SPY_COST, saldo: u?.money || 0 }))
  }

  const target = getPlayerState(targetId)
  if (!target) return m.reply(t.objetivo_no_encontrado || '❌ Objetivo no encontrado.')

  removeMoney(id, SPY_COST)

  // Marcar al objetivo: aumentar su amenaza de cazador
  try { trackGain(targetId, 4000, 2500) } catch {}

  const armor = target.armor || { type: 'ninguna', durability: 0, maxDurability: 0, defense: 0 }
  const protectionMs = typeof getProteccionRestante === 'function' ? getProteccionRestante(targetId) : 0
  const protectionText = protectionMs > 0 ? msToTime(protectionMs) : (target.protectActive || target.protectExpires > Date.now() ? 'Activo' : '—')
  const bountyStars = target.bountyStars || 0
  const bountyFine = target.bountyFine || 0
  const capturedText = target.isCaptured ? '⛓️ Capturado' : '✅ Libre'
  const hunterStatus = getHunterStatus(targetId)
  const buffs = (target.activeBuffs || []).filter(b => b.expiresAt > Date.now())
  const inv = target.inventory || {}
  const invItems = Object.entries(inv).filter(([, q]) => q > 0).map(([k, q]) => `${k} x${q}`).join(', ') || '—'
  const buffText = buffs.length ? buffs.map(b => `${b.type}`).join(', ') : '—'

  const rescueActive = target.rescueRequest?.active ? '📣 Activo' : '—'

  const text = tpl(t.informe || `🕵️ *Informe de Radar — @{objetivo}*\n━━━━━━━━━━━━━━━━━━━━\n❤️ HP: *{hp}/{maxHp}*\n🥼 Armadura: *{armadura}* (dur {dur}/{maxDur}) DEF {def}\n🛡️ Protección: *{proteccion}*\n🚨 Bounty: *{bounty}* ({fine} 💎)\n⛓️ Estado: *{estado}*\n🎯 Amenaza cazador: *{amenaza}%* ({cazador})\n✨ Buffs: *{buffs}*\n🎒 Inventario: *{inventario}*\n🆘 Rescate: *{rescate}*\n━━━━━━━━━━━━━━━━━━━━\n⚠️ El objetivo ha sido marcado: su amenaza de cazador aumentó.\n💎 Pagaste: *{costo}*`, {
    objetivo: (resolveJidToPhone(targetId) || 'desconocido'),
    hp: target.hp || 0,
    maxHp: target.maxHp || 100,
    armadura: armor.type,
    dur: armor.durability || 0,
    maxDur: armor.maxDurability || 0,
    def: armor.defense || 0,
    proteccion: protectionText,
    bounty: '⭐'.repeat(bountyStars) || '—',
    fine: bountyFine,
    estado: capturedText,
    amenaza: hunterStatus.threat,
    cazador: hunterStatus.active ? 'ACTIVO' : 'inactivo',
    buffs: buffText,
    inventario: invItems,
    rescate: rescueActive,
    costo: SPY_COST
  })

  return m.reply(text, null, { mentions: [targetId] })
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

handler.help = ['espia']
handler.tags = ['rpg']
handler.command = ['espia', 'spy', 'espiar']
handler.group = true

export default handler
