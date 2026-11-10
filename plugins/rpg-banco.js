import { getUserStats, setUserStats } from '../lib/stats.js'
import { LIMITES } from '../lib/antiCheat.js'
import { idCanonico, mismoUsuario } from '../lib/identidad.js'
import { resolveRealJidDeLid } from '../lib/funcion/pluginHelper.js'
import {
  MONEDAS,
  CAMPOS_BANCO,
  normalizarMoneda,
  parseCantidad,
  formatearNumero as nf,
  asegurarBanco,
  calcularInteres,
  calcularDeposito,
  calcularRetiro,
  construirPanel,
  construirAyuda,
  construirTop,
  msRestantes
} from '../lib/funcion/banco-utils.js'

const COOLDOWN_INTERES_MS = 24 * 60 * 60 * 1000

function responder(conn, m, texto) {
  return conn.sendMessage(m.chat, { text: texto }, { quoted: m })
}

function saldoBilletera(stats, campo) {
  return Number(stats?.[campo] || 0)
}

function resolverMonedaCantidad(args) {
  const resto = args.filter((a) => !String(a).startsWith('@'))
  const moneda = resto.map((a) => normalizarMoneda(a)).find(Boolean) || null
  const cantidad = resto.map((a) => parseCantidad(a)).find((v) => v !== null) || null
  return { moneda, cantidad }
}

async function depositar(conn, m, stats, args) {
  const { moneda, cantidad } = resolverMonedaCantidad(args)
  if (!cantidad) return responder(conn, m, `🏦 *DEPOSITAR*\n\n> 💡 Ejemplo: *.banco depositar 2000 exp* o *.banco depositar todo money*\n> Monedas: *money* (diamantes), *exp*, *mysticcoins*, *lunaCoins*.`)

  const banco = asegurarBanco(stats.banco)

  const destinos = moneda ? [moneda] : (cantidad === 'all' ? [...CAMPOS_BANCO] : ['money'])
  let total = 0
  const lineas = []
  for (const campo of destinos) {
    const meta = MONEDAS[campo]
    const res = calcularDeposito({
      billetera: saldoBilletera(stats, campo),
      guardado: banco[campo] || 0,
      cantidad,
      limite: LIMITES[campo]
    })
    if (res.monto <= 0) continue
    stats[campo] = res.billetera
    banco[campo] = res.guardado
    total += res.monto
    lineas.push(`> ${meta.emoji} *${nf(res.monto)}* ${meta.corto} → banco *${nf(banco[campo])}*`)
  }

  if (!total) {
    const motivo = moneda
      ? `> ⚠️ No tenés *${MONEDAS[moneda].corto}* en la billetera o el banco ya está lleno.`
      : '> ⚠️ No tenés nada para depositar en la billetera.'
    return responder(conn, m, `🏦 *NO SE DEPOSITÓ NADA*\n\n${motivo}`)
  }

  setUserStats(m.sender, stats)
  return responder(conn, m, `✅ *DEPÓSITO*\n\n${lineas.join('\n')}\n\n> 🏦 Tu banco quedó actualizado.\n> 💡 *.banco* para ver el total.`)
}

async function retirar(conn, m, stats, args) {
  const { moneda, cantidad } = resolverMonedaCantidad(args)
  if (!cantidad) return responder(conn, m, `🏦 *RETIRAR*\n\n> 💡 Ejemplo: *.banco retirar 500 money* o *.banco retirar todo exp*\n> Monedas: *money* (diamantes), *exp*, *mysticcoins*, *lunaCoins*.`)

  const banco = asegurarBanco(stats.banco)
  const destinos = moneda ? [moneda] : (cantidad === 'all' ? [...CAMPOS_BANCO] : ['money'])
  let total = 0
  const lineas = []
  const avisos = []

  for (const campo of destinos) {
    const meta = MONEDAS[campo]
    const guardado = banco[campo] || 0
    const res = calcularRetiro({
      billetera: saldoBilletera(stats, campo),
      guardado,
      cantidad,
      limite: LIMITES[campo]
    })
    if (cantidad !== 'all' && res.monto < cantidad && guardado >= cantidad) {
      avisos.push(`> ⚠️ De *${meta.corto}* solo podés retirar *${nf(res.cupo)}* (límite del bot).`)
    }
    if (res.monto <= 0) continue
    banco[campo] = res.guardado
    stats[campo] = res.billetera
    total += res.monto
    lineas.push(`> ${meta.emoji} *${nf(res.monto)}* ${meta.corto} → billetera *${nf(stats[campo])}*`)
  }

  if (!total) {
    const motivo = moneda
      ? `> ⚠️ No tenés *${MONEDAS[moneda].corto}* en el banco o ya llegaste al límite de la billetera.`
      : '> ⚠️ No tenés nada guardado en el banco.'
    return responder(conn, m, `🏦 *NO SE RETIRÓ NADA*\n\n${motivo}`)
  }

  setUserStats(m.sender, stats)
  return responder(conn, m, `✅ *RETIRO*\n\n${lineas.join('\n')}\n${avisos.length ? avisos.join('\n') + '\n' : ''}\n> 👛 Ya está en tu billetera.`)
}

