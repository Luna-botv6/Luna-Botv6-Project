import {
  getUserStats, setUserStats, getPlayerState, setPlayerState,
  trackGain, setHunterActive, capturedByHunter, releaseFromHunter,
  isHunterActive, isCapturedByHunter, addExp, addMoney,
  removeHp, breakArmor, applyDeathPenalty, increaseBounty
} from './stats.js'
import { getNpcLang, tpl } from './npcLang.js'

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

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getHunterLevel(escapeAttempts) {
  if (escapeAttempts >= 6) return 3
  if (escapeAttempts >= 3) return 2
  return 1
}

function getLevels(id) {
  const t = getNpcLang(id)
  return [
    { name: t.cazador_nivel_1 || 'Rastreador',   escapeChance: 0.40, fightChance: 0.05, damage: 50, allies: 0, emoji: '🗡️' },
    { name: t.cazador_nivel_2 || 'Cazador',      escapeChance: 0.28, fightChance: 0.03, damage: 65, allies: 1, emoji: '⚔️' },
    { name: t.cazador_nivel_3 || 'Verdugo',      escapeChance: 0.15, fightChance: 0.02, damage: 80, allies: 2, emoji: '💀' }
  ]
}

function getNames(id) {
  const t = getNpcLang(id)
  return {
    1: t.cazador_nombres_1 && t.cazador_nombres_1.length ? t.cazador_nombres_1 : ['Kael el Rastreador', 'Sombra Gris', 'Mortis', 'Zaren'],
    2: t.cazador_nombres_2 && t.cazador_nombres_2.length ? t.cazador_nombres_2 : ['El Verdugo', 'Sombra Roja', 'Kael el Implacable', 'Drak'],
    3: t.cazador_nombres_3 && t.cazador_nombres_3.length ? t.cazador_nombres_3 : ['La Tríada Oscura', 'Mortis y sus Aliados', 'El Consejo del Cazador']
  }
}

function getAppearances(id) {
  const t = getNpcLang(id)
  return t.apariciones && t.apariciones.length
    ? t.apariciones
    : ['👁️ *Unos pasos pesados resuenan detrás de ti...*', '🌑 *Una silueta oscura bloquea tu camino...*', '⚔️ *El suelo tiembla. Alguien te encontró.*', '🩸 *Un silbido corta el aire.*', '🔱 *Sientes que alguien lleva tiempo siguiéndote.*']
}

function getNamesByLevel(id, level) {
  return getNames(id)[level] || getNames(id)[1]
}

function pickHunterName(id, level) {
  return pick(getNamesByLevel(id, level))
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
  const t        = getNpcLang(id)
  const hunterDef = getLevels(id)[level - 1]
  const name     = pickHunterName(id, level)
  const appear   = pick(getAppearances(id))

  const useExp = u.hunterTracking.gainExp >= THRESHOLD_EXP
  const acum   = useExp
    ? tpl(t.cazador_acum_exp || '*{{valor}} EXP*', { valor: u.hunterTracking.gainExp.toLocaleString() })
    : tpl(t.cazador_acum_dinero || '*{{valor}} 💎*', { valor: u.hunterTracking.gainMoney.toLocaleString() })

  const aliasLine = hunterDef.allies > 0
    ? '\n' + tpl(t.cazador_aliados || '⚠️ Viene acompañado de *{{aliados}} aliado(s)*. Escapar será más difícil.', { aliados: hunterDef.allies })
    : ''

  return {
    hunterName: name,
    level,
    message:
      tpl(t.cazador_detecto ||
        '\n\n━━━━━━━━━━━━━━━━━━━━\n{{aparicion}}\n{{emoji}} *{{name}}* [Nivel {{nivel}}] detectó tu actividad ({{acum}} acumulados).{{aliados}}\n\n🏃 Escapar: *{{escapePct}}%* • ⚔️ Ganarle: *{{peleaPct}}%*\n\n• *cazador correr* — Intentar huir\n• *cazador pelear* — Enfrentarlo\n━━━━━━━━━━━━━━━━━━━━',
        {
          aparicion: appear,
          emoji: hunterDef.emoji,
          name,
          nivel: level,
          acum,
          aliados: aliasLine,
          escapePct: Math.round(hunterDef.escapeChance * 100),
          peleaPct: Math.round(hunterDef.fightChance * 100)
        })
  }
}

