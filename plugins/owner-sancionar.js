import { getUserStats, setUserStats } from '../lib/stats.js'
import { sancionarManual } from '../lib/antiCheat.js'
import { claveEconomia, clavesDeUsuario } from '../lib/funcion/economiaCanonica.js'
import { idCanonico } from '../lib/identidad.js'

const nf = (n) => Number(n || 0).toLocaleString('es-AR')

function resumen(user) {
  return {
    money: Number(user?.money || 0),
    exp: Number(user?.exp || 0),
    level: Number(user?.level || 0),
    banco: Number(user?.banco?.money || 0)
  }
}

const handler = async (m, { conn, args, usedPrefix }) => {
  const bruto = m.mentionedJid?.[0]
    || m.quoted?.sender
    || args.find((a) => /\d{8,}/.test(String(a)))
    || null

  if (!bruto) {
    return m.reply(
      `🚨 *SANCIONAR TRAMPOSO*\n\n` +
      `> Usá: *${usedPrefix}sancionar @usuario [motivo]*\n` +
      `> También citando su mensaje o con el número.\n\n` +
      `_Resetea billetera, EXP, nivel, coins y banco, y lo marca como tramposo._`
    )
  }

  const base = claveEconomia(bruto, conn) || idCanonico(bruto, conn) || bruto
  const motivo = args.filter((a) => !/@/.test(String(a)) && !/\d{8,}/.test(String(a))).join(' ').trim()
    || 'sancion manual por abuso de la economia'

  const { variantes } = clavesDeUsuario(base, conn)
  const claves = [base, ...variantes].filter(Boolean)
  const sancionadas = []

  for (const clave of claves) {
    const user = getUserStats(clave)
    if (!user) continue
    const antes = resumen(user)
    sancionarManual(clave, user, motivo)
    user.banco = { money: 0, exp: 0, mysticcoins: 0, lunaCoins: 0, lastInterest: 0 }
    setUserStats(clave, user)
    sancionadas.push({ clave, antes })
  }

  if (!sancionadas.length) return m.reply('❌ No encontré la ficha de ese usuario.')

  const antes = sancionadas[0].antes
  const lineas = sancionadas.map((s) => `> 🔗 \`${s.clave}\` → 💎 ${nf(s.antes.money)} · 🏦 ${nf(s.antes.banco)} · Nv ${s.antes.level}`)
  return conn.sendMessage(m.chat, {
    text: `🚨 *CUENTA SANCIONADA*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 @${String(base).split('@')[0]}\n` +
      `📝 Motivo: _${motivo.slice(0, 160)}_\n\n` +
      `📉 Antes:\n${lineas.join('\n')}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ Ahora: 💎 *${nf(1000)}* · ⭐ *0* · 🏅 Nivel *1* · 🏦 Banco *0*\n` +
      `🏷️ Quedó marcado como *tramposo* (las cuentas marcadas no vuelven a sincronizar).\n\n` +
      `> 💡 Si te arrepentís: restaurá la cuenta desde el panel.`,
    mentions: String(base).includes('@') ? [base] : []
  }, { quoted: m })
}

handler.help = ['sancionar <@user> [motivo]']
handler.tags = ['owner']
handler.command = /^(sancionar|marcartramposo|cheater)$/i
handler.rowner = true

export default handler
