import fs from 'fs'
import { getPlayerState, payFine } from '../lib/stats.js'
import { resolveMention } from '../lib/mentionHelper.js'

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.rpg_bounty || {};
  const mentioned = resolveMention(m, args)
  const userId = mentioned || m.sender
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''

  const user = getPlayerState(userId)
  if (!user) return m.reply(t.usuario_no_encontrado || 'Usuario no encontrado.')

  if (!cmd || cmd === 'ver') {
    const stars = user.bountyStars || 0
    const fine = user.bountyFine || 0
    const reason = user.wantedReason || '—'
    return m.reply((t.bounty || `🚨 Bounty para @{userId}\n⭐ Estrellas: {stars}\n💸 Multa: {fine}\n🔎 Motivo: {reason}`)
      .replace('{userId}', userId.split('@')[0])
      .replace('{stars}', '⭐'.repeat(stars) || '—')
      .replace('{fine}', fine)
      .replace('{reason}', reason), null, { mentions: [userId] })
  }

  if (cmd === 'pagar' || cmd === 'pay') {
    if (m.sender !== userId) return m.reply(t.pagar_propia || 'Debes pagar tu propia multa.')
    const ok = payFine(userId)
    if (!ok) return m.reply(t.sin_multa || 'No tienes multa activa o no tienes suficiente dinero.')
    return m.reply(t.pagada || '✅ Has pagado la multa y tu bounty se ha eliminado.')
  }

  return m.reply(t.usos || 'Usos: bounty | bounty ver | bounty pagar')
}

handler.help = ['bounty']
handler.tags = ['rpg']
handler.command = ['bounty', 'multas', 'multa']

export default handler
