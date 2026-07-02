import {
  getPlayerState, setPlayerState, getUserStats, setUserStats,
  addExp, addMoney, removeMoney, removeExp, addItem,
  addBuff, getActiveBuff, cleanExpiredBuffs,
  increaseBounty, clearBounty, removeHp, addHp,
  isCapturedByHunter
} from './stats.js'

const MERCHANT_COOLDOWN  = 20 * 60 * 1000
const MERCHANT_WINDOW    = 3 * 60 * 1000
const MERCHANT_CHANCE    = 0.18
const JUDGE_COOLDOWN     = 60 * 60 * 1000
const UNDEAD_COOLDOWN    = 30 * 60 * 1000
const SPY_COST           = 500

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const MERCHANT_NAMES = [
  'Aldric el Errante', 'Mira de los Caminos',
  'Tobias el Buhonero', 'Sera la Comerciante'
]

const JUDGE_NAMES = [
  'El Gran Juez Vorn', 'Lady Astra la Implacable',
  'Magistrado Drek', 'El Tribunal Oscuro'
]

const UNDEAD_NAMES = [
  'Valdris el Non-Muerto', 'La Sombra Hambrienta',
  'Moris el Errante', 'El Espectro del Abismo'
]

const SPY_NAMES = [
  'Cipher', 'La Sombra', 'Inx el Informante',
  'Vera sin Rostro', 'El Susurrador'
]

const MERCHANT_ITEMS = [
  { key: 'armadura_temporal', emoji: '🥷', nombre: 'Armadura Temporal',
    desc: 'DEF +10 por 1 hora. No reemplaza la armadura real.', cost: 800 },
  { key: 'pocion_doble',      emoji: '💉', nombre: 'Poción Doble',
    desc: '+80 HP instantáneo. Item especial, no disponible en tienda.', cost: 1200 },
  { key: 'amuleto_escape',    emoji: '🪬', nombre: 'Amuleto de Escape',
    desc: 'Próxima vez que el cazador te atrape, escapas automáticamente. Un uso.', cost: 2000 },
  { key: 'mapa_tesoro',       emoji: '🗺️', nombre: 'Mapa del Tesoro',
    desc: 'Revela una ubicación con 500-3000 diamantes. Un uso.', cost: 600 },
  { key: 'sello_inocencia',   emoji: '📜', nombre: 'Sello de Inocencia',
    desc: 'Elimina todas tus estrellas de bounty al instante.', cost: 3000 },
]

