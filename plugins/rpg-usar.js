import { getPlayerState, setPlayerState, addHp, removeItem, hasItem, addBuff, getActiveBuff, cleanExpiredBuffs } from '../lib/stats.js'

const ITEMS_USABLES = {
  armadura_temporal: {
    emoji: '🥷', nombre: 'Armadura Temporal',
    uso: 'activo',
    descripcion: 'DEF +10 buff 1 hora. Se activa automáticamente al comprarlo.'
  },
  pocion_doble: {
    emoji: '💉', nombre: 'Poción Doble',
    uso: 'activo', hpGain: 80,
    descripcion: '+80 HP instantáneo.'
  },
  amuleto_escape: {
    emoji: '🪬', nombre: 'Amuleto de Escape',
    uso: 'pasivo',
    descripcion: 'Se activa automáticamente la próxima vez que el cazador te atrape. Un uso.'
  },
  mapa_tesoro: {
    emoji: '🗺️', nombre: 'Mapa del Tesoro',
    uso: 'pasivo',
    descripcion: 'Se usa automáticamente al comprarlo. No se puede usar manualmente.'
  },
  sello_inocencia: {
    emoji: '📜', nombre: 'Sello de Inocencia',
    uso: 'pasivo',
    descripcion: 'Se aplica automáticamente al comprarlo. No se puede usar manualmente.'
  },
  totem: {
    emoji: '🧿', nombre: 'Tótem de Preservación',
    uso: 'pasivo',
    descripcion: 'Se activa automáticamente al morir. No necesitas usarlo manualmente.'
  },
  pocion_menor: {
    emoji: '🧪', nombre: 'Poción Menor',
    uso: 'activo', hpGain: 25,
    descripcion: 'Restaura 25 HP al instante.'
  },
  pocion_media: {
    emoji: '⚗️', nombre: 'Poción Media',
    uso: 'activo', hpGain: 50,
    descripcion: 'Restaura 50 HP al instante.'
  },
  pocion_mayor: {
    emoji: '🍶', nombre: 'Poción Mayor',
    uso: 'activo', hpGain: 100, fullHeal: true,
    descripcion: 'Restaura todo tu HP al instante.'
  },
  carne_asada: {
    emoji: '🍖', nombre: 'Carne Asada',
    uso: 'activo', hpGain: 15,
    buff: { type: 'hunt_bonus', value: 0.05, durationMs: 30 * 60 * 1000 },
    descripcion: '+15 HP y +5% éxito en caza por 30 min.'
  },
  elixir_bosque: {
    emoji: '🌿', nombre: 'Elixir del Bosque',
    uso: 'activo', hpGain: 20,
    buff: { type: 'damage_reduction', value: 0.10, durationMs: 30 * 60 * 1000 },
    descripcion: '+20 HP y -10% daño recibido por 30 min.'
  },
  festin_real: {
    emoji: '🍱', nombre: 'Festín Real',
    uso: 'activo', hpGain: 30,
    buff: { type: 'exp_bonus', value: 0.10, durationMs: 30 * 60 * 1000 },
    descripcion: '+30 HP y +10% EXP ganada por 30 min.'
  }
}

const HELP_MSG =
  `💊 *Usar Item*\n\n` +
  `📋 *Uso:* usar <nombre_item>\n\n` +
  `🧪 *Items activos:*\n` +
  `• pocion_menor — +25 HP\n` +
  `• pocion_media — +50 HP\n` +
  `• pocion_mayor — +100 HP (full)\n` +
  `• carne_asada — +15 HP, +5% caza 30min\n` +
  `• elixir_bosque — +20 HP, -10% daño 30min\n` +
  `• festin_real — +30 HP, +10% EXP 30min\n\n` +
  `🧿 *totem* — Se activa solo al morir, no se usa manualmente.\n\n` +
  `💡 Ver inventario: *comprar inventario*`

