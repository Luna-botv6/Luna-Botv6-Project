import { unificarFichas, unificarTodos, clavesDeUsuario } from '../lib/funcion/economiaCanonica.js'
import { idCanonico } from '../lib/identidad.js'

const nf = (n) => Number(n || 0).toLocaleString('es-AR')

function panelUnificado(res) {
  const fus = res.fusionadas || []
  const lineas = fus.map((f) => `> 🔗 \`${f.clave}\` → 💎 ${nf(f.money)} · ⭐ ${nf(f.exp)} · Nv ${f.level} · 🏦 ${nf(f.banco)}`)
  return `🧩 *FICHAS UNIFICADAS*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 Cuenta principal: *${res.base}*\n\n` +
    `📥 Fichas viejas absorbidas (${fus.length}):\n${lineas.join('\n')}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💎 Billetera: *${nf(res.antes?.money)}* → *${nf(res.despues?.money)}*\n` +
    `⭐ EXP: *${nf(res.antes?.exp)}* → *${nf(res.despues?.exp)}*\n` +
    `🏅 Nivel: *${res.antes?.level || 0}* → *${res.despues?.level || 0}*\n` +
    `🏦 Banco: *${nf(res.antes?.banco)}* → *${nf(res.despues?.banco)}*\n\n` +
    `> ✅ Se queda el valor más alto de cada cosa, no se suma, así no se duplica plata.`
}

const handler = async (m, { conn, args, usedPrefix }) => {
  const arg = String(args[0] || '').toLowerCase().replace('@', '')

  if (arg === 'todo' || arg === 'todos' || arg === 'all') {
    const res = unificarTodos(conn)
    if (!res.length) return m.reply('🧩 *Nada para unificar* — no hay fichas duplicadas de tipo LID.')
    const lineas = res.map((r) => `> 👤 *${r.base}*: ${r.fusionadas.length} ficha(s) → 💎 ${nf(r.despues.money)} · ⭐ ${nf(r.despues.exp)}`)
    return m.reply(`🧩 *UNIFICACIÓN MASIVA*\n\n${lineas.join('\n')}\n\n> ✅ ${res.length} cuenta(s) reparada(s).`)
  }

  const bruto = m.mentionedJid?.[0]
    || m.quoted?.sender
    || m.quoted?.participant
    || args.find((a) => /\d{8,}/.test(String(a)))
    || null

  if (!bruto) {
    return m.reply(
      `🧩 *UNIFICAR FICHAS DUPLICADAS*\n\n` +
      `> Usá: *${usedPrefix}unificar @usuario* (o citando su mensaje)\n` +
      `> Masivo: *${usedPrefix}unificar todo*\n\n` +
      `_Une la ficha vieja \`<lid>@lid\` con la del teléfono, quedándose con el valor más alto de cada cosa._`
    )
  }

  const objetivo = idCanonico(bruto, conn) || bruto
  const { base, variantes } = clavesDeUsuario(objetivo, conn)
  if (!base) return m.reply('❌ No pude resolver el usuario.')
  if (!variantes.length) {
    return m.reply(`🧩 *SIN DUPLICADOS*\n\n> 👤 *${base}* tiene una sola ficha. No hay nada que unir.`)
  }

  const res = unificarFichas(objetivo, conn)
  if (!res.ok) return m.reply('❌ No se pudo unificar la cuenta.')
  return m.reply(panelUnificado(res))
}

handler.help = ['unificar <@user>', 'unificar todo']
handler.tags = ['owner']
handler.command = /^(unificar|unirfichas|mergeuser)$/i
handler.rowner = true

export default handler
