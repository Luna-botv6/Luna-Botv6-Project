import { getPlayerState, removeMoney, addItem, hasItem } from '../lib/stats.js'

const ITEMS = {
  totem: {
    emoji: '🧿', nombre: 'Tótem de Preservación',
    desc: 'Al morir, pierdes solo 25% EXP y 💎 en vez del 50%. Un solo uso.',
    cost: 5000, costExp: 0, max: 3
  },
  pocion_menor: {
    emoji: '🧪', nombre: 'Poción Menor',
    desc: '+25 HP al usarla.',
    cost: 200, costExp: 0, max: 10
  },
  pocion_media: {
    emoji: '⚗️', nombre: 'Poción Media',
    desc: '+50 HP al usarla.',
    cost: 450, costExp: 0, max: 10
  },
  pocion_mayor: {
    emoji: '🍶', nombre: 'Poción Mayor',
    desc: '+100 HP al usarla (full).',
    cost: 900, costExp: 0, max: 5
  },
  carne_asada: {
    emoji: '🍖', nombre: 'Carne Asada',
    desc: '+15 HP y +5% éxito en caza por 30 min.',
    cost: 150, costExp: 0, max: 10
  },
  elixir_bosque: {
    emoji: '🌿', nombre: 'Elixir del Bosque',
    desc: '+20 HP y reduce daño recibido 10% por 30 min.',
    cost: 300, costExp: 0, max: 10
  },
  festin_real: {
    emoji: '🍱', nombre: 'Festín Real',
    desc: '+30 HP y +10% EXP ganada por 30 min.',
    cost: 600, costExp: 0, max: 5
  }
}

const CATEGORIAS = {
  supervivencia: ['totem'],
  pociones:      ['pocion_menor', 'pocion_media', 'pocion_mayor'],
  comidas:       ['carne_asada', 'elixir_bosque', 'festin_real']
}

const HELP_MSG =
  `🛒 *Tienda RPG*\n\n` +
  `📋 *Comandos:*\n` +
  `• *comprar tienda* — Ver todos los items\n` +
  `• *comprar tienda <categoria>* — supervivencia | pociones | comidas\n` +
  `• *comprar <item>* — Comprar un item\n` +
  `• *comprar inventario* — Ver tu inventario\n\n` +
  `💡 Para usar items: *usar <item>*`

function formatItem(key, item, inv = null) {
  const stock = inv ? ` (tienes: ${inv[key] || 0})` : ''
  return (
    `${item.emoji} *${item.nombre}*${stock}\n` +
    `   📝 ${item.desc}\n` +
    `   💎 ${item.cost}${item.costExp > 0 ? ` + ⭐ ${item.costExp} EXP` : ''}`
  )
}

