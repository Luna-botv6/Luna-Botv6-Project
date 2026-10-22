import fs from 'fs'
import { getPlayerState, setPlayerState, addMoney, addExp, addItem } from '../lib/stats.js'

const COOLDOWN = 5 * 60 * 1000
const PECES = [
  { id: 'sardina', nombre: 'Sardina', emoji: '🐟', valor: 50,  exp: 20,  prob: 0.40 },
  { id: 'trucha',  nombre: 'Trucha',  emoji: '🐠', valor: 120, exp: 40,  prob: 0.25 },
  { id: 'salmon',  nombre: 'Salmón',  emoji: '🐡', valor: 250, exp: 80,  prob: 0.15 },
  { id: 'tiburon', nombre: 'Tiburón', emoji: '🦈', valor: 600, exp: 150, prob: 0.08 },
  { id: 'bota',    nombre: 'Bota',    emoji: '👢', valor: 0,   exp: 5,   prob: 0.12 },
]

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_pesca || {}
  const userId = m.sender
  const u = getPlayerState(userId)
  const now = Date.now()
  const last = u.lastPesca || 0
  if (now - last < COOLDOWN) {
    const rem = COOLDOWN - (now - last)
    const min = Math.ceil(rem / 60000)
    return m.reply(tpl(t.cooldown || '🎣 Estás cansado. Espera *{min} min* para pescar de nuevo.', { min }))
  }

  const r = Math.random()
  let acc = 0
  let pez = PECES[PECES.length - 1]
  for (const p of PECES) {
    acc += p.prob
    if (r <= acc) { pez = p; break }
  }

  u.lastPesca = now
  setPlayerState(userId, u)
  addMoney(userId, pez.valor)
  addExp(userId, pez.exp)
  if (pez.id !== 'bota') addItem(userId, `pez_${pez.id}`, 1)

  const u2 = getPlayerState(userId)
  const itemLine = pez.id !== 'bota' ? tpl(t.item_line || '🎒 Item añadido: {item}\n', { item: `pez_${pez.id}` }) : ''
  return m.reply(tpl(t.resultado || '🎣 *Pesca*\n\nLanzaste la caña... {emoji}\n\nCapturaste: *{pez}* {emoji}\n💎 +{valor} diamantes\n⭐ +{exp} EXP\n{item}\n💰 Saldo: *{saldo}💎*', { emoji: pez.emoji, pez: t['pez_' + pez.id] || pez.nombre, valor: pez.valor, exp: pez.exp, item: itemLine, saldo: u2.money }))
}

handler.help = ['pesca', 'pescar']
handler.tags = ['rpg', 'juegos']
handler.command = ['pesca', 'pescar', 'fish']
handler.group = true

export default handler
