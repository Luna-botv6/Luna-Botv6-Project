import { getPlayerState, setPlayerState, removeMoney, setArmor } from '../lib/stats.js'

const ENCANTAMIENTOS = {
  fuerza: { emoji: '⚔️', costo: 1000, efecto: 'def', valor: 3 },
  vida: { emoji: '❤️', costo: 1500, efecto: 'hp', valor: 10 },
  durabilidad: { emoji: '🛡️', costo: 800, efecto: 'dur', valor: 5 }
}

const ALIAS = {
  strength: 'fuerza', force: 'fuerza', fuerza: 'fuerza', forca: 'fuerza', 'сила': 'fuerza', 'قوة': 'fuerza',
  life: 'vida', vida: 'vida', vie: 'vida', 'жизнь': 'vida', 'حياة': 'vida',
  durability: 'durabilidad', durabilidad: 'durabilidad', durabilidade: 'durabilidad', durabilite: 'durabilidad', 'прочность': 'durabilidad', 'متانة': 'durabilidad'
}

const HELP_MSG =
  `🔮 *Encantamientos*\n\n` +
  `📋 *Comandos:*\n` +
  `• *encantar fuerza* — +3 DEF (1000💎)\n` +
  `• *encantar vida* — +10 HP max (1500💎)\n` +
  `• *encantar durabilidad* — +5 dur (800💎)\n\n` +
  `Requiere armadura equipada.`

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_encantamiento || {}
  const userId = m.sender
  const u = getPlayerState(userId)
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''
  const tipo = (args && args[1]) ? args[1].toLowerCase() : cmd

  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(t.help || HELP_MSG)

  const clave = ALIAS[tipo] || tipo
  const enc = ENCANTAMIENTOS[clave]
  if (!enc) return m.reply(`${t.tipo_invalido || '❌ Tipo inválido.'}\n🔮 ${t.tipos || 'Disponibles: fuerza, vida, durabilidad'}\n💡 *encantar <tipo>*`)

  const armor = u.armor || { type: 'ninguna' }
  if (!armor.type || armor.type === 'ninguna') return m.reply(t.sin_armadura || '❌ Necesitas una armadura equipada para encantar.')

  const saldo = u.money || 0
  if (saldo < enc.costo) return m.reply(tpl(t.sin_saldo || '❌ Necesitas {costo}💎.\nTu saldo: *{saldo}💎*', { costo: enc.costo, saldo }))

  removeMoney(userId, enc.costo)

  if (enc.efecto === 'def') {
    armor.defense = (armor.defense || 0) + enc.valor
  } else if (enc.efecto === 'hp') {
    u.maxHp = (u.maxHp || 100) + enc.valor
    u.hp = Math.min(u.maxHp, (u.hp || 0) + enc.valor)
  } else if (enc.efecto === 'dur') {
    armor.maxDurability = (armor.maxDurability || 0) + enc.valor
    armor.durability = (armor.durability || 0) + enc.valor
  }
  setArmor(userId, armor)
  setPlayerState(userId, u)

  return m.reply(tpl(t.aplicado || '🔮 *¡Encantamiento aplicado!*\n\n{emoji} *{nombre}*: {desc}\n🛡️ Armadura: {armadura}\n⚔️ DEF: *{def}*\n❤️ HP max: *{hp}*\n durability: *{dur}/{durmax}*\n💎 Pagaste: *{costo}*', {
    emoji: enc.emoji,
    nombre: t[`nombre_${clave}`] || clave,
    desc: t[`desc_${clave}`] || '',
    armadura: armor.type,
    def: armor.defense || 0,
    hp: u.maxHp || 100,
    dur: armor.durability || 0,
    durmax: armor.maxDurability || 0,
    costo: enc.costo
  }))
}

handler.help = ['encantar']
handler.tags = ['rpg']
handler.command = ['encantar', 'enchant', 'encantamiento']
handler.group = true

export default handler