export function runFromHunter(id) {
  if (!isHunterActive(id)) return { success: false, noHunter: true }

  const u = getUserStats(id)
  if (!u) return { success: false }

  const t         = getNpcLang(id)
  const level     = getHunterLevel(u.hunterTracking?.escapeAttempts || 0)
  const hunterDef = getLevels(id)[level - 1]

  if (Math.random() < hunterDef.escapeChance) {
    u.hunterTracking.hunterActive    = false
    u.hunterTracking.escapedAt       = Date.now()
    u.hunterTracking.escapeAttempts  = (u.hunterTracking.escapeAttempts || 0) + 1
    u.hunterTracking.gainExp         = Math.floor(u.hunterTracking.gainExp * 0.5)
    u.hunterTracking.gainMoney       = Math.floor(u.hunterTracking.gainMoney * 0.5)
    setUserStats(id, u)

    const attempts  = u.hunterTracking.escapeAttempts
    const nextLevel = getHunterLevel(attempts)
    const nextDef   = getLevels(id)[nextLevel - 1]
    const nextProb  = Math.round(Math.min(BASE_TRIGGER_PROB + attempts * REAPPEAR_BONUS, MAX_REAPPEAR_PROB) * 100)
    const levelWarn = nextLevel > level
      ? '\n' + tpl(t.cazador_nivel_up || '⬆️ El cazador subió a *Nivel {{nivel}} — {{name}}*. Será más difícil escapar.', { nivel: nextLevel, name: nextDef.name })
      : ''

    return {
      success: true,
      escaped: true,
      message:
        tpl(t.cazador_escapaste ||
          '🏃 *¡Lograste escapar!*\n⚠️ El cazador sigue buscándote.\n📈 Probabilidad de reaparición: *{{prob}}%*{{nivel}}\n💡 Cada escape lo hace más peligroso.',
          { prob: nextProb, nivel: levelWarn })
    }
  }

  capturedByHunter(id)
  const penalty = applyDeathPenalty(id)
  removeHp(id, hunterDef.damage)

  const persecucion = penalty?.totemUsed
    ? tpl(t.cazador_totem || '🧿 *Tu tótem se activó* — perdiste solo *{{exp}} EXP* y *{{dinero}} 💎*', { exp: penalty.lostExp, dinero: penalty.lostMoney })
    : tpl(t.cazador_perdida || '💀 Perdiste *{{exp}} EXP* y *{{dinero}} 💎*', { exp: penalty?.lostExp || 0, dinero: penalty?.lostMoney || 0 })

  return {
    success: false,
    captured: true,
    message:
      tpl(t.cazador_atrapado ||
        '⛓️ *¡Te atraparon!*\n*{{name}}* fue demasiado rápido.\n\n{{perdida}}\n🛡️ Tu armadura fue destruida • ❤️ -{{dano}} HP\n\n⛓️ Solo otro jugador puede rescatarte.\n📣 Usa: *rescate pedir*',
        { name: pickHunterName(id, level), perdida: persecucion, dano: hunterDef.damage })
  }
}

