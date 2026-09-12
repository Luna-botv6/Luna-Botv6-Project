import { resolveMention } from '../lib/mentionHelper.js'
import { getMerchantStatus, buyFromMerchant } from '../lib/npcSystem.js'

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.rpg_mercader || {};
  const id  = m.sender
  const cmd = args?.[0]?.toLowerCase() || ''

  if (!cmd || cmd === 'ver' || cmd === 'status') {
    const status = getMerchantStatus(id)
    if (!status) {
      return m.reply(
        t.sin_mercader || (
        `🧙 *El Mercader Errante*\n\n` +
        `No hay ningún mercader disponible ahora.\n` +
        `Aparece aleatoriamente mientras juegas.\n\n` +
        `💡 Sigue usando comandos y quizás aparezca.`)
      )
    }
    const remaining = Math.ceil(status.remaining / 1000)
    const lines = status.offer.map((item, i) =>
      `${i + 1}. ${item.emoji} *${item.nombre}* — ${item.cost}💎`
    ).join('\n')
    return m.reply(
      (t.con_mercader?.replace('{name}', status.name).replace('{lines}', lines).replace('{remaining}', remaining) ||
      `🧙 *${status.name} está aquí!*\n\n` +
      `${lines}\n\n` +
      `⏱️ Se va en *${remaining}s*\n` +
      `💡 Comprar: *mercader comprar <1|2|3>*`)
    )
  }

  if (cmd === 'comprar' || cmd === 'buy') {
    const index = args?.[1]
    if (!index) return m.reply(t.uso_comprar || '💡 Uso: *mercader comprar <1|2|3>*')
    const result = buyFromMerchant(id, index)
    return m.reply(result.error || result.message)
  }

  return m.reply(t.comandos || '💡 Comandos: *mercader ver* | *mercader comprar <1|2|3>*')
}

handler.help = ['mercader']
handler.tags = ['rpg']
handler.command = ['mercader', 'merchant']
handler.group = true

export default handler
