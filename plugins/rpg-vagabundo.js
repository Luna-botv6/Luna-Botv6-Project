import { getNpcState, vagrantAction } from '../lib/npcSystem.js'
import { getPlayerState } from '../lib/stats.js'

const handler = async (m, { conn, args }) => {
  const id  = m.sender
  const cmd = args?.[0]?.toLowerCase() || ''
  const npc = getNpcState(id)

  if (!cmd || cmd === 'ver') {
    const u = getPlayerState(id)
    if (!npc.vagrantActive) {
      return m.reply(
        `🧓 *El Vagabundo*\n\n` +
        `No hay ningún vagabundo aquí ahora.\n` +
        `Aparece aleatoriamente mientras juegas.\n\n` +
        `⚠️ Si lo ignoras 3 veces seguidas te maldice:\n` +
        `   -20% EXP ganada por 30 minutos.\n\n` +
        `🎲 Si das lo que pide: 50% recibes el doble\n` +
        `💨 50% se va con lo tuyo\n\n` +
        `🔢 Ignores acumulados: *${npc.vagrantIgnores || 0}/3*`
      )
    }

    const req      = npc.vagrantRequest || {}
    const expires  = npc.vagrantExpires || 0
    const remaining = Math.max(0, Math.ceil((expires - Date.now()) / 1000))

    return m.reply(
      `🧓 *¡${npc.vagrantName} está aquí!*\n\n` +
      `Pide: ${req.emoji || '⭐'} *${req.amount} ${req.label}*\n` +
      `⏱️ Se va en *${remaining}s*\n\n` +
      `• *vagabundo dar* — Ayudarlo\n` +
      `• *vagabundo ignorar* — Ignorarlo`
    )
  }

  if (cmd === 'dar' || cmd === 'give' || cmd === 'ayudar' ||
      cmd === 'ignorar' || cmd === 'ignore') {
    const result = await vagrantAction(id, cmd)
    return m.reply(result.error || result.message)
  }

  return m.reply('💡 Comandos: *vagabundo ver* | *vagabundo dar* | *vagabundo ignorar*')
}

handler.help = ['vagabundo']
handler.tags = ['rpg']
handler.command = ['vagabundo', 'vagrant', 'mendigo']
handler.group = true

export default handler
