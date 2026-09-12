import { getNpcState, undeadAction } from '../lib/npcSystem.js'
import { getPlayerState } from '../lib/stats.js'

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.rpg_muerto || {};
  const id  = m.sender
  const cmd = args?.[0]?.toLowerCase() || ''
  const npc = getNpcState(id)

  if (!cmd || cmd === 'ver') {
    const u = getPlayerState(id)
    return m.reply(
      t.ver?.replace('{hp}', u.hp || 0).replace('{maxHp}', u.maxHp || 100).replace('{presente}', npc.undeadActive ? t.si || 'Sí ⚠️' : t.no || 'No').replace('{opciones}', npc.undeadActive ? (t.opciones_activo || `• *muerto aceptar* — Curación total, -50% EXP 1h\n• *muerto rechazar* — Ignorarlo`) : (t.aparece || `💡 Aparece cuando tu HP baja del 30%.`)) || (
      `🧟 *El Muerto Viviente*\n\n` +
      `❤️ Tu HP: *${u.hp || 0}/${u.maxHp || 100}*\n` +
      `📋 Presente: *${npc.undeadActive ? 'Sí ⚠️' : 'No'}*\n\n` +
      (npc.undeadActive
        ? `• *muerto aceptar* — Curación total, -50% EXP 1h\n• *muerto rechazar* — Ignorarlo`
        : `💡 Aparece cuando tu HP baja del 30%.`)
      )
    )
  }

  if (cmd === 'aceptar' || cmd === 'rechazar') {
    const result = undeadAction(id, cmd)
    return m.reply(result.error || result.message)
  }

  return m.reply(t.comandos || '💡 Comandos: *muerto ver* | *muerto aceptar* | *muerto rechazar*')
}

handler.help = ['muerto']
handler.tags = ['rpg']
handler.command = ['muerto', 'undead', 'pacto']
handler.group = true

export default handler
