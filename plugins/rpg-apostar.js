import { getNpcState, gamblerBet } from '../lib/npcSystem.js'
import { getPlayerState } from '../lib/stats.js'

const handler = async (m, { conn, args }) => {
  const id  = m.sender
  const npc = getNpcState(id)

  if (!npc.gamblerActive) {
    const u = getPlayerState(id)
    return m.reply(
      `🎰 *El Apostador*\n\n` +
      `No hay ningún apostador aquí ahora.\n` +
      `Aparece aleatoriamente mientras juegas.\n\n` +
      `💎 Tu saldo: *${u.money || 0}*\n` +
      `⭐ Tu EXP: *${u.exp || 0}*`
    )
  }

  const type   = args?.[0]?.toLowerCase() === 'exp' ? 'exp' : 'money'
  const amount = type === 'exp' ? args?.[1] : args?.[0]

  if (!amount) {
    return m.reply(
      `🎰 *¡El Apostador está aquí!*\n\n` +
      `• *apostar <cantidad>* — Apuesta diamantes\n` +
      `• *apostar exp <cantidad>* — Apuesta EXP\n\n` +
      `🎲 Ganas: doble • Pierdes: todo lo apostado`
    )
  }

  const result = gamblerBet(id, type, amount)
  return m.reply(result.error || result.message)
}

handler.help = ['apostar']
handler.tags = ['rpg']
handler.command = ['apostar', 'gamble', 'apostar']
handler.group = true

export default handler
