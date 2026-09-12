import fs from 'fs'
import { getPlayerState, setPlayerState, requestRescue, releasePlayer, capturePlayer, increaseBounty, isPlayerCaptured, applyDeathPenalty, isCapturedByHunter } from '../lib/stats.js'
import { rescuerBounty, checkSavior } from '../lib/hunterSystem.js'
import { resolveMention } from '../lib/mentionHelper.js'

const RESCUE_TIMEOUT_MS = 5 * 60 * 1000
const TICK_DAMAGE = 8
const TICK_MS = 60 * 1000

const HELP_MSG =
  `🆘 *Sistema de Rescate*\n\n` +
  `📌 *Cómo funciona:*\n` +
  `1️⃣ El jugador capturado usa: *rescate pedir*\n` +
  `   ⚠️ Tienes 5 minutos o perderás vida progresivamente\n` +
  `2️⃣ Otro jugador lo rescata: *rescate rescatar @usuario*\n` +
  `3️⃣ Si el rescate falla, el rescatador también queda capturado\n\n` +
  `📋 *Comandos:*\n` +
  `• *rescate pedir* — Pedir rescate (puedes repetirlo)\n` +
  `• *rescate rescatar @usuario* — Intentar liberar a alguien\n` +
  `• *rescate ver* [@usuario] — Ver estado y HP restante`

function calcAccumulatedDamage(startedAt) {
  if (!startedAt) return 0
  const ticks = Math.floor((Date.now() - startedAt) / TICK_MS)
  return ticks * TICK_DAMAGE
}

function applyPendingDamage(userId) {
  const u = getPlayerState(userId)
  if (!u?.rescueRequest?.active || !u.rescueRequest.startedAt) return 0
  const alreadyApplied = u.rescueRequest.damageApplied || 0
  const totalDue = calcAccumulatedDamage(u.rescueRequest.startedAt)
  const newDamage = totalDue - alreadyApplied
  if (newDamage <= 0) return 0
  u.rescueRequest.damageApplied = totalDue
  u.hp = Math.max(0, (u.hp || 100) - newDamage)
  setPlayerState(userId, u)
  return newDamage
}

