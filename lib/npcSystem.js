import {
  getPlayerState, setPlayerState, getUserStats, setUserStats,
  addExp, addMoney, removeMoney, removeExp, addItem,
  addBuff, getActiveBuff, cleanExpiredBuffs,
  increaseBounty, clearBounty, removeHp, addHp,
  isCapturedByHunter
} from './stats.js'
import { getNpcLang, getNpcNames, tpl } from './npcLang.js'

const MERCHANT_COOLDOWN  = 20 * 60 * 1000
const MERCHANT_WINDOW    = 3 * 60 * 1000
const MERCHANT_CHANCE    = 0.18
const JUDGE_COOLDOWN     = 60 * 60 * 1000
const UNDEAD_COOLDOWN    = 30 * 60 * 1000
const SPY_COST           = 500

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const MERCHANT_ITEMS = [
  { key: 'armadura_temporal', emoji: '🥷', cost: 800 },
  { key: 'pocion_doble',      emoji: '💉', cost: 1200 },
  { key: 'amuleto_escape',    emoji: '🪬', cost: 2000 },
  { key: 'mapa_tesoro',       emoji: '🗺️', cost: 600 },
  { key: 'sello_inocencia',   emoji: '📜', cost: 3000 },
]

function getMerchantItem(t, item) {
  const it = t?.items?.[item.key] || {}
  return {
    ...item,
    nombre: it.nombre || `Armadura Temporal`,
    desc: it.desc || ''
  }
}

function getMerchantOffer(t) {
  const shuffled = [...MERCHANT_ITEMS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3).map((it) => getMerchantItem(t, it))
}

export function checkMerchantTrigger(id) {
  const t = getNpcLang(id)
  const u = getPlayerState(id)
  if (!u) return null
  if (isCapturedByHunter(id) || u.isCaptured) return null

  const lastMerchant = u.npcState?.lastMerchant || 0
  if (Date.now() - lastMerchant < MERCHANT_COOLDOWN) return null
  if (Math.random() > MERCHANT_CHANCE) return null

  const offer   = getMerchantOffer(t)
  const name    = pick(getNpcNames(id, ['mercader_nombres']))
  const expires = Date.now() + MERCHANT_WINDOW

  if (!u.npcState) u.npcState = {}
  u.npcState.merchantOffer   = offer
  u.npcState.merchantExpires = expires
  u.npcState.merchantName    = name
  u.npcState.lastMerchant    = Date.now()
  setPlayerState(id, u)

  const lines = offer.map((item, i) =>
    tpl(t.mercader_linea || '{{n}}. {{emoji}} *{{nombre}}* — {{costo}}💎\n   📝 {{desc}}',
      { n: i + 1, emoji: item.emoji, nombre: item.nombre, desc: item.desc, costo: item.cost })
  ).join('\n\n')

  return {
    name,
    message:
      tpl(t.mercader_aparecio ||
        '\n\n🧙 *¡{{name}} apareció!*\n━━━━━━━━━━━━━━━━━━━━\nTienes *3 minutos* para comprar algo especial:\n\n{{lines}}\n\n💡 Usa: *mercader comprar <1|2|3>*\n━━━━━━━━━━━━━━━━━━━━',
      { name, lines })
  }
}