async function transferir(conn, m, stats, args) {
  const mencion = m.mentionedJid?.[0] || null
  const destino = mencion ? (idCanonico(mencion) || mencion) : null
  if (!destino || mismoUsuario(destino, m.sender)) {
    return responder(conn, m, `🏦 *TRANSFERIR*\n\n> 💡 Ejemplo: *.banco transferir 500 money @usuario*\n> Se transfiere desde tu banco al banco del otro usuario.`)
  }
  const { moneda, cantidad } = resolverMonedaCantidad(args)
  if (!cantidad || cantidad === 'all') {
    return responder(conn, m, '🏦 *TRANSFERIR*\n\n> 💡 Indicá una cantidad exacta: *.banco transferir 500 money @usuario*')
  }
  const campo = moneda || 'money'
  const meta = MONEDAS[campo]
  const banco = asegurarBanco(stats.banco)
  if ((banco[campo] || 0) < cantidad) {
    return responder(conn, m, `❌ No tenés *${nf(cantidad)}* ${meta.corto} en el banco.\n> 🏦 Guardado: *${nf(banco[campo] || 0)}*`)
  }
  const destinoStats = getUserStats(destino)
  const bancoDestino = asegurarBanco(destinoStats.banco)
  if ((bancoDestino[campo] || 0) + cantidad > (LIMITES[campo] || 0)) {
    return responder(conn, m, '❌ El banco del destinatario está lleno para esa moneda.')
  }
  banco[campo] -= cantidad
  bancoDestino[campo] = (bancoDestino[campo] || 0) + cantidad
  setUserStats(m.sender, stats)
  setUserStats(destino, destinoStats)

  const real = resolveRealJidDeLid(destino)
  const etiqueta = String(real).includes('@lid') ? 'el usuario' : `@${String(real).split('@')[0]}`
  return conn.sendMessage(m.chat, {
    text: `✅ *TRANSFERENCIA*\n\n> ${meta.emoji} *${nf(cantidad)}* ${meta.corto}\n> 🔁 De tu banco al banco de ${etiqueta}\n> 🏦 Te quedan *${nf(banco[campo])}*`,
    mentions: String(real).includes('@lid') ? [] : [real]
  }, { quoted: m })
}

async function cobrarInteres(conn, m, stats) {
  const banco = asegurarBanco(stats.banco)
  const ahora = Date.now()
  const pasado = ahora - (banco.lastInterest || 0)
  if (pasado < COOLDOWN_INTERES_MS) {
    return responder(conn, m, `⏳ *INTERÉS*\n\n> 🕐 Ya cobraste hoy.\n> ⏳ Próximo cobro en *${msRestantes(COOLDOWN_INTERES_MS - pasado)}*.`)
  }
  const interes = calcularInteres(banco)
  if (!interes.money && !interes.exp) {
    return responder(conn, m, `📈 *INTERÉS*\n\n> 💤 Todavía no generás interés.\n> 💡 Depositá diamantes o EXP con *.banco depositar*.`)
  }
  banco.money = Math.min((LIMITES.money || 0), (banco.money || 0) + interes.money)
  banco.exp = Math.min((LIMITES.exp || 0), (banco.exp || 0) + interes.exp)
  banco.lastInterest = ahora
  setUserStats(m.sender, stats)
  return responder(conn, m, `🎁 *INTERÉS COBRADO*\n\n> 💎 *+${nf(interes.money)}* diamantes\n> ⭐ *+${nf(interes.exp)}* EXP\n> 🏦 Ya están en tu banco\n> ⏳ Próximo cobro en *24 h*`)
}

async function top(conn, m) {
  const usuarios = global.db?.data?.users || {}
  const lista = []
  for (const [jid, datos] of Object.entries(usuarios)) {
    if (!jid.endsWith('@s.whatsapp.net')) continue
    const guardado = Number(datos?.banco?.money || 0)
    if (guardado <= 0) continue
    let nombre = ''
    try {
      nombre = conn.getName?.(jid) || ''
    } catch {
      nombre = ''
    }
    if (!nombre || /^[\d\s@.:+-]+$/.test(String(nombre))) nombre = jid.split('@')[0]
    lista.push({ nombre: String(nombre).slice(0, 24), money: guardado })
  }
  lista.sort((a, b) => b.money - a.money)
  return responder(conn, m, construirTop(lista.slice(0, 10)))
}

const handler = async (m, { conn, args, usedPrefix }) => {
  const sub = String(args[0] || '').toLowerCase()
  const stats = getUserStats(m.sender)
  const banco = asegurarBanco(stats.banco)
  const pasado = Date.now() - (banco.lastInterest || 0)
  const interesListo = pasado >= COOLDOWN_INTERES_MS

  if (['depositar', 'dep', 'deposito', 'guardar', 'meter'].includes(sub)) {
    return depositar(conn, m, stats, args.slice(1))
  }
  if (['retirar', 'ret', 'retiro', 'sacar', 'saca'].includes(sub)) {
    return retirar(conn, m, stats, args.slice(1))
  }
  if (['transferir', 'transfer', 'enviar', 'pasar'].includes(sub)) {
    return transferir(conn, m, stats, args.slice(1))
  }
  if (['interes', 'intereses', 'cobrar', 'reclamar', 'ganancia'].includes(sub)) {
    return cobrarInteres(conn, m, stats)
  }
  if (['top', 'ranking', 'lb', 'mejores'].includes(sub)) {
    return top(conn, m)
  }
  if (['ayuda', 'help', '?', 'comandos'].includes(sub)) {
    return responder(conn, m, construirAyuda(usedPrefix || '.'))
  }

  const nombre = (() => {
    try {
      return conn.getName?.(m.sender) || ''
    } catch {
      return ''
    }
  })()
  return responder(conn, m, construirPanel({
    stats,
    banco,
    nombre,
    interes: calcularInteres(banco),
    interesListo,
    proximoInteres: msRestantes(Math.max(0, COOLDOWN_INTERES_MS - pasado))
  }))
}

handler.help = ['banco', 'banco depositar <cantidad> <moneda>', 'banco retirar <cantidad> <moneda>', 'banco transferir <cantidad> <moneda> @usuario', 'banco interes', 'banco top']
handler.tags = ['rpg']
handler.command = /^(banco|bank|bancoluna)$/i

export default handler
