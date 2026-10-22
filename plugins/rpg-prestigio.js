import { getPlayerState, setPlayerState, addMoney, getRoleByLevel } from '../lib/stats.js'

const HELP_MSG =
  `✨ *Prestigio*\n\n` +
  `📋 *Comandos:*\n` +
  `• *prestigio* — Ver tu nivel de prestigio\n` +
  `• *prestigio reset* — Resetear nivel a 0 (requiere nivel 100+)\n\n` +
  `Cada prestigio da +5% EXP permanente.\n` +
  `Requisito: nivel 100 o superior.`

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_prestigio || {}
  const userId = m.sender
  const u = getPlayerState(userId)
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''
  const estado = tpl(t.estado || '\n\n✨ Tu prestigio: *{prestigio}* (+{bono}% EXP)', { prestigio: u.prestige || 0, bono: (u.prestige || 0) * 5 })

  if (!cmd || cmd === 'help' || cmd === 'ayuda') {
    return m.reply(`${t.help || HELP_MSG}${estado}`)
  }

  if (cmd === 'reset') {
    if ((u.level || 0) < 100) return m.reply(tpl(t.nivel_bajo || '❌ Necesitas nivel 100 o superior para prestigiar.\nTu nivel: *{nivel}*', { nivel: u.level || 0 }))
    const prestigioActual = u.prestige || 0
    u.prestige = prestigioActual + 1
    u.level = 0
    u.exp = 0
    u.role = getRoleByLevel(0)
    setPlayerState(userId, u)
    addMoney(userId, 5000 * (prestigioActual + 1))
    return m.reply(tpl(t.exito || '✨ *¡Prestigio {prestigio} alcanzado!*\n\n🔄 Nivel reseteado a 0.\n✨ Bono permanente: *+{bono}% EXP*\n💎 Recompensa: *{premio} diamantes*\n\n💡 Sigue subiendo de nivel para más prestigio.', { prestigio: u.prestige, bono: u.prestige * 5, premio: 5000 * u.prestige }))
  }

  return m.reply(`${t.help || HELP_MSG}${estado}`)
}

handler.help = ['prestigio']
handler.tags = ['rpg']
handler.command = ['prestigio', 'prestige']
handler.group = true

export default handler