export function fightHunter(id) {
  if (!isHunterActive(id)) return { success: false, noHunter: true }

  const t         = getNpcLang(id)
  const u         = getUserStats(id)
  const level     = getHunterLevel(u?.hunterTracking?.escapeAttempts || 0)
  const hunterDef = getLevels(id)[level - 1]
  const name      = pickHunterName(id, level)

  if (Math.random() < hunterDef.fightChance) {
    releaseFromHunter(id)
    addExp(id, FIGHT_WIN_EXP)
    addMoney(id, FIGHT_WIN_MONEY)
    return {
      success: true,
      message:
        tpl(t.cazador_victoria ||
          '⚔️ *¡VICTORIA IMPOSIBLE!*\nDerrotaste a *{{name}}* [Nivel {{nivel}}].\n\n🏆 Recompensa:\n⭐ +*{{exp}} EXP*\n💎 +*{{dinero}} diamantes*\n\n🎖️ El cazador huyó. Por ahora eres libre.',
          { name, nivel: level, exp: FIGHT_WIN_EXP.toLocaleString(), dinero: FIGHT_WIN_MONEY.toLocaleString() })
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
      tpl(t.cazador_derrota ||
        '💀 *¡DERROTA TOTAL!*\n*{{name}}* [Nivel {{nivel}}] te aplastó sin esfuerzo.\n\n{{totem}}📉 Perdiste *{{exp}} EXP* y *{{dinero}} 💎*\n🛡️ Armadura *{{armadura}}* destruida • ❤️ -{{dano}} HP\n🚨 +{{estrellas}} estrellas de bounty\n\n⛓️ Solo un rescate puede liberarte.\n📣 Usa: *rescate pedir*',
        {
          name,
          nivel: level,
          totem: penalty?.totemUsed ? tpl(t.cazador_totem_reducida || '🧿 *Tu tótem se activó* — pérdida reducida.\n', {}) : '',
          exp: penalty?.lostExp || 0,
          dinero: penalty?.lostMoney || 0,
          armadura: armorTipo,
          dano: hunterDef.damage,
          estrellas: level
        })
  }
}

export function checkSavior(id) {
  const u = getPlayerState(id)
  if (!u?.isCaptured) return null
  if (!u?.hunterTracking?.capturedByHunter) return null

  const capturedSince = u.hunterTracking.hunterSince || 0
  if (!capturedSince || (Date.now() - capturedSince) < SAVIOR_MIN_WAIT) return null

  if (Math.random() > SAVIOR_CHANCE) return null

  const t = getNpcLang(id)
  const saviorList = t.salvador_nombres && t.salvador_nombres.length
    ? t.salvador_nombres
    : ['Lyra la Errante', 'El Desconocido', 'Vex el Rebelde', 'Aria Sombría', 'Thane el Fugitivo']
  const saviorName   = pick(saviorList)
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
      tpl(t.cazador_salvador ||
        '🦸 *¡Apareció {{name}}!*\n\nMientras el cazador no prestaba atención,\n*{{name}}* te liberó y robó parte del botín.\n\n🎁 *Te dejó:*\n⭐ +*{{exp}} EXP*\n💎 +*{{dinero}} diamantes*\n💰 Robó *{{botin}} 💎* del cazador\n\n✅ Eres libre. Pero ten cuidado — el cazador volverá.',
        { name: saviorName, exp: rescueExp.toLocaleString(), dinero: rescueMoney.toLocaleString(), botin: bountyStolen.toLocaleString() })
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

  const t = getNpcLang(capturedId)

  return {
    rescuerExp,
    rescuerMoney,
    capturedExp,
    capturedMoney,
    message:
      tpl(t.cazador_botin ||
        '\n🏹 *Botín del Cazador repartido:*\n👤 Rescatador: ⭐ +*{{rescuerExp}} EXP* • 💎 +*{{rescuerMoney}}*\n🆓 Liberado: ⭐ +*{{capturedExp}} EXP* • 💎 +*{{capturedMoney}}*\n_(robados del botín del Cazador)_',
        {
          rescuerExp: rescuerExp.toLocaleString(),
          rescuerMoney: rescuerMoney.toLocaleString(),
          capturedExp: capturedExp.toLocaleString(),
          capturedMoney: capturedMoney.toLocaleString()
        })
  }
}

const HUNTER_RESPONSE_WINDOW = 5 * 60 * 1000

export function checkHunterCapture(id) {
  const u = getUserStats(id)
  if (!u?.hunterTracking?.hunterActive) return null
  if (u?.hunterTracking?.capturedByHunter) return null

  const since = u.hunterTracking.hunterSince || 0
  if (Date.now() - since < HUNTER_RESPONSE_WINDOW) return null

  const t         = getNpcLang(id)
  const level     = getHunterLevel(u.hunterTracking.escapeAttempts || 0)
  const hunterDef = getLevels(id)[level - 1]
  const name      = pickHunterName(id, level)

  capturedByHunter(id)
  breakArmor(id)
  removeHp(id, hunterDef.damage)
  const penalty = applyDeathPenalty(id)

  const persecucion = penalty?.totemUsed
    ? tpl(t.cazador_totem || '🧿 *Tu tótem se activó* — perdiste solo *{{exp}} EXP* y *{{dinero}} 💎*\n', { exp: penalty.lostExp, dinero: penalty.lostMoney })
    : tpl(t.cazador_perdida || '💀 Perdiste *{{exp}} EXP* y *{{dinero}} 💎*\n', { exp: penalty?.lostExp || 0, dinero: penalty?.lostMoney || 0 })

  return {
    captured: true,
    message:
      tpl(t.cazador_tarde ||
        '⏰ *Tardaste demasiado en responder.*\n*{{name}}* [Nivel {{nivel}}] aprovechó tu descuido y te atrapó.\n\n{{perdida}}🛡️ Tu armadura fue destruida • ❤️ -{{dano}} HP\n\n⛓️ Solo otro jugador puede rescatarte.\n📣 Usa: *rescate pedir*',
        { name, nivel: level, perdida: persecucion, dano: hunterDef.damage })
  }
}

export function getHunterStatus(id) {
  const u = getUserStats(id)
  const t  = getNpcLang(id)
  if (!u?.hunterTracking) return { active: false, captured: false, threat: 0, level: 1 }

  const h     = u.hunterTracking
  const prob  = calcTriggerProbability(h)
  const level = getHunterLevel(h.escapeAttempts || 0)

  return {
    active:         h.hunterActive || false,
    captured:       h.capturedByHunter || false,
    threat:         Math.round(prob * 100),
    level,
    hunterName:     getLevels(id)[level - 1]?.name,
    gainExp:        h.gainExp || 0,
    gainMoney:      h.gainMoney || 0,
    escapeAttempts: h.escapeAttempts || 0,
    windowStart:    h.windowStart || 0
  }
}