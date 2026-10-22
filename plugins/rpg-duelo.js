import fs from 'fs'
import { getPlayerState, setPlayerState, addMoney, removeMoney, getArmorStats } from '../lib/stats.js'
import { resolveMention } from '../lib/mentionHelper.js'
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js'
import { idCanonico, mismoUsuario } from '../lib/identidad.js'

const MIN_APUESTA = 200

const mostrar = (jid) => resolveJidToPhone(jid) || 'desconocido'

const HELP_MSG =
  `⚔️ *Duelos PvP*\n\n` +
  `📋 *Uso:* duelo @usuario <cantidad>\n\n` +
  `Ambos jugadores apuestan la misma cantidad.\n` +
  `El ganador se lleva el pozo (2x).\n` +
  `La probabilidad depende de nivel, HP y armadura.\n\n` +
  `💰 Apuesta mínima: *${MIN_APUESTA} diamantes*`

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_duelo || {}
  const userId = idCanonico(m.sender) || m.sender
  const tieneObjetivo = !!(m.mentionedJid?.[0] || m.message?.contextInfo?.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.quoted?.sender)
  const targetRaw = tieneObjetivo ? resolveMention(m, args) : null
  const targetId = targetRaw ? (idCanonico(targetRaw) || targetRaw) : null
  const amt = parseInt(args?.find(a => /^\d+$/.test(a)))

  if (!targetId) return m.reply(tpl(t.help || HELP_MSG, { min: MIN_APUESTA }))
  if (mismoUsuario(targetId, userId)) return m.reply(t.no_auto || '❌ No puedes duelarte a ti mismo.')
  if (isNaN(amt) || amt < MIN_APUESTA) return m.reply(tpl(t.apuesta_minima || '❌ Apuesta mínima: {min}💎', { min: MIN_APUESTA }))

  const u1 = getPlayerState(userId)
  const u2 = getPlayerState(targetId)
  if ((u1.money || 0) < amt) return m.reply(tpl(t.sin_saldo || '❌ No tienes suficientes diamantes. Tienes *{saldo}💎*', { saldo: u1.money || 0 }))
  if ((u2.money || 0) < amt) return m.reply(t.oponente_sin_saldo || '❌ Tu oponente no tiene suficientes diamantes.')

  removeMoney(userId, amt)
  removeMoney(targetId, amt)

  const score1 = (u1.level || 0) * 2 + (u1.hp || 0) + (u1.armor?.defense || 0) * 5
  const score2 = (u2.level || 0) * 2 + (u2.hp || 0) + (u2.armor?.defense || 0) * 5
  const total = score1 + score2
  const p1 = score1 / total

  const gana1 = Math.random() < p1
  const ganador = gana1 ? userId : targetId
  const perdedor = gana1 ? targetId : userId
  addMoney(ganador, amt * 2)
  const _ug = getPlayerState(ganador)
  _ug.totalDuelWins = (_ug.totalDuelWins || 0) + 1
  setPlayerState(ganador, _ug)

  return m.reply(tpl(t.resultado || '⚔️ *Duelo*\n\n@{u1} vs @{u2}\nApuesta: *{apuesta}💎* cada uno (pozo *{pozo}💎*)\n\n🏆 Ganador: @{ganador}\n💰 Recibió: *{pozo}💎*\n\n📊 Poder: {p1} vs {p2}', { u1: mostrar(userId), u2: mostrar(targetId), apuesta: amt, pozo: amt * 2, ganador: mostrar(ganador), p1: score1, p2: score2 }), null, { mentions: [userId, targetId] })
}

handler.help = ['duelo']
handler.tags = ['rpg', 'juegos']
handler.command = ['duelo', 'duel']
handler.group = true

export default handler