function msToTime(ms) {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const handler = async (m, { conn, args }) => {
  const userId = m.sender
  const itemKey = args?.[0]?.toLowerCase().replace(/-/g, '_') || ''

  if (!itemKey || itemKey === 'help' || itemKey === 'ayuda') return m.reply(HELP_MSG)

  const itemDef = ITEMS_USABLES[itemKey]
  if (!itemDef) {
    return m.reply(
      `❓ Item desconocido: *${itemKey}*\n\n` +
      `💡 Usa *usar help* para ver los items disponibles.`
    )
  }

  if (itemDef.uso === 'pasivo') {
    const user = getPlayerState(userId)
    const qty = user.inventory?.[itemKey] || 0
    const pasiveDescriptions = {
      totem:          'Se activa automáticamente cuando mueres.',
      amuleto_escape: 'Se activa automáticamente la próxima vez que el cazador te atrape.',
      mapa_tesoro:    'Se aplica al comprarlo en el mercader.',
      sello_inocencia:'Se aplica al comprarlo en el mercader.'
    }
    return m.reply(
      `${itemDef.emoji} *${itemDef.nombre}*\n\n` +
      `Este item es *pasivo* — ${pasiveDescriptions[itemKey] || 'se activa solo.'}\n` +
      `🎒 Tienes: *${qty}*\n\n` +
      `💡 Se obtiene en: *mercader*`
    )
  }

  if (!hasItem(userId, itemKey, 1)) {
    return m.reply(
      `❌ No tienes *${itemDef.nombre}* en tu inventario.\n\n` +
      `💡 Comprar: *comprar ${itemKey}*`
    )
  }

  const user = getPlayerState(userId)
  const hpAntes = user.hp || 0
  const maxHp = user.maxHp || 100

  if (hpAntes >= maxHp && !itemDef.buff) {
    return m.reply(
      `❤️ Ya tienes el HP al máximo (*${hpAntes}/${maxHp}*).\n` +
      `No tiene sentido usar *${itemDef.nombre}* ahora.`
    )
  }

  cleanExpiredBuffs(userId)

  if (itemDef.buff) {
    const buffActivo = getActiveBuff(userId, itemDef.buff.type)
    if (buffActivo) {
      const remaining = buffActivo.expiresAt - Date.now()
      return m.reply(
        `⏳ Ya tienes el efecto *${itemDef.nombre}* activo.\n` +
        `Tiempo restante: *${msToTime(remaining)}*\n\n` +
        `Espera a que expire antes de usar otro.`
      )
    }
  }

  removeItem(userId, itemKey, 1)

  let hpGanado = 0
  if (itemDef.hpGain) {
    if (itemDef.fullHeal) {
      const u = getPlayerState(userId)
      hpGanado = maxHp - hpAntes
      u.hp = maxHp
      setPlayerState(userId, u)
    } else {
      hpGanado = Math.min(itemDef.hpGain, maxHp - hpAntes)
      addHp(userId, itemDef.hpGain)
    }
  }

  if (itemDef.buff) {
    addBuff(userId, itemDef.buff.type, itemDef.buff.value, itemDef.buff.durationMs)
  }

  if (itemKey === 'armadura_temporal') {
    const { addBuff: _addBuff } = await import('../lib/stats.js')
    addBuff(userId, 'armor_temp', 10, 60 * 60 * 1000)
  }

  const userPost = getPlayerState(userId)
  const inv = userPost.inventory || {}
  const qtyRestante = inv[itemKey] || 0

  let msg =
    `${itemDef.emoji} *¡${itemDef.nombre} usada!*\n\n` +
    (hpGanado > 0 ? `❤️ HP: *${hpAntes}* → *${userPost.hp}/${maxHp}* (+${hpGanado})\n` : `❤️ HP: *${userPost.hp}/${maxHp}*\n`)

  if (itemDef.buff) {
    const buffLabel = {
      hunt_bonus:       '🎯 +5% éxito en caza',
      damage_reduction: '🛡️ -10% daño recibido',
      exp_bonus:        '⭐ +10% EXP ganada'
    }[itemDef.buff.type] || 'Buff activo'
    msg += `✨ Efecto: *${buffLabel}* por 30 min\n`
  }

  msg += `🎒 Quedan: *${qtyRestante}* en inventario`

  return m.reply(msg)
}

handler.help = ['usar']
handler.tags = ['rpg']
handler.command = ['usar', 'use', 'useitem', 'inventario']

export default handler
