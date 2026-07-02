import {
  getUserStats, setUserStats, getPlayerState, setPlayerState,
  trackGain, setHunterActive, capturedByHunter, releaseFromHunter,
  isHunterActive, isCapturedByHunter, addExp, addMoney,
  removeHp, breakArmor, applyDeathPenalty, increaseBounty
} from './stats.js'

const WINDOW_MS         = 30 * 60 * 1000
const THRESHOLD_EXP     = 8000
const THRESHOLD_MONEY   = 5000
const BASE_TRIGGER_PROB = 0.25
const MAX_REAPPEAR_PROB = 0.85
const REAPPEAR_BONUS    = 0.15
const FIGHT_WIN_EXP     = 20000
const FIGHT_WIN_MONEY   = 20000
const SAVIOR_CHANCE     = 0.25
const SAVIOR_MIN_WAIT   = 3 * 60 * 1000

const HUNTER_LEVELS = {
  1: { name: 'Rastreador',   escapeChance: 0.40, fightChance: 0.05, damage: 50, allies: 0, emoji: '🗡️' },
  2: { name: 'Cazador',      escapeChance: 0.28, fightChance: 0.03, damage: 65, allies: 1, emoji: '⚔️' },
  3: { name: 'Verdugo',      escapeChance: 0.15, fightChance: 0.02, damage: 80, allies: 2, emoji: '💀' }
}

const HUNTER_NAMES = {
  1: ['Kael el Rastreador', 'Sombra Gris', 'Mortis', 'Zaren'],
  2: ['El Verdugo', 'Sombra Roja', 'Kael el Implacable', 'Drak'],
  3: ['La Tríada Oscura', 'Mortis y sus Aliados', 'El Consejo del Cazador']
}

const SAVIOR_NAMES = [
  'Lyra la Errante', 'El Desconocido', 'Vex el Rebelde',
  'Aria Sombría', 'Thane el Fugitivo'
]

