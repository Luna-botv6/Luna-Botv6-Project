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
  const mentioned = resolveMention(m, args)
  let cmd = (args && args[0]) ? args[0].toLowerCase() : ''

  if (!cmd && mentioned) cmd = 'rescatar'
  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(HELP_MSG)

  // ─── PEDIR ───
  if (cmd === 'pedir' || cmd === 'request') {
    if (!isPlayerCaptured(m.sender)) return m.reply('❌ No estás capturado.\n💡 Usa *rescate ver* para ver tu estado.')

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
        return m.reply(`💀 *Has muerto en cautiverio.*\nNadie llegó a tiempo.\nPerdiste *${penalty.lostExp} EXP* y *${penalty.lostMoney} diamantes*.\nFuiste liberado pero con grandes consecuencias.`)
      }

      return m.reply(
        `⏳ Ya tienes una solicitud activa.\n` +
        `❤️ HP actual: *${uActual.hp}/${uActual.maxHp}*${damage > 0 ? ` (-${damage} desde última vez)` : ''}\n` +
        `⏱️ Tiempo restante: *${remainingMin} min*\n` +
        `💡 Dile a alguien: *rescate rescatar* y mencionarte`
      )
    }

    const u2 = getPlayerState(m.sender)
    u2.rescueRequest = { active: true, helper: null, penalty: u2.bountyFine || 0, startedAt: Date.now(), damageApplied: 0 }
    setPlayerState(m.sender, u2)

    return m.reply(
      `📣 *Solicitud de rescate enviada.*\n` +
      `⚠️ Tienes *5 minutos* o perderás *${TICK_DAMAGE} HP por minuto*.\n` +
      `❤️ HP actual: *${u2.hp}/${u2.maxHp}*\n` +
      `💡 Alguien debe mencionar a *${senderName}* y usar: *rescate rescatar @usuario*`,
      null, { mentions: [m.sender] }
    )
  }

  // ─── RESCATAR ───
  if (cmd === 'rescatar' || cmd === 'rescue') {
    if (!mentioned) return m.reply('❌ Menciona a quien rescatar.\n💡 Uso: *rescate rescatar @usuario*')
    if (mentioned === m.sender) return m.reply('❌ No puedes rescatarte a ti mismo.')
    if (isPlayerCaptured(m.sender)) return m.reply('❌ Estás capturado, no puedes rescatar a nadie.\n💡 Usa *rescate pedir* primero.')

    const targetState = getPlayerState(mentioned)
    const targetName = await getDisplayName(conn, mentioned) || `@${mentioned.split('@')[0]}`
    const helperName = await getDisplayName(conn, m.sender) || `@${m.sender.split('@')[0]}`

    if (!targetState?.isCaptured) return m.reply(`❌ ${targetName} no está capturado.`, null, { mentions: [mentioned] })
    if (!targetState?.rescueRequest?.active) return m.reply(`⏳ ${targetName} está capturado pero no ha pedido rescate.\nDile que use *rescate pedir* primero.`, null, { mentions: [mentioned] })

    const damage = applyPendingDamage(mentioned)
    const uTarget = getPlayerState(mentioned)

    if (uTarget.hp <= 0) {
      const penalty = applyDeathPenalty(mentioned)
      releasePlayer(mentioned)
      return m.reply(`💀 *${targetName} murió en cautiverio* antes de ser rescatado.\nPerdió *${penalty.lostExp} EXP* y *${penalty.lostMoney} diamantes*.`, null, { mentions: [mentioned] })
    }

    const elapsed = Date.now() - (uTarget.rescueRequest.startedAt || 0)
    if (elapsed > RESCUE_TIMEOUT_MS) {
      const penalty = applyDeathPenalty(mentioned)
      releasePlayer(mentioned)
      return m.reply(`⏰ *El tiempo de rescate expiró.* ${targetName} fue liberado por muerte.\nPerdió *${penalty.lostExp} EXP* y *${penalty.lostMoney} diamantes*.`, null, { mentions: [mentioned] })
    }

    const hpInfo = damage > 0 ? `\n⚠️ ${targetName} perdió *${damage} HP* mientras esperaba. HP: *${uTarget.hp}/${uTarget.maxHp}*` : ''

    const wasCapturedByHunter = isCapturedByHunter(mentioned)

    if (Math.random() < 0.6) {
      releasePlayer(mentioned)
      let successMsg = `✅ ¡Rescate exitoso! *${targetName}* ha sido liberado.${hpInfo}`
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
        `❌ ¡Rescate fallido! *${helperName}* fue capturado en el intento.${hpInfo}`,
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
    const estado = u.isCaptured ? '⛓️ Capturado' : '✅ Libre'
    const bounty = u.bountyStars ? `${'⭐'.repeat(u.bountyStars)} (${u.bountyFine} diamantes)` : '—'

    let rescateInfo = '—'
    if (u.rescueRequest?.active && u.rescueRequest.startedAt) {
      const elapsed = Date.now() - u.rescueRequest.startedAt
      const remaining = Math.max(0, RESCUE_TIMEOUT_MS - elapsed)
      const remainingMin = Math.ceil(remaining / 60000)
      rescateInfo = `📣 Activo • ${remainingMin} min restantes`
    }

    const hpLine = u.isCaptured ? `\n❤️ HP: *${u.hp}/${u.maxHp}*${damage > 0 ? ` (-${damage} recién)` : ''}` : ''

    return m.reply(
      `👤 ${whoName}${hpLine}\n📊 Estado: ${estado}\n🆘 Rescate: ${rescateInfo}\n🚨 Bounty: ${bounty}`,
      null, { mentions: [who] }
    )
  }

  return m.reply(`❓ Subcomando no reconocido.\n\n${HELP_MSG}`)
}

handler.help = ['rescate', 'recate']
handler.tags = ['rpg']
handler.command = ['rescate', 'recate', 'rescue']

export default handler