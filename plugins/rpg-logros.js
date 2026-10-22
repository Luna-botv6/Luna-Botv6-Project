import fs from 'fs'
import { getPlayerState, setPlayerState, addMoney, addExp } from '../lib/stats.js'
import { getArmorStats } from '../lib/stats.js'

const LOGROS = [
  { id: 'nivel_5',   nombre: 'Primeros pasos',   desc: 'Alcanza nivel 5',           cond: u => (u.level || 0) >= 5,   recompensa: { money: 200, exp: 50 } },
  { id: 'nivel_10',  nombre: 'Aventurero',       desc: 'Alcanza nivel 10',          cond: u => (u.level || 0) >= 10,  recompensa: { money: 500, exp: 100 } },
  { id: 'nivel_50',  nombre: 'Veterano',         desc: 'Alcanza nivel 50',          cond: u => (u.level || 0) >= 50,  recompensa: { money: 2000, exp: 500 } },
  { id: 'nivel_100', nombre: 'Leyenda',          desc: 'Alcanza nivel 100',         cond: u => (u.level || 0) >= 100, recompensa: { money: 5000, exp: 1000 } },
  { id: 'rico_1000', nombre: 'Adinerado',        desc: 'Ten 1000 diamantes',        cond: u => (u.money || 0) >= 1000, recompensa: { money: 300, exp: 50 } },
  { id: 'rico_10000',nombre: 'Millonario',       desc: 'Ten 10000 diamantes',       cond: u => (u.money || 0) >= 10000, recompensa: { money: 1000, exp: 200 } },
  { id: 'armado',    nombre: 'Equipado',         desc: 'Compra una armadura',       cond: u => { const a = u.armor || {}; return a.type && a.type !== 'ninguna' }, recompensa: { money: 300, exp: 80 } },
  { id: 'mascota',   nombre: 'Compañero',        desc: 'Obtén una mascota',         cond: u => { const p = u.pet || {}; return p.type && p.type !== 'ninguna' }, recompensa: { money: 500, exp: 100 } },
  { id: 'primer_mina', nombre: 'Minero',         desc: 'Mina por primera vez',      cond: u => (u.totalMines || 0) >= 1, recompensa: { money: 100, exp: 30 } },
  { id: 'minero_100', nombre: 'Minero experto',  desc: 'Mina 100 veces',            cond: u => (u.totalMines || 0) >= 100, recompensa: { money: 1500, exp: 300 } },
  { id: 'primer_duelo', nombre: 'Gladiador',     desc: 'Gana un duelo',             cond: u => (u.totalDuelWins || 0) >= 1, recompensa: { money: 300, exp: 80 } },
  { id: 'cazador_escape', nombre: 'Escapista',   desc: 'Escapa del cazador',        cond: u => (u.hunterTracking?.escapeAttempts || 0) >= 1, recompensa: { money: 400, exp: 100 } },
  { id: 'muerte',    nombre: 'Superviviente',    desc: 'Muere y revive',           cond: u => (u.deathCount || 0) >= 1, recompensa: { money: 200, exp: 50 } },
  { id: 'pescador',  nombre: 'Pescador',         desc: 'Pesca un pez',              cond: u => Object.keys(u.inventory || {}).some(k => k.startsWith('pez_')), recompensa: { money: 150, exp: 40 } },
  { id: 'crafter',   nombre: 'Artesano',         desc: 'Craftea un item',           cond: u => (u.inventory?.pocion_media || 0) > 0 || (u.inventory?.pocion_mayor || 0) > 0 || (u.inventory?.carne_asada || 0) > 0, recompensa: { money: 200, exp: 60 } },
  { id: 'misionero', nombre: 'Cumplidor',        desc: 'Completa una misión diaria', cond: u => (u.quests || []).some(q => q.reclamada), recompensa: { money: 250, exp: 70 } },
  { id: 'pvp_1',     nombre: 'Primer sangrado',  desc: 'Gana un combate PvP',       cond: u => (u.pvpWins || 0) >= 1, recompensa: { money: 300, exp: 80 } },
  { id: 'pvp_25',    nombre: 'Duelista',         desc: 'Gana 25 combates PvP',      cond: u => (u.pvpWins || 0) >= 25, recompensa: { money: 1500, exp: 300 } },
  { id: 'racha_5',   nombre: 'Imparable',        desc: 'Racha de 5 victorias PvP',  cond: u => (u.pvpBestStreak || 0) >= 5, recompensa: { money: 1000, exp: 200 } },
  { id: 'campeon_torneo', nombre: 'Campeón del finde', desc: 'Gana un torneo del finde', cond: u => (u.pvpTournamentWins || 0) >= 1, recompensa: { money: 2000, exp: 400 } },
]

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

const HELP_MSG =
  `🏆 *Logros*\n\n` +
  `📋 *Comandos:*\n` +
  `• *logros* — Ver tus logros\n` +
  `• *logros reclamar* — Reclamar recompensas de logros nuevos\n\n` +
  `Desbloquea logros jugando y gana recompensas.`

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_logros || {}
  const userId = m.sender
  const u = getPlayerState(userId)
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''

  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(t.help || HELP_MSG)

  // Verificar y desbloquear nuevos logros
  const nuevos = []
  for (const logro of LOGROS) {
    if (u.achievements.includes(logro.id)) continue
    if (logro.cond(u)) {
      u.achievements.push(logro.id)
      nuevos.push(logro)
    }
  }
  if (nuevos.length > 0) {
    let totalMoney = 0, totalExp = 0
    for (const l of nuevos) {
      totalMoney += l.recompensa.money || 0
      totalExp += l.recompensa.exp || 0
    }
    if (totalMoney > 0) addMoney(userId, totalMoney)
    if (totalExp > 0) addExp(userId, totalExp)
    setPlayerState(userId, u)
  }

  // Mostrar lista
  const lines = LOGROS.map(l => {
    const unlocked = u.achievements.includes(l.id)
    const nombre = t[`logro_${l.id}`] || l.nombre
    const desc = t[`logro_${l.id}_desc`] || l.desc
    return `${unlocked ? '✅' : '🔒'} *${nombre}* — ${desc}${unlocked ? ' 🎁' : ''}`
  }).join('\n')

  const total = LOGROS.length
  const unlocked = u.achievements.length

  let msg = (t.titulo || '🏆 *Logros* ({unlocked}/{total})').replace('{unlocked}', unlocked).replace('{total}', total) + `\n\n${lines}\n\n`
  if (nuevos.length > 0) {
    msg += (t.desbloqueaste || '🎉 *¡Desbloqueaste {n} logro(s)!*').replace('{n}', nuevos.length) + '\n'
    msg += nuevos.map(l => `• ${t[`logro_${l.id}`] || l.nombre} (+${l.recompensa.money}💎 +${l.recompensa.exp}⭐)`).join('\n') + '\n\n'
  }
  msg += t.animo || '💡 Sigue jugando para desbloquear más.'

  return m.reply(msg)
}

handler.help = ['logros', 'achievements', 'achievements']
handler.tags = ['rpg']
handler.command = ['logros', 'achievements', 'achievement']
handler.group = true

export default handler