export function buyFromMerchant(id, index) {
  const t = getNpcLang(id)
  const u = getPlayerState(id)
  if (!u?.npcState?.merchantOffer) return { error: t.mercader_no_disponible || '🧙 El mercader no está disponible ahora.' }

  if (Date.now() > (u.npcState.merchantExpires || 0)) {
    u.npcState.merchantOffer = null
    setPlayerState(id, u)
    return { error: t.mercader_se_fue || '⏰ El mercader ya se fue. Quizás vuelva más tarde.' }
  }

  const idx = parseInt(index) - 1
  const offer = u.npcState.merchantOffer
  if (isNaN(idx) || idx < 0 || idx >= offer.length) {
    return { error: t.mercader_num_invalido || '❌ Número inválido. Elige entre 1, 2 o 3.' }
  }

  const item  = offer[idx]
  const saldo = u.money || 0

  if (saldo < item.cost) {
    return { error: tpl(t.mercader_sin_diamantes || '❌ Sin diamantes. Necesitas *{{costo}}💎*, tienes *{{saldo}}💎*.', { costo: item.cost, saldo }) }
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
        tpl(t.mercader_mapa_tesoro ||
          '🗺️ *¡El mapa llevó a un tesoro!*\n\n💎 Encontraste *{{recompensa}} diamantes* escondidos.\n💰 Saldo restante: *{{saldoFinal}}*',
        { recompensa: reward.toLocaleString(), saldoFinal: (saldo - item.cost + reward).toLocaleString() })
    }
  } else {
    addItem(id, item.key, 1)
  }

  u.npcState.merchantOffer = null
  setPlayerState(id, u)

  return {
    success: true,
    message:
      tpl(t.mercader_comprado ||
        '{{emoji}} *¡Comprado a {{nombre}}!*\n\nItem: *{{item}}*\n💎 Pagaste: *{{costo}}*\n💰 Saldo restante: *{{saldo}}*',
        { emoji: item.emoji, nombre: u.npcState?.merchantName || 'el Mercader', item: item.nombre, costo: item.cost, saldo: saldo - item.cost })
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
  const t = getNpcLang(id)
  const u = getPlayerState(id)
  if (!u) return null
  if ((u.bountyStars || 0) < 4) return null
  if (u.isCaptured) return null

  const lastJudge = u.npcState?.lastJudge || 0
  if (Date.now() - lastJudge < JUDGE_COOLDOWN) return null

  if (!u.npcState) u.npcState = {}
  u.npcState.judgeActive  = true
  u.npcState.judgeName    = pick(getNpcNames(id, ['juez_nombres']))
  u.npcState.lastJudge    = Date.now()
  setPlayerState(id, u)

  const opciones =
    '1️⃣ *juez pagar* — ' + (t.juez_opt_pagar || 'Paga multa x3 y quedas libre') + '\n' +
    '2️⃣ *juez mision* — ' + (t.juez_opt_mision || 'Misión de redención (sin crimen 2h)') + '\n' +
    '3️⃣ *juez huir* — ' + (t.juez_opt_huir || 'Huir (50% éxito, si fallas te captura)')

  return {
    name: u.npcState.judgeName,
    message:
      tpl(t.juez_encontro ||
        '\n\n⚖️ *¡{{name}} te encontró!*\n━━━━━━━━━━━━━━━━━━━━\nTienes *{{estrellas}}⭐* de búsqueda. Debes responder:\n\n{{opciones}}\n━━━━━━━━━━━━━━━━━━━━',
      { name: u.npcState.judgeName, estrellas: u.bountyStars, opciones })
  }
}

