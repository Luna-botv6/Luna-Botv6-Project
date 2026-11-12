import { getUserStats, claveStats } from '../lib/stats.js'
import { movimientos, incidencias, saldoDe } from '../lib/economia-historial.js'
import { formatearNumero as nf } from '../lib/funcion/banco-utils.js'
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js'

const CAMPOS = [
  ['money', '💎 Diamantes'],
  ['exp', '⭐ Experiencia'],
  ['mysticcoins', '🪙 MysticCoins'],
  ['lunaCoins', '🌙 LunaCoins']
]

function fecha(ms) {
  try {
    return new Date(Number(ms)).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '?'
  }
}

const handler = async (m, { conn }) => {
  const objetivo = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
  const clave = claveStats(objetivo)
  if (!clave) return m.reply('❌ No pude identificar a ese usuario.')
  const stats = getUserStats(objetivo)
  const saldo = saldoDe(clave)
  const movs = movimientos(clave, 10)
  const incs = incidencias(clave, 5)
  const telefono = resolveJidToPhone(objetivo, conn)
  const etiqueta = telefono ? `@${telefono}` : (conn.getName?.(objetivo) || 'usuario')

  const lineas = CAMPOS.map(([campo, titulo]) => {
    const billetera = Number(stats?.[campo] || 0)
    const banco = Number(stats?.banco?.[campo] || 0)
    return `> ${titulo}: *${nf(billetera)}* (banco: *${nf(banco)}*)`
  })

  const bloqueMovs = movs.length
    ? movs.map(([at, campo, antes, despues, origen]) => `> ${fecha(at)} · *${campo}* ${nf(antes)} → ${nf(despues)} · _${origen}_`).join('\n')
    : '> Sin movimientos registrados.'

  const bloqueIncs = incs.length
    ? incs.map(([at, origen, detalle]) => `> ${fecha(at)} · *${origen}* · ${detalle}`).join('\n')
    : '> Ninguna.'

  return conn.sendMessage(m.chat, {
    text: `📊 *HISTORIAL ECONOMÍA*\n> 👤 ${etiqueta}\n\n${lineas.join('\n')}\n\n` +
      `⚖️ En revisión: *${stats?.revision ? 'SÍ' : 'no'}*\n` +
      `🚩 Tramposo: *${stats?.tramposo ? 'SÍ' : 'no'}*${stats?.sancionMotivo ? ` (${stats.sancionMotivo})` : ''}\n\n` +
      `🕘 *ÚLTIMOS MOVIMIENTOS*\n${bloqueMovs}\n\n` +
      `🚨 *INCIDENCIAS*\n${bloqueIncs}\n\n` +
      `> 📌 Saldo registrado: ${CAMPOS.map(([campo]) => `${campo}=${nf(saldo?.[campo] || 0)}`).join(' · ')}`,
    mentions: telefono ? [`${telefono}@s.whatsapp.net`] : []
  }, { quoted: m })
}

handler.help = ['historial @usuario']
handler.tags = ['owner']
handler.command = /^(historial|historialeco|ecomovs)$/i
handler.rowner = true
export default handler