function getMerchantOffer() {
  const shuffled = [...MERCHANT_ITEMS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

export function checkMerchantTrigger(id) {
  const u = getPlayerState(id)
  if (!u) return null
  if (isCapturedByHunter(id) || u.isCaptured) return null

  const lastMerchant = u.npcState?.lastMerchant || 0
  if (Date.now() - lastMerchant < MERCHANT_COOLDOWN) return null
  if (Math.random() > MERCHANT_CHANCE) return null

  const offer   = getMerchantOffer()
  const name    = pick(MERCHANT_NAMES)
  const expires = Date.now() + MERCHANT_WINDOW

  if (!u.npcState) u.npcState = {}
  u.npcState.merchantOffer   = offer
  u.npcState.merchantExpires = expires
  u.npcState.merchantName    = name
  u.npcState.lastMerchant    = Date.now()
  setPlayerState(id, u)

  const lines = offer.map((item, i) =>
    `${i + 1}. ${item.emoji} *${item.nombre}* — ${item.cost}💎\n   📝 ${item.desc}`
  ).join('\n\n')

  return {
    name,
    message:
      `\n\n🧙 *¡${name} apareció!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Tienes *3 minutos* para comprar algo especial:\n\n` +
      `${lines}\n\n` +
      `💡 Usa: *mercader comprar <1|2|3>*\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  }
}

export function buyFromMerchant(id, index) {
  const u = getPlayerState(id)
  if (!u?.npcState?.merchantOffer) return { error: '🧙 El mercader no está disponible ahora.' }

  if (Date.now() > (u.npcState.merchantExpires || 0)) {
    u.npcState.merchantOffer = null
    setPlayerState(id, u)
    return { error: '⏰ El mercader ya se fue. Quizás vuelva más tarde.' }
  }

  const idx = parseInt(index) - 1
  const offer = u.npcState.merchantOffer
  if (isNaN(idx) || idx < 0 || idx >= offer.length) {
    return { error: '❌ Número inválido. Elige entre 1, 2 o 3.' }
  }

  const item  = offer[idx]
  const saldo = u.money || 0

  if (saldo < item.cost) {
    return { error: `❌ Sin diamantes. Necesitas *${item.cost}💎*, tienes *${saldo}💎*.` }
  }

  removeMoney(id, item.cost)

  if (item.key === 'pocion_doble') {
    addHp(id, 80)
  } else if (item.key === 'armadura_temporal') {
    addBuff(id, 'armor_temp', 10, 60 * 60 * 1000)
  } else if (item.key === 'sello_inocencia') {
    clearBounty(id)
  } else if (item.key === 'mapa_tesoro') {
    const reward = Math.floor(Math.random() * 2500) + 500
    addMoney(id, reward)
    u.npcState.merchantOffer = null
    setPlayerState(id, u)
    return {
      success: true,
      message:
        `🗺️ *¡El mapa llevó a un tesoro!*\n\n` +
        `💎 Encontraste *${reward.toLocaleString()} diamantes* escondidos.\n` +
        `💰 Saldo restante: *${(saldo - item.cost + reward).toLocaleString()}*`
    }
  } else {
    addItem(id, item.key, 1)
  }

  u.npcState.merchantOffer = null
  setPlayerState(id, u)

  return {
    success: true,
    message:
      `${item.emoji} *¡Comprado a ${u.npcState?.merchantName || 'el Mercader'}!*\n\n` +
      `Item: *${item.nombre}*\n` +
      `💎 Pagaste: *${item.cost}*\n` +
      `💰 Saldo restante: *${saldo - item.cost}*`
  }
}

export function getMerchantStatus(id) {
  const u = getPlayerState(id)
  const offer = u?.npcState?.merchantOffer
  const expires = u?.npcState?.merchantExpires || 0
  if (!offer || Date.now() > expires) return null
  return {
    name: u.npcState.merchantName,
    offer,
    remaining: expires - Date.now()
  }
}

export function checkJudgeTrigger(id) {
  const u = getPlayerState(id)
  if (!u) return null
  if ((u.bountyStars || 0) < 4) return null
  if (u.isCaptured) return null

  const lastJudge = u.npcState?.lastJudge || 0
  if (Date.now() - lastJudge < JUDGE_COOLDOWN) return null

  if (!u.npcState) u.npcState = {}
  u.npcState.judgeActive  = true
  u.npcState.judgeName    = pick(JUDGE_NAMES)
  u.npcState.lastJudge    = Date.now()
  setPlayerState(id, u)

  return {
    name: u.npcState.judgeName,
    message:
      `\n\n⚖️ *¡${u.npcState.judgeName} te encontró!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Tienes *${u.bountyStars}⭐* de búsqueda. Debes responder:\n\n` +
      `1️⃣ *juez pagar* — Paga multa x3 y quedas libre\n` +
      `2️⃣ *juez mision* — Misión de redención (sin crimen 2h)\n` +
      `3️⃣ *juez huir* — Huir (50% éxito, si fallas te captura)\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  }
}

export function judgeAction(id, action) {
  const u = getPlayerState(id)
  if (!u?.npcState?.judgeActive) return { error: '⚖️ El Juez no está presente.' }

  const fine     = (u.bountyFine || 0) * 3
  const judgeName = u.npcState.judgeName || 'El Juez'

  if (action === 'pagar') {
    if ((u.money || 0) < fine) {
      return { error: `❌ No tienes suficiente. La multa es *${fine}💎* y tienes *${u.money || 0}💎*.` }
    }
    removeMoney(id, fine)
    clearBounty(id)
    u.npcState.judgeActive = false
    setPlayerState(id, u)
    return {
      success: true,
      message:
        `⚖️ *${judgeName} acepta el pago.*\n\n` +
        `💎 Pagaste *${fine.toLocaleString()}* diamantes.\n` +
        `✅ Tu bounty fue eliminado. Eres libre.`
    }
  }

  if (action === 'mision') {
    addBuff(id, 'judge_mission', 1, 2 * 60 * 60 * 1000)
    clearBounty(id)
    u.npcState.judgeActive = false
    setPlayerState(id, u)
    return {
      success: true,
      message:
        `📋 *Misión de redención aceptada.*\n\n` +
        `*${judgeName}* te da 2 horas para demostrar que cambiaste.\n` +
        `✅ Bounty suspendido. Si haces un crimen en este tiempo, vuelve todo.\n` +
        `⏱️ Duración: *2 horas*`
    }
  }

  if (action === 'huir') {
    if (Math.random() < 0.5) {
      u.npcState.judgeActive = false
      setPlayerState(id, u)
      return {
        success: true,
        message:
          `🏃 *¡Escapaste del Juez!*\n\n` +
          `*${judgeName}* no pudo atraparte... por ahora.\n` +
          `⚠️ Volverá. Y la próxima multa será mayor.`
      }
    }
    u.isCaptured = true
    u.wantedReason = 'Capturado por el Juez'
    u.npcState.judgeActive = false
    increaseBounty(id, 1, 300, 'Fuga fallida del Juez')
    setPlayerState(id, u)
    return {
      success: false,
      message:
        `⛓️ *¡El Juez te atrapó!*\n\n` +
        `La fuga falló. *${judgeName}* te encadenó.\n` +
        `🚨 +1 estrella de bounty • +300💎 de multa\n` +
        `📣 Usa: *rescate pedir*`
    }
  }

  return { error: '❓ Acción inválida. Usa: pagar | mision | huir' }
}

export function checkUndeadTrigger(id) {
  const u = getPlayerState(id)
  if (!u) return null
  if (u.isCaptured) return null
  if ((u.hp || 100) >= (u.maxHp || 100) * 0.3) return null

  const lastUndead = u.npcState?.lastUndead || 0
  if (Date.now() - lastUndead < UNDEAD_COOLDOWN) return null
  if (Math.random() > 0.30) return null

  const name = pick(UNDEAD_NAMES)
  if (!u.npcState) u.npcState = {}
  u.npcState.undeadActive = true
  u.npcState.undeadName   = name
  u.npcState.lastUndead   = Date.now()
  setPlayerState(id, u)

  return {
    name,
    message:
      `\n\n🧟 *¡${name} detectó tu debilidad!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Tu HP está en *${u.hp}/${u.maxHp}*. Tienes una oferta oscura:\n\n` +
      `💀 Te cura al *100% de HP* ahora mismo.\n` +
      `⚠️ A cambio, por *1 hora* ganas *50% menos EXP*.\n\n` +
      `• *muerto aceptar* — Acepta el trato\n` +
      `• *muerto rechazar* — Rechazar\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  }
}

export function undeadAction(id, action) {
  const u = getPlayerState(id)
  if (!u?.npcState?.undeadActive) return { error: '🧟 El Muerto Viviente no está aquí.' }

  const name = u.npcState.undeadName || 'El Muerto Viviente'

  if (action === 'aceptar') {
    const hpAntes = u.hp || 0
    u.hp = u.maxHp || 100
    addBuff(id, 'exp_penalty', -0.50, 60 * 60 * 1000)
    u.npcState.undeadActive = false
    setPlayerState(id, u)
    return {
      success: true,
      message:
        `🧟 *Trato aceptado con ${name}.*\n\n` +
        `❤️ HP restaurado: *${hpAntes}* → *${u.maxHp}*\n` +
        `⚠️ Penalización: *-50% EXP* por 1 hora.\n` +
        `💀 Tu alma le pertenece... temporalmente.`
    }
  }

  u.npcState.undeadActive = false
  setPlayerState(id, u)
  return {
    success: false,
    message: `💪 Rechazaste a *${name}*.\nSiguió su camino... por ahora.`
  }
}

export function callSpy(id, targetId) {
  const u = getPlayerState(id)
  if (!u) return { error: 'Usuario no encontrado.' }
  if ((u.money || 0) < SPY_COST) {
    return { error: `❌ El espía cobra *${SPY_COST}💎*. Tienes *${u.money || 0}💎*.` }
  }

  const target = getPlayerState(targetId)
  if (!target) return { error: '❌ Objetivo no encontrado.' }

  removeMoney(id, SPY_COST)

  const spyName  = pick(SPY_NAMES)
  const hunterNear = target.hunterTracking?.hunterActive || false
  const captured   = target.isCaptured || false
  const bounty     = target.bountyStars || 0
  const hp         = target.hp || 100
  const maxHp      = target.maxHp || 100
  const hpPct      = Math.round((hp / maxHp) * 100)

  return {
    success: true,
    message:
      `🕵️ *Informe de ${spyName}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 Objetivo: @${targetId.split('@')[0]}\n` +
      `❤️ HP: *${hp}/${maxHp}* (${hpPct}%)\n` +
      `🚨 Bounty: *${bounty ? '⭐'.repeat(bounty) : '—'}*\n` +
      `⛓️ Estado: *${captured ? 'Capturado' : 'Libre'}*\n` +
      `🎯 Cazador cerca: *${hunterNear ? 'Sí ⚠️' : 'No ✅'}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💎 Pagaste: *${SPY_COST}*`
  }
}

export function checkGambler(id) {
  const u = getPlayerState(id)
  if (!u) return null
  if ((u.money || 0) < 500) return null
  if (u.isCaptured) return null
  if (Math.random() > 0.12) return null

  if (!u.npcState) u.npcState = {}
  u.npcState.gamblerActive  = true
  u.npcState.lastGambler    = Date.now()
  setPlayerState(id, u)

  return {
    message:
      `\n\n🎰 *¡El Apostador apareció!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Te desafía a una apuesta. Elige:\n\n` +
      `• *apostar <cantidad>* — Apuesta diamantes (mín 100)\n` +
      `• *apostar exp <cantidad>* — Apuesta EXP\n\n` +
      `🎲 Si ganas: recibes el *doble*\n` +
      `💀 Si pierdes: pierdes todo lo apostado\n` +
      `━━━━━━━━━━━━━━━━━━━━`
  }
}

export function gamblerBet(id, type, amount) {
  const u = getPlayerState(id)
  if (!u?.npcState?.gamblerActive) return { error: '🎰 El Apostador ya no está aquí.' }

  const amt = parseInt(amount)
  if (isNaN(amt) || amt < 100) return { error: '❌ Apuesta mínima: 100.' }

  if (type === 'exp') {
    if ((u.exp || 0) < amt) return { error: `❌ No tienes suficiente EXP. Tienes *${u.exp || 0}*.` }
    u.npcState.gamblerActive = false
    setPlayerState(id, u)
    if (Math.random() < 0.45) {
      addExp(id, amt)
      return { success: true, won: true, message: `🎲 *¡Ganaste!*\n⭐ +*${amt.toLocaleString()} EXP* (doble de lo apostado)` }
    }
    removeExp(id, amt)
    return { success: true, won: false, message: `🎲 *Perdiste.*\n⭐ -*${amt.toLocaleString()} EXP*` }
  }

  if ((u.money || 0) < amt) return { error: `❌ No tienes suficiente. Tienes *${u.money || 0}💎*.` }
  u.npcState.gamblerActive = false
  setPlayerState(id, u)
  if (Math.random() < 0.45) {
    addMoney(id, amt)
    return { success: true, won: true, message: `🎲 *¡Ganaste!*\n💎 +*${amt.toLocaleString()} diamantes* (doble de lo apostado)` }
  }
  removeMoney(id, amt)
  return { success: true, won: false, message: `🎲 *Perdiste.*\n💎 -*${amt.toLocaleString()} diamantes*` }
}

export function getNpcState(id) {
  return getPlayerState(id)?.npcState || {}
}

const VAGRANT_COOLDOWN  = 25 * 60 * 1000
const VAGRANT_CHANCE    = 0.20
const VAGRANT_WINDOW    = 4 * 60 * 1000
const VAGRANT_CURSE_MS  = 30 * 60 * 1000

const VAGRANT_NAMES = [
  'El Viejo Errante', 'Tomas el Andrajoso',
  'Mira la Mendiga', 'El Sin Nombre', 'Gruk el Vagabundo'
]

const VAGRANT_REQUESTS = [
  { type: 'exp',   amount: 300,  emoji: '⭐', label: 'EXP' },
  { type: 'exp',   amount: 500,  emoji: '⭐', label: 'EXP' },
  { type: 'money', amount: 200,  emoji: '💎', label: 'diamantes' },
  { type: 'money', amount: 400,  emoji: '💎', label: 'diamantes' },
]

export function checkVagrantTrigger(id) {
  const u = getPlayerState(id)
  if (!u) return null
  if (u.isCaptured) return null

  const lastVagrant = u.npcState?.lastVagrant || 0
  if (Date.now() - lastVagrant < VAGRANT_COOLDOWN) return null
  if (Math.random() > VAGRANT_CHANCE) return null

  const request  = VAGRANT_REQUESTS[Math.floor(Math.random() * VAGRANT_REQUESTS.length)]
  const name     = pick(VAGRANT_NAMES)
  const expires  = Date.now() + VAGRANT_WINDOW

  if (!u.npcState) u.npcState = {}
  u.npcState.vagrantActive   = true
  u.npcState.vagrantName     = name
  u.npcState.vagrantRequest  = request
  u.npcState.vagrantExpires  = expires
  u.npcState.vagrantIgnores  = u.npcState.vagrantIgnores || 0
  u.npcState.lastVagrant     = Date.now()
  setPlayerState(id, u)

  return {
    name,
    request,
    message:
      `

🧓 *¡${name} apareció!*
` +
      `━━━━━━━━━━━━━━━━━━━━
` +
      `Te mira con ojos cansados y dice:
` +
      `_"¿Podrías darme ${request.emoji} *${request.amount} ${request.label}*? Te lo agradeceré..."_

` +
      `🎲 50% te devuelve el *doble*
` +
      `💨 50% desaparece con lo tuyo
` +
      `⚠️ Ignorarlo 3 veces trae mala suerte

` +
      `• *vagabundo dar* — Ayudarlo
` +
      `• *vagabundo ignorar* — Ignorarlo
` +
      `━━━━━━━━━━━━━━━━━━━━`
  }
}

export function vagrantAction(id, action) {
  const u = getPlayerState(id)
  if (!u?.npcState?.vagrantActive) return { error: '🧓 No hay ningún vagabundo aquí ahora.' }

  if (Date.now() > (u.npcState.vagrantExpires || 0)) {
    u.npcState.vagrantActive  = false
    u.npcState.vagrantIgnores = (u.npcState.vagrantIgnores || 0) + 1
    setPlayerState(id, u)

    if (u.npcState.vagrantIgnores >= 3) {
      addBuff(id, 'exp_penalty', -0.20, VAGRANT_CURSE_MS)
      u.npcState.vagrantIgnores = 0
      setPlayerState(id, u)
      return {
        cursed: true,
        message:
          `⏰ *El vagabundo esperó y se fue.*

` +
          `😤 *${u.npcState.vagrantName || 'El vagabundo'}* se cansó de ser ignorado.
` +
          `💀 *¡Te maldijo!* -20% EXP ganada por 30 minutos.`
      }
    }

    return { error: `⏰ El vagabundo ya se fue. Lo has ignorado *${u.npcState.vagrantIgnores}*/3 veces.` }
  }

  const request = u.npcState.vagrantRequest
  const name    = u.npcState.vagrantName

  if (action === 'ignorar' || action === 'ignore') {
    u.npcState.vagrantActive  = false
    u.npcState.vagrantIgnores = (u.npcState.vagrantIgnores || 0) + 1
    setPlayerState(id, u)

    if (u.npcState.vagrantIgnores >= 3) {
      addBuff(id, 'exp_penalty', -0.20, VAGRANT_CURSE_MS)
      u.npcState.vagrantIgnores = 0
      setPlayerState(id, u)
      return {
        cursed: true,
        message:
          `😤 Ignoraste a *${name}*.

` +
          `💀 *¡Maldición!* Has ignorado al vagabundo 3 veces.
` +
          `-20% EXP ganada por *30 minutos*.`
      }
    }

    return {
      ignored: true,
      message:
        `😶 Ignoraste a *${name}*.
` +
        `Se alejó murmurando...
` +
        `⚠️ Lo has ignorado *${u.npcState.vagrantIgnores}*/3 veces.`
    }
  }

  if (action === 'dar' || action === 'give' || action === 'ayudar') {
    const hasEnough = request.type === 'exp'
      ? (u.exp || 0) >= request.amount
      : (u.money || 0) >= request.amount

    if (!hasEnough) {
      u.npcState.vagrantActive = false
      setPlayerState(id, u)
      return {
        error:
          `❌ No tienes suficiente ${request.emoji} *${request.label}*.
` +
          `Necesitas *${request.amount}* y no alcanza.
` +
          `*${name}* se fue triste.`
      }
    }

    if (request.type === 'exp') removeExp(id, request.amount)
    else removeMoney(id, request.amount)

    u.npcState.vagrantActive  = false
    u.npcState.vagrantIgnores = 0
    setPlayerState(id, u)

    if (Math.random() < 0.50) {
      const reward = request.amount * 2
      if (request.type === 'exp') addExp(id, reward)
      else addMoney(id, reward)

      return {
        success: true,
        won: true,
        message:
          `🧓 *${name}* te mira agradecido...

` +
          `✨ _"Eres muy generoso. Que el destino te recompense."_

` +
          `🎉 *¡El vagabundo era un sabio disfrazado!*
` +
          `${request.emoji} Te devolvió el *doble*: +*${reward} ${request.label}*
` +
          `💰 Ganaste *${request.amount} ${request.label}* netos.`
      }
    }

    return {
      success: true,
      won: false,
      message:
        `🧓 *${name}* toma lo que le diste...

` +
        `💨 _"Gracias... quizás nos veamos de nuevo."_

` +
        `Se desvanece entre las sombras con tus *${request.amount} ${request.label}*.
` +
        `😅 Esta vez no hubo suerte.`
    }
  }

  return { error: '💡 Usa: *vagabundo dar* | *vagabundo ignorar*' }
}