const APPEARANCES = [
  '👁️ *Unos pasos pesados resuenan detrás de ti...*',
  '🌑 *Una silueta oscura bloquea tu camino...*',
  '⚔️ *El suelo tiembla. Alguien te encontró.*',
  '🩸 *Un silbido corta el aire.*',
  '🔱 *Sientes que alguien lleva tiempo siguiéndote.*'
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getHunterLevel(escapeAttempts) {
  if (escapeAttempts >= 6) return 3
  if (escapeAttempts >= 3) return 2
  return 1
}

function calcTriggerProbability(h) {
  const { gainExp, gainMoney, windowStart, escapeAttempts = 0 } = h
  const elapsed = Date.now() - (windowStart || 0)
  if (elapsed > WINDOW_MS) return 0

  const expRatio   = gainExp / THRESHOLD_EXP
  const moneyRatio = gainMoney / THRESHOLD_MONEY
  const ratio      = Math.max(expRatio, moneyRatio)

  if (ratio < 0.5) return 0

  const base = BASE_TRIGGER_PROB * Math.min(ratio, 1)
  const escapePenalty = escapeAttempts * REAPPEAR_BONUS
  return Math.min(base + escapePenalty, MAX_REAPPEAR_PROB)
}

export function checkHunterTrigger(id, expGained = 0, moneyGained = 0) {
  if (isCapturedByHunter(id)) return null
  if (isHunterActive(id)) return null

  trackGain(id, expGained, moneyGained)
  const u = getUserStats(id)
  if (!u) return null

  const prob = calcTriggerProbability(u.hunterTracking)
  if (prob <= 0) return null
  if (Math.random() > prob) return null

  setHunterActive(id, true)

  const level    = getHunterLevel(u.hunterTracking.escapeAttempts || 0)
  const hunterDef = HUNTER_LEVELS[level]
  const name     = pick(HUNTER_NAMES[level])
  const appear   = pick(APPEARANCES)
  const acum     = u.hunterTracking.gainExp >= THRESHOLD_EXP
    ? `*${u.hunterTracking.gainExp.toLocaleString()} EXP*`
    : `*${u.hunterTracking.gainMoney.toLocaleString()} 💎*`

  const aliasLine = hunterDef.allies > 0
    ? `\n⚠️ Viene acompañado de *${hunterDef.allies} aliado(s)*. Escapar será más difícil.`
    : ''

  return {
    hunterName: name,
    level,
    message:
      `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
      `${appear}\n` +
      `${hunterDef.emoji} *${name}* [Nivel ${level}] detectó tu actividad (${acum} acumulados).${aliasLine}\n\n` +
      `🏃 Escapar: *${Math.round(hunterDef.escapeChance * 100)}%* • ⚔️ Ganarle: *${Math.round(hunterDef.fightChance * 100)}%*\n\n` +
      `• *cazador correr* — Intentar huir\n` +
      `• *cazador pelear* — Enfrentarlo\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  }
}

export function runFromHunter(id) {
  if (!isHunterActive(id)) return { success: false, noHunter: true }

  const u = getUserStats(id)
  if (!u) return { success: false }

  const level     = getHunterLevel(u.hunterTracking?.escapeAttempts || 0)
  const hunterDef = HUNTER_LEVELS[level]

  if (Math.random() < hunterDef.escapeChance) {
    u.hunterTracking.hunterActive    = false
    u.hunterTracking.escapedAt       = Date.now()
    u.hunterTracking.escapeAttempts  = (u.hunterTracking.escapeAttempts || 0) + 1
    u.hunterTracking.gainExp         = Math.floor(u.hunterTracking.gainExp * 0.5)
    u.hunterTracking.gainMoney       = Math.floor(u.hunterTracking.gainMoney * 0.5)
    setUserStats(id, u)

    const attempts  = u.hunterTracking.escapeAttempts
    const nextLevel = getHunterLevel(attempts)
    const nextDef   = HUNTER_LEVELS[nextLevel]
    const nextProb  = Math.round(Math.min(BASE_TRIGGER_PROB + attempts * REAPPEAR_BONUS, MAX_REAPPEAR_PROB) * 100)
    const levelWarn = nextLevel > level
      ? `\n⬆️ El cazador subió a *Nivel ${nextLevel} — ${nextDef.name}*. Será más difícil escapar.`
      : ''

    return {
      success: true,
      escaped: true,
      message:
        `🏃 *¡Lograste escapar!*\n` +
        `⚠️ El cazador sigue buscándote.\n` +
        `📈 Probabilidad de reaparición: *${nextProb}%*${levelWarn}\n` +
        `💡 Cada escape lo hace más peligroso.`
    }
  }

  capturedByHunter(id)
  const penalty = applyDeathPenalty(id)
  removeHp(id, hunterDef.damage)

  return {
    success: false,
    captured: true,
    message:
      `⛓️ *¡Te atraparon!*\n` +
      `*${pick(HUNTER_NAMES[level])}* fue demasiado rápido.\n\n` +
      (penalty?.totemUsed
        ? `🧿 *Tu tótem se activó* — perdiste solo *${penalty.lostExp} EXP* y *${penalty.lostMoney} 💎*\n`
        : `💀 Perdiste *${penalty?.lostExp || 0} EXP* y *${penalty?.lostMoney || 0} 💎*\n`) +
      `🛡️ Tu armadura fue destruida • ❤️ -${hunterDef.damage} HP\n\n` +
      `⛓️ Solo otro jugador puede rescatarte.\n` +
      `📣 Usa: *rescate pedir*`
  }
}

export function fightHunter(id) {
  if (!isHunterActive(id)) return { success: false, noHunter: true }

  const u         = getUserStats(id)
  const level     = getHunterLevel(u?.hunterTracking?.escapeAttempts || 0)
  const hunterDef = HUNTER_LEVELS[level]
  const name      = pick(HUNTER_NAMES[level])

  if (Math.random() < hunterDef.fightChance) {
    releaseFromHunter(id)
    addExp(id, FIGHT_WIN_EXP)
    addMoney(id, FIGHT_WIN_MONEY)
    return {
      success: true,
      message:
        `⚔️ *¡VICTORIA IMPOSIBLE!*\n` +
        `Derrotaste a *${name}* [Nivel ${level}].\n\n` +
        `🏆 Recompensa:\n` +
        `⭐ +*${FIGHT_WIN_EXP.toLocaleString()} EXP*\n` +
        `💎 +*${FIGHT_WIN_MONEY.toLocaleString()} diamantes*\n\n` +
        `🎖️ El cazador huyó. Por ahora eres libre.`
    }
  }

  const armorTipo = u?.armor?.type || 'ninguna'
  capturedByHunter(id)
  breakArmor(id)
  removeHp(id, hunterDef.damage)
  const penalty = applyDeathPenalty(id)
  increaseBounty(id, level, 500 * level, 'Resistencia al Cazador')

  return {
    success: false,
    message:
      `💀 *¡DERROTA TOTAL!*\n` +
      `*${name}* [Nivel ${level}] te aplastó sin esfuerzo.\n\n` +
      (penalty?.totemUsed ? `🧿 *Tu tótem se activó* — pérdida reducida.\n` : '') +
      `📉 Perdiste *${penalty?.lostExp || 0} EXP* y *${penalty?.lostMoney || 0} 💎*\n` +
      `🛡️ Armadura *${armorTipo}* destruida • ❤️ -${hunterDef.damage} HP\n` +
      `🚨 +${level} estrellas de bounty\n\n` +
      `⛓️ Solo un rescate puede liberarte.\n` +
      `📣 Usa: *rescate pedir*`
  }
}

export function checkSavior(id) {
  const u = getPlayerState(id)
  if (!u?.isCaptured) return null
  if (!u?.hunterTracking?.capturedByHunter) return null

  const capturedSince = u.hunterTracking.hunterSince || 0
  if (!capturedSince || (Date.now() - capturedSince) < SAVIOR_MIN_WAIT) return null

  if (Math.random() > SAVIOR_CHANCE) return null

  const saviorName   = pick(SAVIOR_NAMES)
  const rescueExp    = Math.floor(Math.random() * 3000) + 1000
  const rescueMoney  = Math.floor(Math.random() * 2000) + 500
  const bountyStolen = Math.floor(Math.random() * 1500) + 500

  addExp(id, rescueExp)
  addMoney(id, rescueMoney)
  releaseFromHunter(id)

  return {
    saviorName,
    rescueExp,
    rescueMoney,
    bountyStolen,
    message:
      `🦸 *¡Apareció ${saviorName}!*\n\n` +
      `Mientras el cazador no prestaba atención,\n` +
      `*${saviorName}* te liberó y robó parte del botín.\n\n` +
      `🎁 *Te dejó:*\n` +
      `⭐ +*${rescueExp.toLocaleString()} EXP*\n` +
      `💎 +*${rescueMoney.toLocaleString()} diamantes*\n` +
      `💰 Robó *${bountyStolen.toLocaleString()} 💎* del cazador\n\n` +
      `✅ Eres libre. Pero ten cuidado — el cazador volverá.`
  }
}

export function rescuerBounty(rescuerId, capturedId) {
  const u = getPlayerState(capturedId)
  if (!u?.hunterTracking?.capturedByHunter) return null

  const rescuerExp   = Math.floor(Math.random() * 5000) + 2000
  const rescuerMoney = Math.floor(Math.random() * 3000) + 1000
  const capturedExp   = Math.floor(rescuerExp * 0.4)
  const capturedMoney = Math.floor(rescuerMoney * 0.4)

  addExp(rescuerId, rescuerExp)
  addMoney(rescuerId, rescuerMoney)
  addExp(capturedId, capturedExp)
  addMoney(capturedId, capturedMoney)

  return {
    rescuerExp,
    rescuerMoney,
    capturedExp,
    capturedMoney,
    message:
      `\n🏹 *Botín del Cazador repartido:*\n` +
      `👤 Rescatador: ⭐ +*${rescuerExp.toLocaleString()} EXP* • 💎 +*${rescuerMoney.toLocaleString()}*\n` +
      `🆓 Liberado: ⭐ +*${capturedExp.toLocaleString()} EXP* • 💎 +*${capturedMoney.toLocaleString()}*\n` +
      `_(robados del botín del Cazador)_`
  }
}

const HUNTER_RESPONSE_WINDOW = 5 * 60 * 1000

export function checkHunterCapture(id) {
  const u = getUserStats(id)
  if (!u?.hunterTracking?.hunterActive) return null
  if (u?.hunterTracking?.capturedByHunter) return null

  const since = u.hunterTracking.hunterSince || 0
  if (Date.now() - since < HUNTER_RESPONSE_WINDOW) return null

  const level     = getHunterLevel(u.hunterTracking.escapeAttempts || 0)
  const hunterDef = HUNTER_LEVELS[level]
  const name      = pick(HUNTER_NAMES[level])

  capturedByHunter(id)
  breakArmor(id)
  removeHp(id, hunterDef.damage)
  const penalty = applyDeathPenalty(id)

  return {
    captured: true,
    message:
      `⏰ *Tardaste demasiado en responder.*
` +
      `*${name}* [Nivel ${level}] aprovechó tu descuido y te atrapó.

` +
      (penalty?.totemUsed
        ? `🧿 *Tu tótem se activó* — perdiste solo *${penalty.lostExp} EXP* y *${penalty.lostMoney} 💎*
`
        : `💀 Perdiste *${penalty?.lostExp || 0} EXP* y *${penalty?.lostMoney || 0} 💎*
`) +
      `🛡️ Tu armadura fue destruida • ❤️ -${hunterDef.damage} HP

` +
      `⛓️ Solo otro jugador puede rescatarte.
` +
      `📣 Usa: *rescate pedir*`
  }
}

export function getHunterStatus(id) {
  const u = getUserStats(id)
  if (!u?.hunterTracking) return { active: false, captured: false, threat: 0, level: 1 }

  const h     = u.hunterTracking
  const prob  = calcTriggerProbability(h)
  const level = getHunterLevel(h.escapeAttempts || 0)

  return {
    active:         h.hunterActive || false,
    captured:       h.capturedByHunter || false,
    threat:         Math.round(prob * 100),
    level,
    hunterName:     HUNTER_LEVELS[level].name,
    gainExp:        h.gainExp || 0,
    gainMoney:      h.gainMoney || 0,
    escapeAttempts: h.escapeAttempts || 0,
    windowStart:    h.windowStart || 0
  }
}
