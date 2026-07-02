import { isHunterActive, isCapturedByHunter, isPlayerCaptured } from '../lib/stats.js'
import { runFromHunter, fightHunter, getHunterStatus } from '../lib/hunterSystem.js'

const HELP_MSG =
  `🎯 *El Cazador*\n\n` +
  `Un cazador de recompensas que aparece cuando acumulas demasiadas ganancias en poco tiempo.\n\n` +
  `📋 *Comandos:*\n` +
  `• *cazador ver* — Ver tu nivel de amenaza actual\n` +
  `• *cazador correr* — Intentar escapar (40% éxito)\n` +
  `• *cazador pelear* — Enfrentarlo (5% éxito)\n\n` +
  `⚠️ *Correr y pelear solo funcionan cuando el cazador aparece.*`

function msToTime(ms) {
  if (!ms || ms <= 0) return '0s'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const handler = async (m, { conn, args }) => {
  const id  = m.sender
  const cmd = args?.[0]?.toLowerCase() || ''

  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(HELP_MSG)

  if (cmd === 'ver' || cmd === 'status') {
    const status = getHunterStatus(id)

    if (isCapturedByHunter(id)) {
      return m.reply(
        `⛓️ *Estás capturado por el Cazador.*\n\n` +
        `No puedes usar comandos RPG.\n` +
        `Solo un rescate puede liberarte.\n` +
        `📣 Usa: *rescate pedir*`
      )
    }

    if (status.active) {
      return m.reply(
        `🎯 *¡El Cazador está aquí!* [Nivel ${status.level} — ${status.hunterName}]\n\n` +
        `No puedes ignorarlo. Debes actuar ahora:\n` +
        `• *cazador correr* — ${Math.round(([0.40,0.28,0.15][status.level-1]))*100 || '?'}% de escapar\n` +
        `• *cazador pelear* — ${Math.round(([0.05,0.03,0.02][status.level-1]))*100 || '?'}% de ganarle\n\n` +
        `⚠️ Cada segundo que esperas es un riesgo.`
      )
    }

    const threatBar = () => {
      const filled = Math.round(status.threat / 20)
      return '🟥'.repeat(filled) + '⬛'.repeat(5 - filled)
    }

    const windowLeft = status.windowStart
      ? Math.max(0, 30 * 60 * 1000 - (Date.now() - status.windowStart))
      : 0

    return m.reply(
      `🎯 *Estado del Cazador*\n\n` +
      `📊 Amenaza: ${threatBar()} *${status.threat}%*\n` +
      `🎯 Nivel del Cazador: *${status.level} — ${status.hunterName}*\n` +
      `⭐ EXP acumulada: *${status.gainExp.toLocaleString()}* / 8,000\n` +
      `💎 Diamantes acumulados: *${status.gainMoney.toLocaleString()}* / 5,000\n` +
      `⏱️ Ventana activa: *${msToTime(windowLeft)}*\n` +
      `🏃 Escapes previos: *${status.escapeAttempts}*\n\n` +
      (status.threat >= 80
        ? `🔴 *Peligro extremo.* El cazador puede aparecer en cualquier momento.`
        : status.threat >= 40
          ? `🟡 *Nivel medio.* Evita ganar mucho más por ahora.`
          : status.threat > 0
            ? `🟢 *Amenaza baja.* Sigue jugando con cuidado.`
            : `✅ *Sin amenaza.* El cazador no te busca por ahora.`)
    )
  }

  if (cmd === 'correr' || cmd === 'run' || cmd === 'escapar') {
    if (isCapturedByHunter(id)) {
      return m.reply(
        `⛓️ Ya estás capturado. No puedes correr.\n` +
        `📣 Usa: *rescate pedir*`
      )
    }

    if (!isHunterActive(id)) {
      return m.reply(
        `🤔 El cazador no está aquí ahora mismo.\n` +
        `💡 Usa *cazador ver* para ver tu nivel de amenaza.`
      )
    }

    const result = runFromHunter(id)

    if (result.escaped) {
      return m.reply(result.message)
    }

    return m.reply(result.message)
  }

  if (cmd === 'pelear' || cmd === 'fight' || cmd === 'luchar') {
    if (isCapturedByHunter(id)) {
      return m.reply(
        `⛓️ Ya estás capturado. No puedes pelear.\n` +
        `📣 Usa: *rescate pedir*`
      )
    }

    if (!isHunterActive(id)) {
      return m.reply(
        `🤔 El cazador no está aquí ahora mismo.\n` +
        `💡 Usa *cazador ver* para ver tu nivel de amenaza.`
      )
    }

    return m.reply(fightHunter(id).message)
  }

  return m.reply(`❓ Subcomando no reconocido.\n\n${HELP_MSG}`)
}

handler.help = ['cazador']
handler.tags = ['rpg']
handler.command = ['cazador', 'hunter', 'bounty_hunter']
handler.group = true

export default handler
