import { getPlayerState, addMoney, removeMoney } from '../lib/stats.js'
import { resolveMention } from '../lib/mentionHelper.js'
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js'
import { idCanonico, mismoUsuario } from '../lib/identidad.js'
import {
  getRanking, getUserPosition, getLastWinners, getPrizes, weekKey, esFinDeSemana,
  getTournament, getTournamentPrizes, getLastTournament, registerTournament, unregisterTournament,
  createBet, getBetTo, deleteBet, registerResult
} from '../lib/pvpSystem.js'

const MIN_APUESTA = 200

const mostrar = (jid) => resolveJidToPhone(jid) || 'desconocido'

const HELP_MSG =
  `⚔️ *Arena PvP*\n\n` +
  `📋 *Comandos:*\n` +
  `• *pvp* — Ranking semanal\n` +
  `• *pvp @usuario <monto>* — Retar con apuesta\n` +
  `• *pvp aceptar* — Aceptar reto pendiente\n` +
  `• *pvp rechazar* — Rechazar reto\n` +
  `• *pvp torneo* — Inscribirte al torneo del finde\n\n` +
  `💰 Apuesta mínima: *${MIN_APUESTA}💎*\n` +
  `🏆 Top 3 semanal cobra premio automático\n` +
  `🔥 Sábado y domingo: puntos x2\n` +
  `⏳ Los retos expiran en 10 minutos`

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