export function judgeAction(id, action) {
  const t = getNpcLang(id)
  const u = getPlayerState(id)
  if (!u?.npcState?.judgeActive) return { error: t.juez_no_presente || '⚖️ El Juez no está presente.' }

  const fine     = (u.bountyFine || 0) * 3
  const judgeName = u.npcState.judgeName || 'El Juez'

  if (action === 'pagar') {
    if ((u.money || 0) < fine) {
      return { error: tpl(t.juez_sin_dinero || '❌ No tienes suficiente. La multa es *{{multa}}💎* y tienes *{{saldo}}💎*.', { multa: fine, saldo: u.money || 0 }) }
    }
    removeMoney(id, fine)
    clearBounty(id)
    u.npcState.judgeActive = false
    setPlayerState(id, u)
    return {
      success: true,
      message:
        tpl(t.juez_pago_ok ||
          '⚖️ *{{name}} acepta el pago.*\n\n💎 Pagaste *{{multa}}* diamantes.\n✅ Tu bounty fue eliminado. Eres libre.',
        { name: judgeName, multa: fine.toLocaleString() })
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
        tpl(t.juez_mision_ok ||
          '📋 *Misión de redención aceptada.*\n\n*{{name}}* te da 2 horas para demostrar que cambiaste.\n✅ Bounty suspendido. Si haces un crimen en este tiempo, vuelve todo.\n⏱️ Duración: *2 horas*',
        { name: judgeName })
    }
  }

  if (action === 'huir') {
    if (Math.random() < 0.5) {
      u.npcState.judgeActive = false
      setPlayerState(id, u)
      return {
        success: true,
        message:
          tpl(t.juez_escapaste ||
            '🏃 *¡Escapaste del Juez!*\n\n*{{name}}* no pudo atraparte... por ahora.\n⚠️ Volverá. Y la próxima multa será mayor.',
          { name: judgeName })
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
        tpl(t.juez_atrapado ||
          '⛓️ *¡El Juez te atrapó!*\n\nLa fuga falló. *{{name}}* te encadenó.\n🚨 +1 estrella de bounty • +300💎 de multa\n📣 Usa: *rescate pedir*',
        { name: judgeName })
    }
  }

  return { error: t.juez_accion_invalida || '❓ Acción inválida. Usa: pagar | mision | huir' }
}

export function checkUndeadTrigger(id) {
  const t = getNpcLang(id)
  const u = getPlayerState(id)
  if (!u) return null
  if (u.isCaptured) return null
  if ((u.hp || 100) >= (u.maxHp || 100) * 0.3) return null

  const lastUndead = u.npcState?.lastUndead || 0
  if (Date.now() - lastUndead < UNDEAD_COOLDOWN) return null
  if (Math.random() > 0.30) return null

  const name = pick(getNpcNames(id, ['undead_nombres']))
  if (!u.npcState) u.npcState = {}
  u.npcState.undeadActive = true
  u.npcState.undeadName   = name
  u.npcState.lastUndead   = Date.now()
  setPlayerState(id, u)

  return {
    name,
    message:
      tpl(t.undead_detecto ||
        '\n\n🧟 *¡{{name}} detectó tu debilidad!*\n━━━━━━━━━━━━━━━━━━━━\nTu HP está en *{{hp}}/{{maxHp}}*. Tienes una oferta oscura:\n\n💀 Te cura al *100% de HP* ahora mismo.\n⚠️ A cambio, por *1 hora* ganas *50% menos EXP*.\n\n• *muerto aceptar* — Acepta el trato\n• *muerto rechazar* — Rechazar\n━━━━━━━━━━━━━━━━━━━━',
      { name, hp: u.hp, maxHp: u.maxHp })
  }
}

export function undeadAction(id, action) {
  const t = getNpcLang(id)
  const u = getPlayerState(id)
  if (!u?.npcState?.undeadActive) return { error: t.undead_no_aqui || '🧟 El Muerto Viviente no está aquí.' }

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
        tpl(t.undead_trato_ok ||
          '🧟 *Trato aceptado con {{name}}.*\n\n❤️ HP restaurado: *{{hpAntes}}* → *{{maxHp}}*\n⚠️ Penalización: *-50% EXP* por 1 hora.\n💀 Tu alma le pertenece... temporalmente.',
        { name, hpAntes, maxHp: u.maxHp })
    }
  }

  u.npcState.undeadActive = false
  setPlayerState(id, u)
  return {
    success: false,
    message: tpl(t.undead_rechazaste || '💪 Rechazaste a *{{name}}*.\nSiguió su camino... por ahora.', { name })
  }
}

export function callSpy(id, targetId) {
  const t = getNpcLang(id)
  const u = getPlayerState(id)
  if (!u) return { error: t.usuario_no_encontrado || 'Usuario no encontrado.' }
  if ((u.money || 0) < SPY_COST) {
    return { error: tpl(t.espia_sin_dinero || '❌ El espía cobra *{{costo}}💎*. Tienes *{{saldo}}💎*.', { costo: SPY_COST, saldo: u.money || 0 }) }
  }

  const target = getPlayerState(targetId)
  if (!target) return { error: t.espia_objetivo_no_encontrado || '❌ Objetivo no encontrado.' }

  removeMoney(id, SPY_COST)

  const spyName  = pick(getNpcNames(id, ['espia_nombres']))
  const hunterNear = target.hunterTracking?.hunterActive || false
  const captured   = target.isCaptured || false
  const bounty     = target.bountyStars || 0
  const hp         = target.hp || 100
  const maxHp      = target.maxHp || 100
  const hpPct      = Math.round((hp / maxHp) * 100)

  return {
    success: true,
    message:
      tpl(t.espia_informe ||
        '🕵️ *Informe de {{nombre}}*\n━━━━━━━━━━━━━━━━━━━━\n🎯 Objetivo: @{{objetivo}}\n❤️ HP: *{{hp}}/{{maxHp}}* ({{hpPct}}%)\n🚨 Bounty: *{{bounty}}*\n⛓️ Estado: *{{estado}}*\n🎯 Cazador cerca: *{{cazador}}*\n━━━━━━━━━━━━━━━━━━━━\n💎 Pagaste: *{{costo}}*',
        {
          nombre: spyName,
          objetivo: targetId.split('@')[0],
          hp, maxHp,
          hpPct,
          bounty: bounty ? '⭐'.repeat(bounty) : '—',
          estado: captured ? (t.estado_capturado || 'Capturado') : (t.estado_libre || 'Libre'),
          cazador: hunterNear ? (t.cazador_si || 'Sí ⚠️') : (t.cazador_no || 'No ✅'),
          costo: SPY_COST
        })
  }
}

