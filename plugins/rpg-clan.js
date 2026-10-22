import { getPlayerState, removeMoney } from '../lib/stats.js'
import { getClanes, getClanDeUsuario, guardarClanes } from '../lib/clanSystem.js'
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js'
import { idCanonico, mismoUsuario } from '../lib/identidad.js'

const mostrar = (jid) => resolveJidToPhone(jid) || 'desconocido'

const HELP_MSG =
  `🏰 *Gremios/Clanes*\n\n` +
  `📋 *Comandos:*\n` +
  `• *clan crear <nombre>* — Crear un clan (costo 5000💎)\n` +
  `• *clan unirse <nombre>* — Unirse a un clan\n` +
  `• *clan salir* — Salir del clan\n` +
  `• *clan ver* — Ver info del clan\n` +
  `• *clan miembros* — Ver miembros\n` +
  `• *clan donar <cantidad>* — Donar diamantes al fondo\n` +
  `• *clan lista* — Ver clanes disponibles\n` +
  `• *clan mensaje <texto>* — Enviar mensaje a miembros\n` +
  `• *clan guerra <clan>* — Guerra entre clanes\n\n` +
  `🏰 Bonos: fondo > 1000💎 → +5% EXP para miembros\n` +
  `⚔️ Guerra: el clan con más poder gana 30% del fondo enemigo`

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.rpg_clan || {}
  const userId = idCanonico(m.sender) || m.sender
  const u = getPlayerState(userId)
  const clanes = getClanes()
  const cmd = (args && args[0]) ? args[0].toLowerCase() : ''
  const sub = (args && args[1]) ? args[1] : ''
  const reply = (text, extra = {}) => conn.sendMessage(m.chat, { text, ...extra }, { quoted: m })

  if (!cmd || cmd === 'help' || cmd === 'ayuda') return reply(t.help || HELP_MSG)

  if (cmd === 'crear' || cmd === 'create') {
    const nombre = args?.slice(1).join(' ').trim()
    if (!nombre) return reply('❌ Indica un nombre para el clan.\n💡 *clan crear <nombre>*')
    if (getClanDeUsuario(userId)) return reply('❌ Ya estás en un clan. Usa *clan salir* primero.')
    if (clanes[nombre]) return reply('❌ Ese clan ya existe.')
    if ((u.money || 0) < 5000) return reply(`❌ Necesitas 5000💎 para crear un clan.\nTu saldo: *${u.money || 0}💎*`)
    removeMoney(userId, 5000)
    clanes[nombre] = { lider: userId, miembros: [userId], fondo: 0, nivel: 1, creado: Date.now() }
    guardarClanes()
    return reply(`🏰 *¡Clan creado!*\n\nNombre: *${nombre}*\nLíder: @${mostrar(userId)}\n💎 Fondo: 0\n💰 Pagaste: 5000💎`, { mentions: [userId] })
  }

  if (cmd === 'unirse' || cmd === 'join') {
    const nombre = args?.slice(1).join(' ').trim()
    if (!nombre) return reply('❌ Indica el nombre del clan.\n💡 *clan unirse <nombre>*')
    if (getClanDeUsuario(userId)) return reply('❌ Ya estás en un clan. Usa *clan salir* primero.')
    if (!clanes[nombre]) return reply('❌ Ese clan no existe. Usa *clan lista*')
    if (!clanes[nombre].miembros.some((x) => mismoUsuario(x, userId))) clanes[nombre].miembros.push(userId)
    guardarClanes()
    return reply(`🏰 *¡Te uniste a ${nombre}!*\n\nBienvenido, @${mostrar(userId)}`, { mentions: [userId] })
  }

  if (cmd === 'salir' || cmd === 'leave') {
    const info = getClanDeUsuario(userId)
    if (!info) return reply('❌ No estás en ningún clan.')
    const { nombre, clan } = info
    if (mismoUsuario(clan.lider, userId) && clan.miembros.length > 1) return reply('❌ Eres el líder. Transfiere el liderazgo o disuelve el clan primero.')
    clan.miembros = clan.miembros.filter(x => !mismoUsuario(x, userId))
    if (clan.miembros.length === 0) delete clanes[nombre]
    guardarClanes()
    return reply(`🏰 Saliste del clan *${nombre}*.`)
  }

  if (cmd === 'ver' || cmd === 'info') {
    const info = getClanDeUsuario(userId)
    if (!info) return reply('❌ No estás en ningún clan.')
    const { nombre, clan } = info
    const bonus = (clan.fondo || 0) >= 1000 ? '+5% EXP' : '—'
    return reply(`🏰 *Clan: ${nombre}*\n\n👑 Líder: @${mostrar(clan.lider)}\n👥 Miembros: *${clan.miembros.length}*\n💎 Fondo: *${clan.fondo || 0}*\n📊 Nivel: *${clan.nivel || 1}*\n✨ Bono: *${bonus}*\n📅 Creado: ${new Date(clan.creado).toLocaleDateString()}`, { mentions: [clan.lider] })
  }

  if (cmd === 'miembros' || cmd === 'members') {
    const info = getClanDeUsuario(userId)
    if (!info) return reply('❌ No estás en ningún clan.')
    const { clan } = info
    const lines = clan.miembros.map((x, i) => `${i + 1}. @${mostrar(x)}${mismoUsuario(x, clan.lider) ? ' 👑' : ''}`).join('\n')
    return reply(`🏰 *Miembros (${clan.miembros.length})*\n\n${lines}`, { mentions: clan.miembros })
  }

  if (cmd === 'donar' || cmd === 'donate') {
    const info = getClanDeUsuario(userId)
    if (!info) return reply('❌ No estás en ningún clan.')
    const cantidad = parseInt(sub)
    if (isNaN(cantidad) || cantidad <= 0) return reply('❌ Indica una cantidad válida.\n💡 *clan donar <cantidad>*')
    if ((u.money || 0) < cantidad) return reply(`❌ Saldo insuficiente. Tienes *${u.money || 0}💎*`)
    removeMoney(userId, cantidad)
    info.clan.fondo = (info.clan.fondo || 0) + cantidad
    info.clan.nivel = Math.floor(info.clan.fondo / 5000) + 1
    guardarClanes()
    return reply(`🏰 *Donación exitosa!*\n\n💎 +${cantidad} al fondo\n💎 Fondo total: *${info.clan.fondo}*\n📊 Nivel clan: *${info.clan.nivel}*`)
  }

  if (cmd === 'lista' || cmd === 'list') {
    const nombres = Object.keys(clanes)
    if (nombres.length === 0) return reply('🏰 No hay clanes creados aún.\n💡 *clan crear <nombre>*')
    const lines = nombres.map(n => `🏰 *${n}* — ${clanes[n].miembros.length} miembros, fondo ${clanes[n].fondo || 0}💎`).join('\n')
    return reply(`🏰 *Clanes disponibles*\n\n${lines}`)
  }

  if (cmd === 'mensaje' || cmd === 'msg' || cmd === 'broadcast') {
    const info = getClanDeUsuario(userId)
    if (!info) return reply('❌ No estás en ningún clan.')
    const texto = args?.slice(1).join(' ').trim()
    if (!texto) return reply(t.sin_texto || '❌ Indica un mensaje.\n💡 *clan mensaje <texto>*')
    const destinos = info.clan.miembros.filter(x => !mismoUsuario(x, userId))
    let enviados = 0
    for (const miembro of destinos) {
      try {
        await conn.sendMessage(miembro, { text: `🏰 *Mensaje del clan ${info.nombre}:*\n\n${texto}\n\n— @${mostrar(userId)}`, mentions: [userId] })
        enviados++
      } catch {}
    }
    return reply((t.mensaje_enviado || '🏰 *Mensaje enviado a {n} miembro(s).*').replace('{n}', enviados))
  }

  if (cmd === 'guerra' || cmd === 'war') {
    const info = getClanDeUsuario(userId)
    if (!info) return reply('❌ No estás en ningún clan.')
    const nombreEnemigo = args?.slice(1).join(' ').trim()
    if (!nombreEnemigo || !clanes[nombreEnemigo]) return reply(t.guerra_no_encontrado || '❌ Clan enemigo no encontrado.\n💡 *clan guerra <nombre_clan>*')
    const enemigo = clanes[nombreEnemigo]
    if (nombreEnemigo === info.nombre) return reply(t.guerra_propio || '❌ No puedes atacar tu propio clan.')
    const poder1 = info.clan.miembros.reduce((s, x) => s + (getPlayerState(x)?.level || 0), 0) + Math.floor((info.clan.fondo || 0) / 100)
    const poder2 = enemigo.miembros.reduce((s, x) => s + (getPlayerState(x)?.level || 0), 0) + Math.floor((enemigo.fondo || 0) / 100)
    if (poder1 === poder2) return reply((t.guerra_empate || '⚔️ *Guerra de Clanes*\n\n🏰 {clan1} (poder {p1})\n🏰 {clan2} (poder {p2})\n\n🤝 Empate: nadie pierde fondo.')
      .replace('{clan1}', info.nombre).replace('{p1}', poder1).replace('{clan2}', nombreEnemigo).replace('{p2}', poder2))
    const gana1 = poder1 > poder2
    const ganador = gana1 ? info.nombre : nombreEnemigo
    const botin = Math.floor(Math.min(info.clan.fondo || 0, enemigo.fondo || 0) * 0.3)
    if (gana1) {
      info.clan.fondo = (info.clan.fondo || 0) + botin
      enemigo.fondo = Math.max(0, (enemigo.fondo || 0) - botin)
    } else {
      enemigo.fondo = (enemigo.fondo || 0) + botin
      info.clan.fondo = Math.max(0, (info.clan.fondo || 0) - botin)
    }
    guardarClanes()
    return reply(
      (t.guerra_resultado ||
        `⚔️ *Guerra de Clanes*\n\n` +
        `🏰 {clan1} (poder {p1}) vs 🏰 {clan2} (poder {p2})\n\n` +
        `🏆 Ganador: *{ganador}*\n` +
        `💰 Botín: *{botin}💎* transferido al ganador\n\n` +
        `💎 Fondo {clan1}: *{fondo1}*\n` +
        `💎 Fondo {clan2}: *{fondo2}*`)
        .replace('{clan1}', info.nombre).replace('{p1}', poder1)
        .replace('{clan2}', nombreEnemigo).replace('{p2}', poder2)
        .replace('{ganador}', ganador).replace('{botin}', botin)
        .replace('{fondo1}', info.clan.fondo || 0).replace('{fondo2}', enemigo.fondo || 0)
    )
  }

  return reply(t.help || HELP_MSG)
}

handler.help = ['clan']
handler.tags = ['rpg']
handler.command = ['clan', 'gremio', 'guild']
handler.group = true

export default handler