function poder(u) {
  return (u.level || 0) * 2 + (u.hp || 0) + (u.armor?.defense || 0) * 5
}

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_pvp || {}
  const userId = idCanonico(m.sender) || m.sender
  const sub = (args?.[0] || '').toLowerCase()
  const send = (text, extra = {}) => conn.sendMessage(m.chat, { text, ...extra }, { quoted: m })

  if (sub === 'aceptar' || sub === 'accept' || sub === 'aceitar' || sub === 'accepter' || sub === 'принять') {
    const bet = getBetTo(userId, m.chat)
    if (!bet) return send(t.sin_reto || '❌ No tenés retos pendientes.')
    const u1 = getPlayerState(bet.from)
    const u2 = getPlayerState(userId)
    if ((u1.money || 0) < bet.amount) {
      deleteBet(bet.id)
      return send(tpl(t.rival_sin_saldo || '❌ @{user} ya no tiene *{monto}💎*. Reto cancelado.', { user: mostrar(bet.from), monto: bet.amount }), { mentions: [bet.from] })
    }
    if ((u2.money || 0) < bet.amount) {
      return send(tpl(t.sin_saldo || '❌ No tenés suficientes diamantes. Tenés *{saldo}💎*.', { saldo: u2.money || 0 }))
    }

    removeMoney(bet.from, bet.amount)
    removeMoney(userId, bet.amount)
    deleteBet(bet.id)

    const p1 = poder(u1)
    const p2 = poder(u2)
    const total = p1 + p2
    const prob1 = total > 0 ? p1 / total : 0.5
    const gana1 = Math.random() < prob1
    const ganador = gana1 ? bet.from : userId
    const pozo = bet.amount * 2

    addMoney(ganador, pozo)
    registerResult(ganador, ganador === bet.from ? userId : bet.from)

    return send(
      tpl(t.resultado || '⚔️ *Duelo PvP*\n\n@{u1} vs @{u2}\nPozo: *{pozo}💎*\n\n🏆 Ganador: @{ganador}\n💎 Recibió: *{pozo}💎*\n\n📊 Poder: {p1} vs {p2}', {
        u1: mostrar(bet.from), u2: mostrar(userId),
        pozo, ganador: mostrar(ganador), p1, p2
      }),
      { mentions: [bet.from, userId] }
    )
  }

  if (sub === 'rechazar' || sub === 'reject' || sub === 'recusar' || sub === 'refuser' || sub === 'отклонить') {
    const bet = getBetTo(userId, m.chat)
    if (!bet) return send(t.sin_reto || '❌ No tenés retos pendientes.')
    deleteBet(bet.id)
    return send(tpl(t.rechazado_aviso || '❌ @{user} rechazó el reto de @{rival} de *{monto}💎*.', {
      user: mostrar(userId), rival: mostrar(bet.from), monto: bet.amount
    }), { mentions: [userId, bet.from] })
  }

  if (sub === 'torneo' || sub === 'tournament' || sub === 'torneio' || sub === 'tournoi' || sub === 'турнир' || sub === 'بطولة') {
    const premiosTorneo = getTournamentPrizes()
    const accion = (args?.[1] || '').toLowerCase()
    if (accion === 'salir' || accion === 'leave') {
      const r = unregisterTournament(userId)
      return send(r.ok
        ? (t.torneo_salir || '🏟️ Saliste del torneo. Inscriptos: *{n}*').replace('{n}', r.count)
        : (t.torneo_no_inscripto || '❌ No estabas inscripto al torneo.'))
    }
    const r = registerTournament(userId)
    if (!r.ok && r.motivo === 'ya') {
      return send((t.torneo_ya || '🏟️ Ya estás inscripto. Inscriptos: *{n}*').replace('{n}', r.count))
    }
    if (!r.ok) return send(t.torneo_cerrado || '❌ El torneo de esta semana ya cerró.')
    return send(
      (t.torneo_inscripto || '🏟️ *¡Estás inscripto al Torneo del Finde!*\n\n👥 Inscriptos: *{n}*\n🎁 Premios: 🥇 {p1}💎 · 🥈 {p2}💎 · 🥉 {p3}💎\n\n🔥 Sábado y domingo los puntos valen x2\n💡 *pvp* para ver el ranking')
        .replace('{n}', r.count).replace('{p1}', premiosTorneo[0]).replace('{p2}', premiosTorneo[1]).replace('{p3}', premiosTorneo[2])
    )
  }

  const tieneObjetivo = !!(m.mentionedJid?.[0] || m.message?.contextInfo?.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.quoted?.sender)
  const targetRaw = tieneObjetivo ? resolveMention(m, args) : null
  const targetId = targetRaw ? (idCanonico(targetRaw) || targetRaw) : null
  const amount = parseInt((args || []).find(a => /^\d+$/.test(a)))

  if (targetId && !mismoUsuario(targetId, userId)) {
    if (isNaN(amount) || amount < MIN_APUESTA) {
      return send(tpl(t.apuesta_minima || '❌ Apuesta mínima: *{min}💎*.', { min: MIN_APUESTA }))
    }
    const u1 = getPlayerState(userId)
    if ((u1.money || 0) < amount) {
      return send(tpl(t.sin_saldo || '❌ No tenés suficientes diamantes. Tenés *{saldo}💎*.', { saldo: u1.money || 0 }))
    }
    createBet(userId, targetId, amount, m.chat)
    return send(
      tpl(t.reto_enviado || '⚔️ *Reto enviado*\n\n@{to}, @{from} te desafía por *{monto}💎*.\n\n✅ *pvp aceptar* | ❌ *pvp rechazar*\n⏳ Expira en 10 minutos.', {
        to: mostrar(targetId), from: mostrar(userId), monto: amount
      }),
      { mentions: [targetId, userId] }
    )
  }

  if (targetId && mismoUsuario(targetId, userId)) return send(t.no_auto || '❌ No podés retarte a vos mismo.')

  const ranking = getRanking(10)
  const mine = getUserPosition(userId)
  const semana = weekKey().split('-W')[1]

  let texto = (t.ranking_title || '🏆 *Ranking PvP — Semana {semana}*\n\n').replace('{semana}', semana)
  if (ranking.length) {
    for (let i = 0; i < ranking.length; i++) {
      const r = ranking[i]
      const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
      texto += tpl(t.ranking_line || '{pos} @{user} — *{puntos}* pts ({wins}W/{losses}L) 🔥{racha}', {
        pos: medalla, user: mostrar(r.id), puntos: r.points || 0, wins: r.wins || 0, losses: r.losses || 0, racha: r.streak || 0
      }) + '\n'
    }
  } else {
    texto += (t.sin_datos || 'Todavía no hay duelos esta semana.\n💡 *pvp @usuario <monto>* para empezar.') + '\n'
  }

  if (mine.pos) {
    texto += tpl(t.tu_posicion || '\n📊 *Tu posición:* #{pos} — {puntos} pts ({wins}W/{losses}L)', {
      pos: mine.pos, puntos: mine.stats.points || 0, wins: mine.stats.wins || 0, losses: mine.stats.losses || 0
    })
  }

  const premios = getPrizes()
  texto += tpl(t.premios || '\n\n🏆 *Premios semanales:* 🥇 {p1}💎 · 🥈 {p2}💎 · 🥉 {p3}💎', { p1: premios[0], p2: premios[1], p3: premios[2] })

  const torneo = getTournament()
  const premiosTorneo = getTournamentPrizes()
  texto += '\n' + tpl(t.torneo_titulo || '🏟️ *Torneo del finde:* {n} inscriptos\n🎁 🥇 {p1}💎 · 🥈 {p2}💎 · 🥉 {p3}💎\n💡 *pvp torneo* para inscribirte', {
    n: torneo.participantes.length, p1: premiosTorneo[0], p2: premiosTorneo[1], p3: premiosTorneo[2]
  })

  if (esFinDeSemana()) {
    texto += '\n' + (t.fin_de_semana || '🔥 Fin de semana: los puntos valen *x2*')
  }

  const lastTorneo = getLastTournament()
  if (lastTorneo && lastTorneo.top && lastTorneo.top.length) {
    const lines = lastTorneo.top.map((r, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} @${mostrar(r.id)} — ${r.points || 0} pts`).join('\n')
    texto += '\n\n' + tpl(t.torneo_semana || '🏟️ *Torneo de la semana {semana}:*', { semana: (lastTorneo.week || '').split('-W')[1] || '' }) + '\n' + lines
  }

  const last = getLastWinners()
  if (last && last.top && last.top.length) {
    const lines = last.top.map((r, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} @${mostrar(r.id)} — ${r.points || 0} pts`).join('\n')
    texto += '\n\n' + tpl(t.ganadores_semana || '🏅 *Ganadores de la semana {semana}:*', { semana: (last.week || '').split('-W')[1] || '' }) + '\n' + lines
  }

  return send(texto, { mentions: ranking.map(r => r.id) })
}

handler.help = ['pvp', 'arena']
handler.tags = ['rpg', 'juegos']
handler.command = ['pvp', 'arena', 'rankingpvp']
handler.group = true

export default handler
