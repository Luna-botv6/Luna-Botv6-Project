import fs from 'fs'
import { getPlayerState, payFine } from '../lib/stats.js'
import { resolveMention } from '../lib/mentionHelper.js'

const handler = async (m, { conn, args }) => {
  const mentioned = resolveMention(m, args)
  const userId = mentioned || m.sender
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''

  const user = getPlayerState(userId)
  if (!user) return m.reply('Usuario no encontrado.')

  if (!cmd || cmd === 'ver') {
    const stars = user.bountyStars || 0
    const fine = user.bountyFine || 0
    const reason = user.wantedReason || '—'
    return m.reply(`🚨 Bounty para @${userId.split('@')[0]}\n⭐ Estrellas: ${'⭐'.repeat(stars) || '—'}\n💸 Multa: ${fine}\n🔎 Motivo: ${reason}`, null, { mentions: [userId] })
  }

  if (cmd === 'pagar' || cmd === 'pay') {
    if (m.sender !== userId) return m.reply('Debes pagar tu propia multa.')
    const ok = payFine(userId)
    if (!ok) return m.reply('No tienes multa activa o no tienes suficiente dinero.')
    return m.reply('✅ Has pagado la multa y tu bounty se ha eliminado.')
  }

  return m.reply('Usos: bounty | bounty ver | bounty pagar')
}

handler.help = ['bounty']
handler.tags = ['rpg']
handler.command = ['bounty', 'multas', 'multa']

export default handler
