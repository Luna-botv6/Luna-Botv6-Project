import fs from 'fs'
import { getPlayerState, setPlayerState, removeItem, hasItem, addItem } from '../lib/stats.js'

const RECETAS = {
  pocion_media: {
    nombre: 'Poción Media',
    emoji: '⚗️',
    requiere: { pocion_menor: 2 },
    resultado: { pocion_media: 1 },
    desc: '2x Poción Menor → 1x Poción Media'
  },
  pocion_mayor: {
    nombre: 'Poción Mayor',
    emoji: '🍶',
    requiere: { pocion_media: 2 },
    resultado: { pocion_mayor: 1 },
    desc: '2x Poción Media → 1x Poción Mayor'
  },
  carne_asada: {
    nombre: 'Carne Asada',
    emoji: '🍖',
    requiere: { pez_sardina: 2 },
    resultado: { carne_asada: 1 },
    desc: '2x pez_sardina → 1x Carne Asada'
  },
  elixir_bosque: {
    nombre: 'Elixir del Bosque',
    emoji: '🌿',
    requiere: { pez_trucha: 2, pocion_menor: 1 },
    resultado: { elixir_bosque: 1 },
    desc: '2x pez_trucha + 1x Poción Menor → 1x Elixir del Bosque'
  },
  festin_real: {
    nombre: 'Festín Real',
    emoji: '🍱',
    requiere: { pez_salmon: 2, pocion_media: 1 },
    resultado: { festin_real: 1 },
    desc: '2x pez_salmon + 1x Poción Media → 1x Festín Real'
  }
}

const HELP_MSG =
  `⚗️ *Crafting/Alquimia*\n\n` +
  `📋 *Comandos:*\n` +
  `• *craft recetas* — Ver recetas disponibles\n` +
  `• *craft <receta>* — Craftear un item\n\n` +
  `Recetas: pocion_media, pocion_mayor, carne_asada, elixir_bosque, festin_real`

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_crafting || {}
  const userId = m.sender
  const u = getPlayerState(userId)
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''

  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(t.help || HELP_MSG)

  if (cmd === 'recetas' || cmd === 'recipes' || cmd === 'lista') {
    const lines = Object.entries(RECETAS).map(([key, r]) => {
      const req = Object.entries(r.requiere).map(([k, v]) => `${k} x${v}`).join(' + ')
      return `${r.emoji} *${r.nombre}* (${key})\n   📋 ${req}\n   💡 craft ${key}`
    }).join('\n\n')
    return m.reply(`${t.recetas_titulo || '⚗️ *Recetas de Crafting*'}\n\n${lines}`)
  }

  const receta = RECETAS[cmd]
  if (!receta) return m.reply(tpl(t.receta_desconocida || '❌ Receta desconocida: *{cmd}*\n💡 Usa *craft recetas* para ver las disponibles.', { cmd }))

  for (const [item, qty] of Object.entries(receta.requiere)) {
    if (!hasItem(userId, item, qty)) {
      return m.reply(tpl(t.falta_ingrediente || '❌ Te falta *{item} x{qty}*.\n💡 Revisa tu inventario.', { item, qty }))
    }
  }

  for (const [item, qty] of Object.entries(receta.requiere)) {
    removeItem(userId, item, qty)
  }
  for (const [item, qty] of Object.entries(receta.resultado)) {
    addItem(userId, item, qty)
  }

  return m.reply(tpl(t.exito || '⚗️ *¡Crafting exitoso!*\n\n{emoji} Creaste: *{nombre}*\n🎒 Añadido a tu inventario.\n💡 Usar: *usar {item}*', { emoji: receta.emoji, nombre: receta.nombre, item: Object.keys(receta.resultado)[0] }))
}

handler.help = ['craft', 'crafting', 'alquimia']
handler.tags = ['rpg', 'juegos']
handler.command = ['craft', 'crafting', 'alquimia', 'receta']
handler.group = true

export default handler