export function checkGambler(id) {
  const t = getNpcLang(id)
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
      t.apostador_aparecio ||
      '\n\n🎰 *¡El Apostador apareció!*\n━━━━━━━━━━━━━━━━━━━━\nTe desafía a una apuesta. Elige:\n\n• *apostar <cantidad>* — Apuesta diamantes (mín 100)\n• *apostar exp <cantidad>* — Apuesta EXP\n\n🎲 Si ganas: recibes el *doble*\n💀 Si pierdes: pierdes todo lo apostado\n━━━━━━━━━━━━━━━━━━━━'
  }
}

export function gamblerBet(id, type, amount) {
  const t = getNpcLang(id)
  const u = getPlayerState(id)
  if (!u?.npcState?.gamblerActive) return { error: t.apostador_no_aqui || '🎰 El Apostador ya no está aquí.' }

  const amt = parseInt(amount)
  if (isNaN(amt) || amt < 100) return { error: t.apostador_minima || '❌ Apuesta mínima: 100.' }

  if (type === 'exp') {
    if ((u.exp || 0) < amt) return { error: tpl(t.apostador_sin_exp || '❌ No tienes suficiente EXP. Tienes *{{exp}}*.', { exp: u.exp || 0 }) }
    u.npcState.gamblerActive = false
    setPlayerState(id, u)
    if (Math.random() < 0.45) {
      addExp(id, amt)
      return { success: true, won: true, message: tpl(t.apostador_ganaste_exp || '🎲 *¡Ganaste!*\n⭐ +*{{monto}} EXP* (doble de lo apostado)', { monto: amt.toLocaleString() }) }
    }
    removeExp(id, amt)
    return { success: true, won: false, message: tpl(t.apostador_perdiste_exp || '🎲 *Perdiste.*\n⭐ -*{{monto}} EXP*', { monto: amt.toLocaleString() }) }
  }

  if ((u.money || 0) < amt) return { error: tpl(t.apostador_sin_dinero || '❌ No tienes suficiente. Tienes *{{saldo}}💎*.', { saldo: u.money || 0 }) }
  u.npcState.gamblerActive = false
  setPlayerState(id, u)
  if (Math.random() < 0.45) {
    addMoney(id, amt)
    return { success: true, won: true, message: tpl(t.apostador_ganaste_dinero || '🎲 *¡Ganaste!*\n💎 +*{{monto}} diamantes* (doble de lo apostado)', { monto: amt.toLocaleString() }) }
  }
  removeMoney(id, amt)
  return { success: true, won: false, message: tpl(t.apostador_perdiste_dinero || '🎲 *Perdiste.*\n💎 -*{{monto}} diamantes*', { monto: amt.toLocaleString() }) }
}

export function getNpcState(id) {
  return getPlayerState(id)?.npcState || {}
}

const VAGRANT_COOLDOWN  = 25 * 60 * 1000
const VAGRANT_CHANCE    = 0.20
const VAGRANT_WINDOW    = 4 * 60 * 1000
const VAGRANT_CURSE_MS  = 30 * 60 * 1000

const VAGRANT_REQUESTS = [
  { type: 'exp',   amount: 300,  emoji: '⭐' },
  { type: 'exp',   amount: 500,  emoji: '⭐' },
  { type: 'money', amount: 200,  emoji: '💎' },
  { type: 'money', amount: 400,  emoji: '💎' },
]

function vagrantLabel(t, request) {
  return request.type === 'exp'
    ? (t.recurso_exp || 'EXP')
    : (t.recurso_diamantes || 'diamantes')
}

