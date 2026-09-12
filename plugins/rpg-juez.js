import { getNpcState, judgeAction } from '../lib/npcSystem.js'
import { getPlayerState } from '../lib/stats.js'

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.rpg_juez || {};
  const id  = m.sender
  const cmd = args?.[0]?.toLowerCase() || ''

  if (!cmd || cmd === 'ver') {
    const u    = getPlayerState(id)
    const npc  = getNpcState(id)
    const stars = u.bountyStars || 0
    const fine  = u.bountyFine || 0
    return m.reply(
      t.ver?.replace('{stars}', stars ? '⭐'.repeat(stars) : '—').replace('{fine}', fine).replace('{activo}', npc.judgeActive ? t.si || 'Sí ⚠️' : t.no || 'No').replace('{opciones}', npc.judgeActive
        ? (t.opciones_activo || `• *juez pagar* — Paga multa x3\n• *juez mision* — Misión 2h\n• *juez huir* — 50% escapar`)
        : (t.aparece || `💡 Aparece automáticamente con 4+ estrellas de bounty.`)) || (
      `⚖️ *El Juez*\n\n` +
      `🚨 Tu bounty: *${stars ? '⭐'.repeat(stars) : '—'}*\n` +
      `💎 Multa: *${fine}*\n` +
      `📋 Juez activo: *${npc.judgeActive ? 'Sí ⚠️' : 'No'}*\n\n` +
      (npc.judgeActive
        ? `• *juez pagar* — Paga multa x3\n• *juez mision* — Misión 2h\n• *juez huir* — 50% escapar`
        : `💡 Aparece automáticamente con 4+ estrellas de bounty.`)
      )
    )
  }

  if (['pagar', 'mision', 'huir'].includes(cmd)) {
    const result = judgeAction(id, cmd)
    return m.reply(result.error || result.message)
  }

  return m.reply(t.comandos || '💡 Comandos: *juez ver* | *juez pagar* | *juez mision* | *juez huir*')
}

handler.help = ['juez']
handler.tags = ['rpg']
handler.command = ['juez', 'judge']
handler.group = true

export default handler
