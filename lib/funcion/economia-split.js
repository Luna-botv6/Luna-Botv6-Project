export function totalEconomia(usuario, campo) {
  if (!usuario || typeof usuario !== 'object') return 0
  const billetera = Number.isFinite(Number(usuario[campo])) ? Number(usuario[campo]) : 0
  const banco = usuario.banco && typeof usuario.banco === 'object' ? usuario.banco[campo] : 0
  const guardado = Number.isFinite(Number(banco)) ? Number(banco) : 0
  return Math.max(0, billetera) + Math.max(0, guardado)
}

export function repartirTotal(usuario, campo, total, { forzar = false } = {}) {
  if (!usuario || typeof usuario !== 'object' || !campo) return null
  const valor = Number(total)
  if (!Number.isFinite(valor)) return null
  if (!usuario.banco || typeof usuario.banco !== 'object') usuario.banco = {}
  const billetera = Number.isFinite(Number(usuario[campo])) ? Math.max(0, Number(usuario[campo])) : 0
  const guardado = Number.isFinite(Number(usuario.banco[campo])) ? Math.max(0, Number(usuario.banco[campo])) : 0
  const actual = billetera + guardado
  const objetivo = Math.max(0, Math.floor(valor))
  if (!forzar && objetivo < actual) return null
  if (!forzar && objetivo === actual) return null
  if (guardado > objetivo) {
    return { billetera: 0, banco: objetivo, total: objetivo }
  }
  return { billetera: objetivo - guardado, banco: guardado, total: objetivo }
}
