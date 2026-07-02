import { callSpy } from '../lib/npcSystem.js'
import { resolveMention } from '../lib/mentionHelper.js'

const handler = async (m, { conn, args }) => {
  const id       = m.sender
  const targetId = resolveMention(m, args)

  if (!targetId) {
    return m.reply(
      `🕵️ *El Espía*\n\n` +
      `Menciona a alguien para espiar su estado.\n\n` +
      `💡 Uso: *espia @usuario*\n` +
      `💎 Costo: *500 diamantes*\n\n` +
      `📋 Info que revela:\n` +
      `• HP actual • Bounty • Si está capturado\n• Si el cazador está cerca`
    )
  }

  if (targetId === id) return m.reply('❌ No puedes espiarte a ti mismo.')

  const result = callSpy(id, targetId)
  return m.reply(result.error || result.message, null, { mentions: [targetId] })
}

handler.help = ['espia']
handler.tags = ['rpg']
handler.command = ['espia', 'spy', 'espiar']
handler.group = true

export default handler
