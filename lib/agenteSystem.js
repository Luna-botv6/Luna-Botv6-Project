import { getUserStats, setUserStats, getExp, getMoney, removeExp, removeMoney, addExp, addMoney } from './stats.js'

export const COSTO = { money: 5000, exp: 3000 }
export const DURACION_MS = 72 * 60 * 60 * 1000
export const PERDIDA_RESCATE = 0.10
export const DEFENSA_ROBO = 0.60
export const REDUCCION_AMENAZA = 0.30
export const BONUS_ESCAPE = 0.15
export const CHANCE_TOTEM = 0.45

const AGENTES = [
  { nombre: 'Kael', emoji: '🗡️', lema: 'No vas a caer mientras yo siga de pie.' },
  { nombre: 'Nyx', emoji: '🖤', lema: 'Camino dos pasos atrás tuyo. Siempre.' },
  { nombre: 'Sable', emoji: '🌑', lema: 'Los que te buscan no saben que yo existo.' },
  { nombre: 'Runa', emoji: '🐺', lema: 'Mi vida por la tuya. Así de simple.' },
  { nombre: 'Dante', emoji: '⚔️', lema: 'Mientras respire, nadie te toca.' },
  { nombre: 'Vega', emoji: '🦅', lema: 'Te cubro la espalda, vos seguí adelante.' }
]

function ahora() {
  return Date.now()
}

function elegirAgente() {
  return AGENTES[Math.floor(Math.random() * AGENTES.length)]
}

export function normalizarAgente(agente) {
  if (!agente || typeof agente !== 'object') return null
  return {
    nombre: agente.nombre || 'Agente',
    emoji: agente.emoji || '🕵️',
    lema: agente.lema || '',
    estado: agente.estado || 'activo',
    desde: Number(agente.desde || 0),
    expira: Number(agente.expira || 0),
    rescates: Number(agente.rescates || 0),
    totemRegalado: !!agente.totemRegalado,
    totemUsado: !!agente.totemUsado
  }
}

export function estadoAgente(id) {
  const u = getUserStats(id)
  const agente = normalizarAgente(u?.agente)
  if (!agente) return { estado: 'ninguno', agente: null, activo: false, restanteMs: 0 }
  if (agente.estado === 'activo' && agente.expira <= ahora()) {
    agente.estado = 'vencido'
    return { estado: 'vencido', agente, activo: false, restanteMs: 0 }
  }
  const activo = agente.estado === 'activo'
  return { estado: agente.estado, agente, activo, restanteMs: activo ? Math.max(0, agente.expira - ahora()) : 0 }
}

export function agenteActivo(id) {
  const { activo, agente } = estadoAgente(id)
  return activo ? agente : null
}

export function factorAmenaza(id) {
  return agenteActivo(id) ? 1 - REDUCCION_AMENAZA : 1
}

export function bonusEscape(id) {
  return agenteActivo(id) ? BONUS_ESCAPE : 0
}

export function defensaRobo(id) {
  const agente = agenteActivo(id)
  if (!agente) return null
  return { factor: 1 - DEFENSA_ROBO, agente, porcentaje: Math.round(DEFENSA_ROBO * 100) }
}

export function contratarAgente(id) {
  const u = getUserStats(id)
  if (!u) return { ok: false, motivo: 'sin_ficha' }
  const previo = normalizarAgente(u.agente)
  if (previo && previo.estado === 'activo' && previo.expira > ahora()) {
    return { ok: false, motivo: 'activo', agente: previo }
  }

  const money = getMoney(id)
  const exp = getExp(id)
  if (money < COSTO.money || exp < COSTO.exp) {
    return { ok: false, motivo: 'fondos', money, exp, faltaMoney: Math.max(0, COSTO.money - money), faltaExp: Math.max(0, COSTO.exp - exp) }
  }

  removeMoney(id, COSTO.money)
  removeExp(id, COSTO.exp)

  const base = elegirAgente()
  const actual = getUserStats(id)
  let totem = 0
  if ((actual.inventory?.totem || 0) <= 0 && Math.random() < CHANCE_TOTEM) {
    actual.inventory = actual.inventory || {}
    actual.inventory.totem = (actual.inventory.totem || 0) + 1
    totem = 1
  }
  actual.agente = {
    nombre: base.nombre,
    emoji: base.emoji,
    lema: base.lema,
    estado: 'activo',
    desde: ahora(),
    expira: ahora() + DURACION_MS,
    rescates: previo?.rescates || 0,
    totemRegalado: totem > 0 ? true : !!previo?.totemRegalado,
    totemUsado: false
  }
  setUserStats(id, actual)
  return { ok: true, agente: actual.agente, totem, costo: { ...COSTO } }
}

export function despedirAgente(id) {
  const u = getUserStats(id)
  const agente = normalizarAgente(u?.agente)
  if (!agente || agente.estado !== 'activo' || agente.expira <= ahora()) return null
  u.agente = { ...agente, estado: 'despedido', expira: ahora() }
  setUserStats(id, u)
  return agente
}

export function rescateDelAgente(id, contexto = 'cazador') {
  const u = getUserStats(id)
  if (!u) return null
  const agente = agenteActivo(id)
  if (!agente) return null

  const expAntes = Number(u.exp || 0)
  const moneyAntes = Number(u.money || 0)
  const lostExp = Math.floor(expAntes * PERDIDA_RESCATE)
  const lostMoney = Math.floor(moneyAntes * PERDIDA_RESCATE)

  u.exp = Math.max(0, expAntes - lostExp)
  u.money = Math.max(0, moneyAntes - lostMoney)
  u.isCaptured = false
  u.hunterTracking = u.hunterTracking || {}
  u.hunterTracking.capturedByHunter = false
  u.hunterTracking.hunterActive = false
  u.hunterTracking.escapedAt = ahora()
  u.hp = u.maxHp || 100
  u.agente = { ...agente, estado: 'caido', caidoEn: ahora(), motivo: contexto, rescates: (agente.rescates || 0) + 1 }
  setUserStats(id, u)

  return {
    agente: { ...agente },
    lostExp,
    lostMoney,
    mensaje:
      `🛡️ *${agente.emoji} ${agente.nombre} se metió en medio.*\n\n` +
      `El cazador ya te tenía. Sentiste el filo en la nuca... y después nada.\n` +
      `*${agente.nombre}* lo detuvo con el cuerpo.\n\n` +
      `_«${agente.lema || 'No vas a caer mientras yo siga de pie.'}»_\n\n` +
      `⚔️ *${agente.nombre} cayó por vos.* Su contrato termina hoy.\n` +
      `📉 Perdiste solo *${lostExp.toLocaleString()} EXP* y *${lostMoney.toLocaleString()} 💎* (10% en vez del 50%).\n` +
      `🕊️ Te dejó libre... y se quedó él.\n\n` +
      `> 💡 Contratar otro: *.contratar agente*`
  }
}

export function msBonito(ms) {
  if (ms <= 0) return '0 min'
  const minutos = Math.ceil(ms / 60000)
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas <= 0) return `${resto} min`
  return `${horas} h ${resto} min`
}
