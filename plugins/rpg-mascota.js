import fs from 'fs'
import { getPlayerState, setPlayerState, addMoney, removeMoney, addBuff } from '../lib/stats.js'

const PET_TYPES = {
  lobo:     { emoji: '🐺', nombre: 'Lobo',     cost: 5000,  buff: 'hunt_bonus',      value: 0.05, desc: '+5% éxito en caza' },
  dragon:   { emoji: '🐉', nombre: 'Dragón',   cost: 15000, buff: 'exp_bonus',       value: 0.10, desc: '+10% EXP ganada' },
  fenix:    { emoji: '🔥', nombre: 'Fénix',    cost: 20000, buff: 'revive',          value: 0.30, desc: 'Revive con 30% HP al morir (1/día)' },
  gato:     { emoji: '🐱', nombre: 'Gato',     cost: 3000,  buff: 'exp_bonus',       value: 0.05, desc: '+5% EXP ganada' },
  unicornio:{ emoji: '🦄', nombre: 'Unicornio',cost: 25000, buff: 'hp_bonus',        value: 0.15, desc: '+15% HP máximo' }
}

const EXP_POR_NIVEL = 100

const HELP_MSG =
  `🐾 *Sistema de Mascotas*\n\n` +
  `📋 *Comandos:*\n` +
  `• *mascota tienda* — Ver mascotas disponibles\n` +
  `• *mascota comprar <tipo> [nombre]* — Comprar y nombrar\n` +
  `• *mascota ver* — Ver tu mascota\n` +
  `• *mascota alimentar* — Alimentar (+EXP, +hambre) costo 200💎\n` +
  `• *mascota entrenar* — Entrenar (+EXP) costo 500💎\n` +
  `• *mascota liberar* — Liberar mascota\n\n` +
  `🐾 *Tipos:* lobo • dragon • fenix • gato • unicornio`