async function getDisplayName(conn, jid) {
  try {
    const c = await conn.getContact(jid)
    return c?.notify || c?.name || null
  } catch {}
  try { return conn.getName?.(jid) || null } catch {}
  return null
}

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_rescate || {}
  const mentioned = resolveMention(m, args)
  let cmd = (args && args[0]) ? args[0].toLowerCase() : ''

  if (!cmd && mentioned) cmd = 'rescatar'
  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(t.help || HELP_MSG)

  // ─── PEDIR ───
  if (cmd === 'pedir' || cmd === 'request') {
    if (!isPlayerCaptured(m.sender)) return m.reply(t.no_capturado || `❌ No estás capturado.\n💡 Usa *rescate ver* para ver tu estado.`)

    const savior = checkSavior(m.sender)
    if (savior) return m.reply(savior.message)

    const u = getPlayerState(m.sender)
    const senderName = await getDisplayName(conn, m.sender) || `@${m.sender.split('@')[0]}`

    if (u.rescueRequest?.active && u.rescueRequest.startedAt) {
      const damage = applyPendingDamage(m.sender)
      const uActual = getPlayerState(m.sender)
      const elapsed = Date.now() - u.rescueRequest.startedAt
      const remaining = Math.max(0, RESCUE_TIMEOUT_MS - elapsed)
      const remainingMin = Math.ceil(remaining / 60000)

      if (remaining <= 0 || uActual.hp <= 0) {
        const penalty = applyDeathPenalty(m.sender)
        releasePlayer(m.sender)
        return m.reply(t.muerto_cautiverio?.replace('{exp}', penalty.lostExp).replace('{diamantes}', penalty.lostMoney) || `💀 *Has muerto en cautiverio.*\nNadie llegó a tiempo.\nPerdiste *${penalty.lostExp} EXP* y *${penalty.lostMoney} diamantes*.\nFuiste liberado pero con grandes consecuencias.`)
      }

      let textoSolicitud = t.solicitud_activa?.replace('{hp}', uActual.hp).replace('{maxHp}', uActual.maxHp).replace('{dano}', (damage > 0 ? (t.dano_reciente?.replace('{dano}', damage) || ` (-${damage} desde última vez)`) : '')).replace('{min}', remainingMin) ||
        `⏳ Ya tienes una solicitud activa.\n` +
        `❤️ HP actual: *${uActual.hp}/${uActual.maxHp}*${damage > 0 ? ` (-${damage} desde última vez)` : ''}\n` +
        `⏱️ Tiempo restante: *${remainingMin} min*\n` +
        `💡 Dile a alguien: *rescate rescatar* y mencionarte`
      return m.reply(textoSolicitud)
    }

    const u2 = getPlayerState(m.sender)
    u2.rescueRequest = { active: true, helper: null, penalty: u2.bountyFine || 0, startedAt: Date.now(), damageApplied: 0 }
    setPlayerState(m.sender, u2)

    return m.reply(
      t.solicitud_enviada?.replace('{dano}', TICK_DAMAGE).replace('{hp}', u2.hp).replace('{maxHp}', u2.maxHp).replace('{nombre}', senderName) ||
      `📣 *Solicitud de rescate enviada.*\n` +
      `⚠️ Tienes *5 minutos* o perderás *${TICK_DAMAGE} HP por minuto*.\n` +
      `❤️ HP actual: *${u2.hp}/${u2.maxHp}*\n` +
      `💡 Alguien debe mencionar a *${senderName}* y usar: *rescate rescatar @usuario*`,
      null, { mentions: [m.sender] }
    )
  }

  // ─── RESCATAR ───
  if (cmd === 'rescatar' || cmd === 'rescue') {
    if (!mentioned) return m.reply(t.menciona_a_quien || `❌ Menciona a quien rescatar.\n💡 Uso: *rescate rescatar @usuario*`)
    if (mentioned === m.sender) return m.reply(t.no_auto_rescate || `❌ No puedes rescatarte a ti mismo.`)
    if (isPlayerCaptured(m.sender)) return m.reply(t.estas_capturado || `❌ Estás capturado, no puedes rescatar a nadie.\n💡 Usa *rescate pedir* primero.`)

    const targetState = getPlayerState(mentioned)
    const targetName = await getDisplayName(conn, mentioned) || `@${mentioned.split('@')[0]}`
    const helperName = await getDisplayName(conn, m.sender) || `@${m.sender.split('@')[0]}`

    if (!targetState?.isCaptured) return m.reply(t.no_capturado_target?.replace('{nombre}', targetName) || `❌ ${targetName} no está capturado.`, null, { mentions: [mentioned] })
    if (!targetState?.rescueRequest?.active) return m.reply(t.sin_solicitud_target?.replace('{nombre}', targetName) || `⏳ ${targetName} está capturado pero no ha pedido rescate.\nDile que use *rescate pedir* primero.`, null, { mentions: [mentioned] })

    const damage = applyPendingDamage(mentioned)
    const uTarget = getPlayerState(mentioned)

    if (uTarget.hp <= 0) {
      const penalty = applyDeathPenalty(mentioned)
      releasePlayer(mentioned)
      return m.reply(t.murio_cautiverio?.replace('{nombre}', targetName).replace('{exp}', penalty.lostExp).replace('{diamantes}', penalty.lostMoney) || `💀 *${targetName} murió en cautiverio* antes de ser rescatado.\nPerdió *${penalty.lostExp} EXP* y *${penalty.lostMoney} diamantes*.`, null, { mentions: [mentioned] })
    }

    const elapsed = Date.now() - (uTarget.rescueRequest.startedAt || 0)
    if (elapsed > RESCUE_TIMEOUT_MS) {
      const penalty = applyDeathPenalty(mentioned)
      releasePlayer(mentioned)
      return m.reply(t.tiempo_expiro?.replace('{nombre}', targetName).replace('{exp}', penalty.lostExp).replace('{diamantes}', penalty.lostMoney) || `⏰ *El tiempo de rescate expiró.* ${targetName} fue liberado por muerte.\nPerdió *${penalty.lostExp} EXP* y *${penalty.lostMoney} diamantes*.`, null, { mentions: [mentioned] })
    }

    let hpInfo = ''
    if (damage > 0) hpInfo = t.perdio_hp?.replace('{nombre}', targetName).replace('{dano}', damage).replace('{hp}', uTarget.hp).replace('{maxHp}', uTarget.maxHp) || `\n⚠️ ${targetName} perdió *${damage} HP* mientras esperaba. HP: *${uTarget.hp}/${uTarget.maxHp}*`

    const wasCapturedByHunter = isCapturedByHunter(mentioned)

    if (Math.random() < 0.6) {
      releasePlayer(mentioned)
      let successMsg = (t.rescate_exito?.replace('{nombre}', targetName) || `✅ ¡Rescate exitoso! *${targetName}* ha sido liberado.`) + hpInfo
      if (wasCapturedByHunter) {
        const bonus = rescuerBounty(m.sender, mentioned)
        if (bonus) successMsg += bonus.message
      }
      return m.reply(successMsg, null, { mentions: [mentioned] })
    } else {
      capturePlayer(m.sender, 'Intento de rescate fallido')
      increaseBounty(m.sender, 1, 200, 'Rescate fallido')
      increaseBounty(mentioned, 1, 100, 'Rescate fallido (consecuencia)')
      return m.reply(
        (t.rescate_fallido?.replace('{helper}', helperName) || `❌ ¡Rescate fallido! *${helperName}* fue capturado en el intento.`) + hpInfo,
        null, { mentions: [m.sender, mentioned] }
      )
    }
  }

  // ─── VER ───
  if (cmd === 'ver') {
    const who = mentioned || m.sender
    const damage = applyPendingDamage(who)
    const u = getPlayerState(who)
    const whoName = await getDisplayName(conn, who) || `@${who.split('@')[0]}`
    const estado = u.isCaptured ? (t.estado_capturado || `⛓️ Capturado`) : (t.estado_libre || `✅ Libre`)
    const bounty = u.bountyStars ? ((t.bounty_texto?.replace('{estrellas}', '⭐'.repeat(u.bountyStars)).replace('{diamantes}', u.bountyFine)) || `${'⭐'.repeat(u.bountyStars)} (${u.bountyFine} diamantes)`) : '—'

    let rescateInfo = '—'
    if (u.rescueRequest?.active && u.rescueRequest.startedAt) {
      const elapsed = Date.now() - u.rescueRequest.startedAt
      const remaining = Math.max(0, RESCUE_TIMEOUT_MS - elapsed)
      const remainingMin = Math.ceil(remaining / 60000)
      rescateInfo = t.rescate_activo?.replace('{min}', remainingMin) || `📣 Activo • ${remainingMin} min restantes`
    }

    let hpLine = ''
    if (u.isCaptured) {
      hpLine = t.hp_linea?.replace('{hp}', u.hp).replace('{maxHp}', u.maxHp) || `\n❤️ HP: *${u.hp}/${u.maxHp}*`
      if (damage > 0) hpLine += t.dano_recien?.replace('{dano}', damage) || ` (-${damage} recién)`
    }

    return m.reply(
      t.ver_titulo?.replace('{nombre}', whoName).replace('{hpLine}', hpLine).replace('{estado}', estado).replace('{rescate}', rescateInfo).replace('{bounty}', bounty) ||
      `👤 ${whoName}${hpLine}\n📊 Estado: ${estado}\n🆘 Rescate: ${rescateInfo}\n🚨 Bounty: ${bounty}`,
      null, { mentions: [who] }
    )
  }

  return m.reply((t.subcomando || `❓ Subcomando no reconocido.\n\n`) + (t.help || HELP_MSG))
}

handler.help = ['rescate', 'recate']
handler.tags = ['rpg']
handler.command = ['rescate', 'recate', 'rescue']

export default handler