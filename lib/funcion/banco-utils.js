export const MONEDAS = {
  money: { emoji: '💎', nombre: 'Diamantes', corto: 'diamantes' },
  exp: { emoji: '⭐', nombre: 'Experiencia', corto: 'EXP' },
  mysticcoins: { emoji: '🪙', nombre: 'MysticCoins', corto: 'místicos' },
  lunaCoins: { emoji: '🌙', nombre: 'LunaCoins', corto: 'lunas' }
}

const ALIAS = {
  money: ['money', 'dinero', 'diamante', 'diamantes', 'gema', 'gemas', 'gem', 'diam', '$'],
  exp: ['exp', 'xp', 'experiencia', 'punto', 'puntos', 'level', 'nivel'],
  mysticcoins: ['mysticcoins', 'mysticcoin', 'mystic', 'misticos', 'misticas', 'mistico', 'mistica', 'coins'],
  lunaCoins: ['lunacoins', 'lunacoin', 'lunas', 'luna', 'lunita']
}

export const CAMPOS_BANCO = ['money', 'exp', 'mysticcoins', 'lunaCoins']

export const TASAS_INTERES = { money: 0.02, exp: 0.01 }
export const TOPE_INTERES = { money: 25000, exp: 5000 }

export function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function normalizarMoneda(valor) {
  const texto = String(valor || '')
  if (texto.includes('💎')) return 'money'
  if (texto.includes('⭐') || texto.includes('🌟')) return 'exp'
  if (texto.includes('🪙')) return 'mysticcoins'
  if (texto.includes('🌙')) return 'lunaCoins'
  const limpio = normalizarTexto(texto).replace(/[^\w$]/g, '')
  if (!limpio) return null
  for (const [moneda, aliases] of Object.entries(ALIAS)) {
    if (aliases.includes(limpio)) return moneda
  }
  return null
}

export function parseCantidad(valor) {
  const raw = normalizarTexto(valor).replace(/\s+/g, '')
  if (!raw) return null
  if (['todo', 'all', 'max', 'full', 'completo'].includes(raw)) return 'all'
  const match = raw.match(/^(\d[\d.,]*)([km])?$/)
  if (!match) return null
  let numero = match[1]
  if (/^\d{1,3}(\.\d{3})+$/.test(numero)) numero = numero.replace(/\./g, '')
  else if (/^\d{1,3}(,\d{3})+$/.test(numero)) numero = numero.replace(/,/g, '')
  else numero = numero.replace(',', '.')
  if ((numero.match(/\./g) || []).length > 1) return null
  let total = Number(numero)
  if (match[2] === 'k') total *= 1000
  if (match[2] === 'm') total *= 1000000
  total = Math.floor(total)
  return Number.isFinite(total) && total > 0 ? total : null
}

export function formatearNumero(valor) {
  return Number(valor || 0).toLocaleString('es-AR')
}

export function bancoVacio() {
  return { money: 0, exp: 0, mysticcoins: 0, lunaCoins: 0, lastInterest: 0 }
}

export function asegurarBanco(banco) {
  if (!banco || typeof banco !== 'object') return bancoVacio()
  for (const campo of [...CAMPOS_BANCO, 'lastInterest']) {
    if (!Number.isFinite(banco[campo])) banco[campo] = 0
  }
  return banco
}

export function calcularInteres(banco) {
  const base = asegurarBanco(banco || bancoVacio())
  return {
    money: Math.min(Math.floor(base.money * TASAS_INTERES.money), TOPE_INTERES.money),
    exp: Math.min(Math.floor(base.exp * TASAS_INTERES.exp), TOPE_INTERES.exp)
  }
}

export function calcularDeposito({ billetera, guardado, cantidad }) {
  const pedido = cantidad === 'all' ? Number(billetera || 0) : Number(cantidad || 0)
  const monto = Math.max(0, Math.min(pedido, Number(billetera || 0)))
  return { monto, billetera: Number(billetera || 0) - monto, guardado: Number(guardado || 0) + monto }
}

export function calcularRetiro({ billetera, guardado, cantidad }) {
  const pedido = cantidad === 'all' ? Number(guardado || 0) : Number(cantidad || 0)
  const monto = Math.max(0, Math.min(pedido, Number(guardado || 0)))
  return { monto, billetera: Number(billetera || 0) + monto, guardado: Number(guardado || 0) - monto }
}

export function construirPanel({ stats, banco, nombre, interes, interesListo, proximoInteres }) {
  const b = asegurarBanco(banco)
  const f = formatearNumero
  const titulo = nombre ? `BANCO DE ${String(nombre).toUpperCase().slice(0, 24)}` : 'BANCO LUNA'
  const bloques = CAMPOS_BANCO.map((campo) => {
    const meta = MONEDAS[campo]
    const billetera = stats?.[campo] || 0
    const guardado = b[campo] || 0
    const total = billetera + guardado
    return `> ${meta.emoji} *${meta.nombre}*\n> 👛 Billetera: *${f(billetera)}*\n> 🏦 Banco: *${f(guardado)}*\n> 📊 Total: *${f(total)}*`
  })
  const lineaInteres = interesListo
    ? `> 🎁 Interés disponible: *${f(interes.money)}* 💎 + *${f(interes.exp)}* ⭐\n> 💡 Cobralo con *.banco interes*`
    : `> 📈 Interés diario: *2%* en 💎 y *1%* en ⭐\n> ⏳ Próximo cobro en *${proximoInteres || '24 h'}*`
  return `╭━━━━━━━━━━━━━━━━━━━━━━╮\n   🏦 *${titulo}*\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n${bloques.join('\n\n')}\n\n━━━━━━━━━━━━━━━━━━━━━━\n${lineaInteres}\n> 💡 *.banco depositar 2000 exp*\n> 🔒 Lo guardado no se puede robar y no tiene tope.`
}

export function construirAyuda(prefix = '.') {
  return `🏦 *BANCO LUNA — AYUDA*\n\n` +
    `> *${prefix}banco* — ver tu cuenta\n` +
    `> *${prefix}banco depositar 2000 exp* — guardar experiencia\n` +
    `> *${prefix}banco depositar 500 money* — guardar diamantes\n` +
    `> *${prefix}banco depositar todo mysticcoins* — guardar todo\n` +
    `> *${prefix}banco retirar 500 money* — sacar diamantes\n` +
    `> *${prefix}banco transferir 500 money @usuario* — pasar a otro banco\n` +
    `> *${prefix}banco interes* — cobrar el interés del día\n` +
    `> *${prefix}banco top* — ranking del banco\n\n` +
    `> 💡 *money* = diamantes · *mysticcoins* = místicos · *lunaCoins* = lunas\n` +
    `> 📝 También podés usar *2k* o *todo*.`
}

export function construirTop(lista) {
  if (!lista.length) return '🏆 *TOP DEL BANCO*\n\n> Todavía no hay nadie con diamantes guardados.'
  const lineas = lista.map((item, i) => `> ${i + 1}. *${item.nombre}* — 💎 ${formatearNumero(item.money)}`).join('\n')
  return `🏆 *TOP ${lista.length} DEL BANCO*\n\n${lineas}`
}

export function msRestantes(ms) {
  if (ms <= 0) return '0 min'
  const minutos = Math.ceil(ms / 60000)
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas <= 0) return `${resto} min`
  return `${horas} h ${resto} min`
}
