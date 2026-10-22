import fs from 'fs'
import { getPlayerState, setPlayerState, addMoney, removeMoney } from '../lib/stats.js'

const MIN_APUESTA = 100

const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7️⃣', '⭐']

function rollDie() { return Math.floor(Math.random() * 6) + 1 }

const HELP_MSG =
  `🎰 *Casino*\n\n` +
  `📋 *Comandos:*\n` +
  `• *casino dados <cantidad>* — Tirar 2 dados (>=7 gana x2)\n` +
  `• *casino slot <cantidad>* — Tragamonedas (3 iguales x5, 2 iguales x2)\n` +
  `• *casino blackjack <cantidad>* — Blackjack simplificado\n\n` +
  `💰 Apuesta mínima: *${MIN_APUESTA} diamantes*`

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_casino || {}
  const userId = m.sender
  const u = getPlayerState(userId)
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''
  const sub = (args && args[1]) ? args[1].toLowerCase() : ''

  if (!cmd || cmd === 'help' || cmd === 'ayuda') return m.reply(tpl(t.help || HELP_MSG, { min: MIN_APUESTA }))

  // dados
  if (cmd === 'dados' || (cmd === 'casino' && sub === 'dados')) {
    const apuesta = (cmd === 'dados') ? parseInt(args?.[1]) : parseInt(args?.[2])
    if (isNaN(apuesta) || apuesta < MIN_APUESTA) return m.reply(tpl(t.apuesta_minima || '❌ Apuesta mínima: {min}💎', { min: MIN_APUESTA }))
    if ((u.money || 0) < apuesta) return m.reply(tpl(t.saldo_insuficiente || '❌ Saldo insuficiente. Tienes *{saldo}💎*', { saldo: u.money || 0 }))
    removeMoney(userId, apuesta)
    const d1 = rollDie(), d2 = rollDie()
    const suma = d1 + d2
    const gana = suma >= 7
    if (gana) addMoney(userId, apuesta * 2)
    const u2 = getPlayerState(userId)
    const resultado = gana ? tpl(t.ganaste || '🎉 *¡Ganaste!* +{monto}💎', { monto: apuesta * 2 }) : tpl(t.perdiste || '💀 *Perdiste* -{monto}💎', { monto: apuesta })
    return m.reply(tpl(t.dados || '🎲 *Dados*\n\nDado 1: *{d1}* • Dado 2: *{d2}*\nSuma: *{suma}* (necesitas >=7)\n\n{resultado}\n💰 Saldo: *{saldo}💎*', { d1, d2, suma, resultado, saldo: u2.money }))
  }

  // slot
  if (cmd === 'slot' || (cmd === 'casino' && sub === 'slot')) {
    const apuesta = (cmd === 'slot') ? parseInt(args?.[1]) : parseInt(args?.[2])
    if (isNaN(apuesta) || apuesta < MIN_APUESTA) return m.reply(tpl(t.apuesta_minima || '❌ Apuesta mínima: {min}💎', { min: MIN_APUESTA }))
    if ((u.money || 0) < apuesta) return m.reply(tpl(t.saldo_insuficiente || '❌ Saldo insuficiente. Tienes *{saldo}💎*', { saldo: u.money || 0 }))
    removeMoney(userId, apuesta)
    const r1 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
    const r2 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
    const r3 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
    let mult = 0
    if (r1 === r2 && r2 === r3) mult = 5
    else if (r1 === r2 || r2 === r3 || r1 === r3) mult = 2
    if (mult > 0) addMoney(userId, apuesta * mult)
    const u2 = getPlayerState(userId)
    const resultado = mult > 0 ? tpl(t.ganaste || '🎉 *¡Ganaste!* +{monto}💎', { monto: apuesta * mult }) + ` x${mult}` : tpl(t.perdiste || '💀 *Perdiste* -{monto}💎', { monto: apuesta })
    return m.reply(tpl(t.slot || '🎰 *Tragamonedas*\n\n[ {r1} | {r2} | {r3} ]\n\n{resultado}\n💰 Saldo: *{saldo}💎*', { r1, r2, r3, resultado, saldo: u2.money }))
  }

  // blackjack simplificado
  if (cmd === 'blackjack' || (cmd === 'casino' && sub === 'blackjack')) {
    const apuesta = (cmd === 'blackjack') ? parseInt(args?.[1]) : parseInt(args?.[2])
    if (isNaN(apuesta) || apuesta < MIN_APUESTA) return m.reply(tpl(t.apuesta_minima || '❌ Apuesta mínima: {min}💎', { min: MIN_APUESTA }))
    if ((u.money || 0) < apuesta) return m.reply(tpl(t.saldo_insuficiente || '❌ Saldo insuficiente. Tienes *{saldo}💎*', { saldo: u.money || 0 }))
    removeMoney(userId, apuesta)
    const card = () => Math.floor(Math.random() * 11) + 1
    const playerCards = [card(), card()]
    const dealerCards = [card(), card()]
    const playerTotal = playerCards.reduce((a, b) => a + b, 0)
    const dealerTotal = dealerCards.reduce((a, b) => a + b, 0)
    let gana = false
    let empate = false
    if (playerTotal > 21) gana = false
    else if (dealerTotal > 21) gana = true
    else if (playerTotal > dealerTotal) gana = true
    else if (playerTotal === dealerTotal) empate = true
    if (gana) addMoney(userId, apuesta * 2)
    else if (empate) addMoney(userId, apuesta)
    const u2 = getPlayerState(userId)
    const resultado = gana ? tpl(t.ganaste || '🎉 *¡Ganaste!* +{monto}💎', { monto: apuesta * 2 }) : empate ? (t.empate || '🤝 *Empate* (devuelto)') : tpl(t.perdiste || '💀 *Perdiste* -{monto}💎', { monto: apuesta })
    return m.reply(tpl(t.blackjack || '🃏 *Blackjack*\n\nTus cartas: *{player}* = *{playerTotal}*\nDealer: *{dealer}* = *{dealerTotal}*\n\n{resultado}\n💰 Saldo: *{saldo}💎*', { player: playerCards.join(', '), playerTotal, dealer: dealerCards.join(', '), dealerTotal, resultado, saldo: u2.money }))
  }

  return m.reply(tpl(t.help || HELP_MSG, { min: MIN_APUESTA }))
}

handler.help = ['casino']
handler.tags = ['rpg', 'juegos']
handler.command = ['casino', 'blackjack', 'tragamonedas']
handler.group = true

export default handler
