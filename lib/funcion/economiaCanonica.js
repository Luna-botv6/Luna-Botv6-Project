import { idCanonico, digitos } from '../identidad.js'
import { getUserStats, setUserStats, getTodosLosUsuarios } from '../stats.js'
import { resolveJidToPhone } from './lid-resolver.js'

export function claveEconomia(raw, conn) {
  if (!raw) return null
  const canonico = idCanonico(raw, conn)
  const clave = String(canonico || raw).replace('@s.whatsapp.net', '').replace('@lid', '')
  return clave || null
}

export function clavesDeUsuario(raw, conn) {
  const base = claveEconomia(raw, conn)
  if (!base) return { base: null, variantes: [] }
  const db = getTodosLosUsuarios() || {}
  const variantes = new Set()
  const candidatas = []
  for (const clave of Object.keys(db)) {
    if (!clave.endsWith('@lid')) continue
    try {
      const tel = resolveJidToPhone(clave, conn)
      if (tel && digitos(tel) === digitos(base)) candidatas.push(clave)
    } catch {}
  }
  for (const clave of candidatas) {
    if (clave && clave !== base && db[clave]) variantes.add(clave)
  }
  return { base, variantes: [...variantes] }
}

function maximo(a, b) {
  const na = Number.isFinite(Number(a)) ? Number(a) : 0
  const nb = Number.isFinite(Number(b)) ? Number(b) : 0
  return Math.max(na, nb)
}

function fusionarBanco(principal, extra) {
  const a = principal && typeof principal === 'object' ? principal : {}
  const b = extra && typeof extra === 'object' ? extra : {}
  const salida = { ...a }
  for (const campo of ['money', 'exp', 'mysticcoins', 'lunaCoins']) {
    salida[campo] = maximo(a[campo], b[campo])
  }
  salida.lastInterest = maximo(a.lastInterest, b.lastInterest)
  return salida
}

function fusionarInventario(principal, extra) {
  const a = principal && typeof principal === 'object' ? principal : {}
  const b = extra && typeof extra === 'object' ? extra : {}
  const salida = { ...a }
  for (const [item, cantidad] of Object.entries(b)) {
    salida[item] = maximo(a[item], cantidad)
  }
  return salida
}

export function unificarFichas(raw, conn, { borrar = true } = {}) {
  const { base, variantes } = clavesDeUsuario(raw, conn)
  if (!base) return { ok: false, motivo: 'id_invalido' }
  const db = getTodosLosUsuarios() || {}
  const principal = getUserStats(base)
  if (!principal) return { ok: false, motivo: 'sin_ficha' }
  if (!variantes.length) return { ok: true, base, fusionadas: [], antes: null, despues: principal, sinCambios: true }

  const antes = { money: principal.money, exp: principal.exp, level: principal.level, banco: principal.banco?.money || 0 }
  const fusionadas = []

  for (const clave of variantes) {
    const extra = getUserStats(clave)
    if (!extra) continue
    fusionadas.push({ clave, money: extra.money || 0, exp: extra.exp || 0, level: extra.level || 0, banco: extra.banco?.money || 0 })
    principal.money = maximo(principal.money, extra.money)
    principal.exp = maximo(principal.exp, extra.exp)
    principal.level = maximo(principal.level, extra.level)
    principal.lunaCoins = maximo(principal.lunaCoins, extra.lunaCoins)
    principal.mysticcoins = maximo(principal.mysticcoins, extra.mysticcoins)
    principal.hp = maximo(principal.hp, extra.hp)
    principal.maxHp = maximo(principal.maxHp, extra.maxHp)
    principal.banco = fusionarBanco(principal.banco, extra.banco)
    principal.inventory = fusionarInventario(principal.inventory, extra.inventory)
    if (!principal.agente && extra.agente) principal.agente = extra.agente
    if (borrar) delete db[clave]
  }

  setUserStats(base, principal)
  return {
    ok: true,
    base,
    fusionadas,
    antes,
    despues: { money: principal.money, exp: principal.exp, level: principal.level, banco: principal.banco?.money || 0 }
  }
}

export function unificarTodos(conn) {
  const db = getTodosLosUsuarios() || {}
  const clavesLid = Object.keys(db).filter((clave) => clave.endsWith('@lid'))
  const resultados = []
  for (const clave of clavesLid) {
    let tel = null
    try { tel = resolveJidToPhone(clave, conn) } catch {}
    if (!tel) continue
    const res = unificarFichas(tel + '@s.whatsapp.net', conn)
    if (res.ok && !res.sinCambios) resultados.push(res)
  }
  return resultados
}