export function checkVagrantTrigger(id) {
  const t = getNpcLang(id)
  const u = getPlayerState(id)
  if (!u) return null
  if (u.isCaptured) return null

  const lastVagrant = u.npcState?.lastVagrant || 0
  if (Date.now() - lastVagrant < VAGRANT_COOLDOWN) return null
  if (Math.random() > VAGRANT_CHANCE) return null

  const request  = VAGRANT_REQUESTS[Math.floor(Math.random() * VAGRANT_REQUESTS.length)]
  const name     = pick(getNpcNames(id, ['vagabundo_nombres']))
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
      tpl(t.vagabundo_aparecio ||
        '\n\n🧓 *¡{{name}} apareció!*\n━━━━━━━━━━━━━━━━━━━━\nTe mira con ojos cansados y dice:\n_"¿Podrías darme {{emoji}} *{{cantidad}} {{recurso}}*? Te lo agradeceré..."_\n\n🎲 50% te devuelve el *doble*\n💨 50% desaparece con lo tuyo\n⚠️ Ignorarlo 3 veces trae mala suerte\n\n• *vagabundo dar* — Ayudarlo\n• *vagabundo ignorar* — Ignorarlo\n━━━━━━━━━━━━━━━━━━━━',
      { name, emoji: request.emoji, cantidad: request.amount, recurso: vagrantLabel(t, request) })
  }
}

export function vagrantAction(id, action) {
  const t = getNpcLang(id)
  const u = getPlayerState(id)
  if (!u?.npcState?.vagrantActive) return { error: t.vagabundo_no_aqui || '🧓 No hay ningún vagabundo aquí ahora.' }

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
          tpl(t.vagabundo_maldicion ||
            '⏰ *El vagabundo esperó y se fue.*\n\n😤 *{{name}}* se cansó de ser ignorado.\n💀 *¡Te maldijo!* -20% EXP ganada por 30 minutos.',
          { name: u.npcState.vagrantName || 'El vagabundo' })
      }
    }

    return { error: tpl(t.vagabundo_se_fue || '⏰ El vagabundo ya se fue. Lo has ignorado *{{veces}}*/3 veces.', { veces: u.npcState.vagrantIgnores }) }
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
          tpl(t.vagabundo_maldicion_ignorar ||
            '😤 Ignoraste a *{{name}}*.\n\n💀 *¡Maldición!* Has ignorado al vagabundo 3 veces.\n-20% EXP ganada por *30 minutos*.',
          { name })
      }
    }

    return {
      ignored: true,
      message:
        tpl(t.vagabundo_ignorado ||
          '😶 Ignoraste a *{{name}}*.\nSe alejó murmurando...\n⚠️ Lo has ignorado *{{veces}}*/3 veces.',
        { name, veces: u.npcState.vagrantIgnores })
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
          tpl(t.vagabundo_sin_recursos ||
            '❌ No tienes suficiente {{emoji}} *{{recurso}}*.\nNecesitas *{{cantidad}}* y no alcanza.\n*{{name}}* se fue triste.',
          { emoji: request.emoji, recurso: vagrantLabel(t, request), cantidad: request.amount, name })
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
          tpl(t.vagabundo_sabio ||
            '🧓 *{{name}}* te mira agradecido...\n\n✨ _"Eres muy generoso. Que el destino te recompense."_\n\n🎉 *¡El vagabundo era un sabio disfrazado!*\n{{emoji}} Te devolvió el *doble*: +*{{recompensa}} {{recurso}}*\n💰 Ganaste *{{ganancia}} {{recurso}}* netos.',
          { name, emoji: request.emoji, recompensa: reward, recurso: vagrantLabel(t, request), ganancia: request.amount })
      }
    }

    return {
      success: true,
      won: false,
      message:
        tpl(t.vagabundo_desaparece ||
          '🧓 *{{name}}* toma lo que le diste...\n\n💨 _"Gracias... quizás nos veamos de nuevo."_\n\nSe desvanece entre las sombras con tus *{{cantidad}} {{recurso}}*.\n😅 Esta vez no hubo suerte.',
        { name, cantidad: request.amount, recurso: vagrantLabel(t, request) })
    }
  }

  return { error: t.vagabundo_uso || '💡 Usa: *vagabundo dar* | *vagabundo ignorar*' }
}