function petBar(current, max) {
  if (!max) return '░░░░░'
  const filled = Math.round((current / max) * 5)
  return '█'.repeat(filled) + '░'.repeat(5 - filled)
}

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_mascota || {}
  const userId = m.sender
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''
  const u = getPlayerState(userId)

  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(t.help || HELP_MSG)

  // ─── TIENDA ───
  if (cmd === 'tienda' || cmd === 'shop' || cmd === 'lista') {
    const lines = Object.entries(PET_TYPES).map(([key, p]) =>
      `${p.emoji} *${p.nombre}* — ${p.cost}💎\n   📝 ${p.desc}`
    ).join('\n\n')
    return m.reply(`${t.tienda_titulo || '🐾 *Tienda de Mascotas*'}\n\n${lines}\n\n💡 Comprar: *mascota comprar <tipo> [nombre]*\n💎 Tu saldo: *${u.money || 0}*`)
  }

  // ─── COMPRAR ───
  if (cmd === 'comprar' || cmd === 'buy') {
    const tipo = args?.[1]?.toLowerCase()
    if (!tipo || !PET_TYPES[tipo]) {
      return m.reply(`❌ Tipo inválido.\n🐾 Disponibles: lobo, dragon, fenix, gato, unicornio\n💡 Usa *mascota tienda*`)
    }
    const petDef = PET_TYPES[tipo]
    const saldo = u.money || 0
    if (saldo < petDef.cost) {
      return m.reply(tpl(t.sin_diamantes || '❌ Sin diamantes suficientes.\n🐾 {nombre}: *{costo}💎*\nTe faltan: *{falta}💎*', { nombre: petDef.nombre, costo: petDef.cost, falta: petDef.cost - saldo }))
    }
    if (u.pet && u.pet.type !== 'ninguna') {
      return m.reply(tpl(t.ya_tiene || '❌ Ya tienes una mascota: *{nombre}*.\n💡 Usa *mascota liberar* primero.', { nombre: u.pet.name || u.pet.type }))
    }
    const nombre = args?.slice(2).join(' ') || petDef.nombre
    removeMoney(userId, petDef.cost)
    u.pet = { type: tipo, name: nombre, level: 1, exp: 0, hunger: 100 }
    setPlayerState(userId, u)
    addBuff(userId, petDef.buff, petDef.value, 24 * 60 * 60 * 1000)
    return m.reply(tpl(t.obtenida || '{emoji} *¡Mascota obtenida!*\n\n🐾 Nombre: *{nombre}*\n📊 Nivel: *1*\n✨ Buff: *{buff}*\n💎 Pagaste: *{costo}*\n💰 Saldo restante: *{saldo}*', { emoji: petDef.emoji, nombre, buff: petDef.desc, costo: petDef.cost, saldo: saldo - petDef.cost }))
  }

  // ─── VER ───
  if (cmd === 'ver' || cmd === 'info') {
    const pet = u.pet || { type: 'ninguna' }
    if (pet.type === 'ninguna') {
      return m.reply(t.sin_mascota || '❌ No tienes mascota.\n💡 Usa *mascota tienda* para ver opciones.')
    }
    const petDef = PET_TYPES[pet.type]
    const expNext = EXP_POR_NIVEL * pet.level
    const bar = petBar(pet.exp, expNext)
    return m.reply(tpl(t.ver || '{emoji} *Tu Mascota*\n\n🐾 Nombre: *{nombre}*\n📊 Nivel: *{nivel}*\n⭐ EXP: *{exp}/{expNext}* {barra}\n🍖 Hambre: *{hambre}/100*\n✨ Buff: *{buff}*\n💡 Alimentar: *mascota alimentar* (200💎)\n💡 Entrenar: *mascota entrenar* (500💎)', { emoji: petDef.emoji, nombre: pet.name, nivel: pet.level, exp: pet.exp, expNext, barra: bar, hambre: pet.hunger, buff: petDef.desc }))
  }

  // ─── ALIMENTAR ───
  if (cmd === 'alimentar' || cmd === 'feed') {
    const pet = u.pet || { type: 'ninguna' }
    if (pet.type === 'ninguna') return m.reply(t.sin_mascota || '❌ No tienes mascota.')
    const saldo = u.money || 0
    if (saldo < 200) return m.reply(tpl(t.sin_diamantes_alimentar || '❌ Necesitas 200💎 para alimentar.\nTu saldo: *{saldo}💎*', { saldo }))
    removeMoney(userId, 200)
    pet.hunger = Math.min(100, (pet.hunger || 0) + 30)
    pet.exp = (pet.exp || 0) + 20
    let levelUp = false
    const expNext = EXP_POR_NIVEL * pet.level
    if (pet.exp >= expNext) {
      pet.level += 1
      pet.exp -= expNext
      levelUp = true
      const petDef = PET_TYPES[pet.type]
      addBuff(userId, petDef.buff, petDef.value * (1 + (pet.level - 1) * 0.05), 24 * 60 * 60 * 1000)
    }
    u.pet = pet
    setPlayerState(userId, u)
    const petDef = PET_TYPES[pet.type]
    let msg = tpl(t.alimentar_ok || '🍖 *Alimentaste a {nombre}.*\n\n❤️ Hambre: *{hambre}/100*\n⭐ EXP: *+20* (total {exp}/{expNext})', { nombre: pet.name, hambre: pet.hunger, exp: pet.exp, expNext: EXP_POR_NIVEL * pet.level })
    if (levelUp) msg += tpl(t.levelup || '\n\n🎉 *¡{nombre} subió a nivel {nivel}!*\n✨ Buff mejorado: {buff}', { nombre: pet.name, nivel: pet.level, buff: petDef.desc })
    return m.reply(msg)
  }

  // ─── ENTRENAR ───
  if (cmd === 'entrenar' || cmd === 'train') {
    const pet = u.pet || { type: 'ninguna' }
    if (pet.type === 'ninguna') return m.reply(t.sin_mascota || '❌ No tienes mascota.')
    const saldo = u.money || 0
    if (saldo < 500) return m.reply(tpl(t.sin_diamantes_entrenar || '❌ Necesitas 500💎 para entrenar.\nTu saldo: *{saldo}💎*', { saldo }))
    removeMoney(userId, 500)
    pet.exp = (pet.exp || 0) + 50
    pet.hunger = Math.max(0, (pet.hunger || 0) - 10)
    let levelUp = false
    const expNext = EXP_POR_NIVEL * pet.level
    if (pet.exp >= expNext) {
      pet.level += 1
      pet.exp -= expNext
      levelUp = true
      const petDef = PET_TYPES[pet.type]
      addBuff(userId, petDef.buff, petDef.value * (1 + (pet.level - 1) * 0.05), 24 * 60 * 60 * 1000)
    }
    u.pet = pet
    setPlayerState(userId, u)
    const petDef = PET_TYPES[pet.type]
    let msg = tpl(t.entrenar_ok || '🏋️ *Entrenaste a {nombre}.*\n\n⭐ EXP: *+50* (total {exp}/{expNext})\n🍖 Hambre: *{hambre}/100*', { nombre: pet.name, exp: pet.exp, expNext: EXP_POR_NIVEL * pet.level, hambre: pet.hunger })
    if (levelUp) msg += tpl(t.levelup || '\n\n🎉 *¡{nombre} subió a nivel {nivel}!*\n✨ Buff mejorado: {buff}', { nombre: pet.name, nivel: pet.level, buff: petDef.desc })
    return m.reply(msg)
  }

  // ─── LIBERAR ───
  if (cmd === 'liberar' || cmd === 'release') {
    const pet = u.pet || { type: 'ninguna' }
    if (pet.type === 'ninguna') return m.reply(t.sin_mascota || '❌ No tienes mascota.')
    const nombre = pet.name
    u.pet = { type: 'ninguna', name: '', level: 0, exp: 0, hunger: 100 }
    setPlayerState(userId, u)
    return m.reply(tpl(t.liberar_ok || '🐾 *Liberaste a {nombre}.*\nAdiós, compañero.', { nombre }))
  }

  return m.reply(t.help || HELP_MSG)
}

handler.help = ['mascota']
handler.tags = ['rpg']
handler.command = ['mascota', 'pet', 'mascotas']
handler.group = true

export default handler
