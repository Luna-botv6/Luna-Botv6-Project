// lib/funcion/aiRewards.js
//
// Capa de seguridad entre "la IA quiere darle algo a un usuario" y el sistema
// de economía real (lib/stats.js). Nada de lo que mande el servidor de IA
// (result.type === 'reward', o lo que sea a futuro) se ejecuta directo:
// todo pasa por acá, que valida tipo, clampea monto, aplica cooldown y
// tope diario por usuario.
//
// Ubicación sugerida: lib/funcion/aiRewards.js (mismo nivel que pluginHelper.js,
// para poder importar '../stats.js' igual que hace pluginHelper.js).

import { addMoney, addExp, addLunaCoins, addItem, getMoney, getExp, removeMoney, removeExp } from '../stats.js'

// --- Whitelist de recompensas permitidas ---------------------------------
// Cada tipo define: monto máximo por otorgamiento y cooldown propio.
// Si la IA (o el server) pide un tipo que no está acá, se rechaza.
const REWARD_TYPES = {
  money: {
    max: 200,
    cooldownMs: 6 * 60 * 60 * 1000, // 6 horas
    apply: (id, amount) => addMoney(id, amount),
  },
  exp: {
    max: 100,
    cooldownMs: 60 * 60 * 1000, // 1 hora
    apply: (id, amount) => addExp(id, amount),
  },
  lunaCoins: {
    max: 20,
    cooldownMs: 12 * 60 * 60 * 1000, // 12 horas
    apply: (id, amount) => addLunaCoins(id, amount),
  },
  item: {
    max: 3,
    cooldownMs: 6 * 60 * 60 * 1000, // 6 horas
    apply: (id, amount, meta) => {
      if (!meta?.item) return
      addItem(id, meta.item, amount)
    },
  },
}

// Tope global de recompensas (de cualquier tipo) por usuario por día.
// Evita que alguien encuentre la forma de "pedirle regalos" a la IA en loop
// usando distintos tipos para esquivar el cooldown individual.
const DAILY_CAP_PER_USER = 3

const lastRewardByType = new Map() // `${userId}:${type}` -> timestamp
const dailyCountByUser = new Map() // userId -> { count, day }

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function underDailyCap(userId) {
  const today = todayKey()
  const entry = dailyCountByUser.get(userId)
  if (!entry || entry.day !== today) return true
  return entry.count < DAILY_CAP_PER_USER
}

function bumpDailyCount(userId) {
  const today = todayKey()
  const entry = dailyCountByUser.get(userId) || { count: 0, day: today }
  if (entry.day !== today) {
    entry.count = 0
    entry.day = today
  }
  entry.count += 1
  dailyCountByUser.set(userId, entry)
}

/**
 * Intenta otorgar una recompensa generada por la IA a un usuario.
 * Nunca confía ciegamente en el tipo/monto que venga del servidor:
 * valida contra whitelist, clampea el monto, aplica cooldown por tipo
 * y respeta un tope diario por usuario.
 *
 * @param {string} userId   - JID / id normalizado del usuario
 * @param {string} type     - 'money' | 'exp' | 'lunaCoins' | 'item'
 * @param {number} amount   - monto pedido (se clampea al máximo permitido)
 * @param {object} [meta]   - datos extra, ej. { item: 'pocion_menor' } para type 'item'
 * @returns {{ ok: boolean, type?: string, amount?: number, reason?: string }}
 */
export function grantAIReward(userId, type, amount, meta = {}) {
  if (!userId) return { ok: false, reason: 'sin userId' }

  const rule = REWARD_TYPES[type]
  if (!rule) return { ok: false, reason: `tipo de recompensa no permitido: ${type}` }

  if (!underDailyCap(userId)) {
    return { ok: false, reason: 'tope diario de recompensas alcanzado' }
  }

  const key = `${userId}:${type}`
  const last = lastRewardByType.get(key) || 0
  if (Date.now() - last < rule.cooldownMs) {
    return { ok: false, reason: 'en cooldown' }
  }

  const safeAmount = Math.min(Math.max(0, Number(amount) || 0), rule.max)
  if (safeAmount <= 0) return { ok: false, reason: 'monto inválido' }

  try {
    rule.apply(userId, safeAmount, meta)
  } catch (e) {
    console.error('[AI-REWARD] ❌ Error aplicando recompensa:', e.message)
    return { ok: false, reason: 'error interno' }
  }

  lastRewardByType.set(key, Date.now())
  bumpDailyCount(userId)

  console.log(`[AI-REWARD] 🎁 ${userId} recibió ${safeAmount} (${type})${meta?.item ? ' item=' + meta.item : ''}`)

  return { ok: true, type, amount: safeAmount }
}

/**
 * Útil para debug/soporte: cuántas recompensas le quedan hoy a un usuario.
 */
export function remainingRewardsToday(userId) {
  const today = todayKey()
  const entry = dailyCountByUser.get(userId)
  if (!entry || entry.day !== today) return DAILY_CAP_PER_USER
  return Math.max(0, DAILY_CAP_PER_USER - entry.count)
}

// --- Penalizaciones (quitar % de exp/dinero, ej: usuario grosero/insistente) ---

const PENALTY_TYPES = {
  money: { maxPercent: 15, cooldownMs: 6 * 60 * 60 * 1000, get: getMoney, remove: removeMoney },
  exp:   { maxPercent: 15, cooldownMs: 60 * 60 * 1000,      get: getExp,   remove: removeExp },
}

const lastPenaltyByType = new Map() // `${userId}:${type}` -> timestamp

/**
 * Aplica una penalización porcentual (nunca un monto fijo crudo) sobre lo
 * que el usuario tiene actualmente. Igual que grantAIReward: valida
 * whitelist, clampea el porcentaje máximo y respeta cooldown.
 *
 * @param {string} userId
 * @param {string} type       - 'money' | 'exp'
 * @param {number} percentage - % a quitar, se clampea al máximo permitido (ej 15)
 */
export function applyAIPenalty(userId, type, percentage = 15) {
  if (!userId) return { ok: false, reason: 'sin userId' }

  const rule = PENALTY_TYPES[type]
  if (!rule) return { ok: false, reason: `tipo de penalización no permitido: ${type}` }

  const key = `${userId}:${type}`
  const last = lastPenaltyByType.get(key) || 0
  if (Date.now() - last < rule.cooldownMs) {
    return { ok: false, reason: 'en cooldown' }
  }

  const safePercent = Math.min(Math.max(0, Number(percentage) || 0), rule.maxPercent)
  const current = rule.get(userId) || 0
  const amount = Math.floor(current * (safePercent / 100))
  if (amount <= 0) return { ok: false, reason: 'no tiene nada para quitar' }

  try {
    rule.remove(userId, amount)
  } catch (e) {
    console.error('[AI-PENALTY] ❌ Error aplicando penalización:', e.message)
    return { ok: false, reason: 'error interno' }
  }

  lastPenaltyByType.set(key, Date.now())
  console.log(`[AI-PENALTY] ⚠️ ${userId} perdió ${amount} de ${type} (${safePercent}%)`)

  return { ok: true, type, amount, percent: safePercent }
}