const handler = async (m, { conn, args }) => {
  const userId = m.sender
  const cmd = args?.[0]?.toLowerCase() || ''

  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(HELP_MSG)

  if (cmd === 'tienda' || cmd === 'shop') {
    const cat = args?.[1]?.toLowerCase()
    const user = getPlayerState(userId)
    const inv = user.inventory || {}

    if (cat && CATEGORIAS[cat]) {
      const lines = CATEGORIAS[cat].map(k => formatItem(k, ITEMS[k], inv)).join('\n\n')
      return m.reply(
        `🛒 *${cat.charAt(0).toUpperCase() + cat.slice(1)}*\n\n${lines}\n\n` +
        `💎 Tu saldo: *${user.money || 0}*\n` +
        `💡 Comprar: *comprar <nombre_item>*`
      )
    }

    const sections = Object.entries(CATEGORIAS).map(([catName, keys]) => {
      const lines = keys.map(k => `  ${ITEMS[k].emoji} ${k} — ${ITEMS[k].cost}💎`).join('\n')
      return `*${catName.toUpperCase()}*\n${lines}`
    }).join('\n\n')

    return m.reply(
      `🛒 *Tienda RPG*\n\n${sections}\n\n` +
      `💎 Tu saldo: *${user.money || 0}*\n` +
      `💡 Ver detalle: *comprar tienda <categoria>*\n` +
      `💡 Comprar: *comprar <nombre_item>*`
    )
  }

  if (cmd === 'inventario' || cmd === 'inv') {
    const user = getPlayerState(userId)
    const inv = user.inventory || {}
    const lines = Object.entries(ITEMS).map(([key, item]) => {
      const qty = inv[key] || 0
      return `${item.emoji} ${item.nombre}: *${qty}*`
    }).join('\n')

    const MERCADER_ITEMS = {
      armadura_temporal: { emoji: '🥷', nombre: 'Armadura Temporal' },
      pocion_doble:      { emoji: '💉', nombre: 'Poción Doble' },
      amuleto_escape:    { emoji: '🪬', nombre: 'Amuleto de Escape' },
      mapa_tesoro:       { emoji: '🗺️', nombre: 'Mapa del Tesoro' },
      sello_inocencia:   { emoji: '📜', nombre: 'Sello de Inocencia' }
    }
    const mercaderLines = Object.entries(MERCADER_ITEMS)
      .filter(([key]) => (inv[key] || 0) > 0)
      .map(([key, item]) => `${item.emoji} ${item.nombre}: *${inv[key]}*`)
      .join('\n')

    return m.reply(
      `🎒 *Tu Inventario*\n\n${lines}` +
      (mercaderLines ? `\n\n🧙 *Items del Mercader:*\n${mercaderLines}` : '') +
      `\n\n💎 Diamantes: *${user.money || 0}*\n` +
      `💡 Usar item: *usar <nombre_item>*`
    )
  }

  const itemKey = cmd.replace(/-/g, '_')
  const itemDef = ITEMS[itemKey]

  if (!itemDef) {
    return m.reply(
      `❓ Item no encontrado: *${cmd}*\n\n` +
      `💡 Usa *comprar tienda* para ver los disponibles.`
    )
  }

  const user = getPlayerState(userId)
  const inv = user.inventory || {}
  const qty = inv[itemKey] || 0

  if (qty >= itemDef.max) {
    return m.reply(`❌ Ya tienes el máximo de *${itemDef.nombre}* (${itemDef.max} unidades).`)
  }

  const saldo = user.money || 0
  const exp = user.exp || 0

  if (saldo < itemDef.cost) {
    return m.reply(
      `❌ *Sin diamantes suficientes.*\n\n` +
      `${itemDef.emoji} ${itemDef.nombre}: *${itemDef.cost} 💎*\n` +
      `Tu saldo: *${saldo} 💎*\n` +
      `Te faltan: *${itemDef.cost - saldo} 💎*`
    )
  }

  if (itemDef.costExp > 0 && exp < itemDef.costExp) {
    return m.reply(
      `❌ *Sin EXP suficiente.*\n\n` +
      `${itemDef.emoji} ${itemDef.nombre}: *${itemDef.costExp} ⭐ EXP*\n` +
      `Tu EXP: *${exp}*\n` +
      `Te falta: *${itemDef.costExp - exp} EXP*`
    )
  }

  removeMoney(userId, itemDef.cost)
  addItem(userId, itemKey, 1)

  return m.reply(
    `${itemDef.emoji} *¡Comprado!*\n\n` +
    `Item: *${itemDef.nombre}*\n` +
    `💎 Pagaste: *${itemDef.cost}*\n` +
    `💰 Saldo restante: *${saldo - itemDef.cost}*\n` +
    `🎒 Tienes ahora: *${qty + 1}/${itemDef.max}*\n\n` +
    `💡 Usar: *usar ${itemKey}*`
  )
}

handler.help = ['comprar']
handler.tags = ['rpg']
handler.command = ['comprar', 'tiendarpb', 'shop']

export default handler
