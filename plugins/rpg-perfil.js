import { createHash } from 'crypto'
import PhoneNumber from 'awesome-phonenumber'
import { xpRange } from '../lib/levelling.js'
import { getUserStats, getRoleByLevel } from '../lib/stats.js'
import { getProteccionRestante } from '../lib/usarprote.js'
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js'
import { resolveMention } from '../lib/mentionHelper.js'
import { idCanonico } from '../lib/identidad.js'
import { getHunterStatus } from '../lib/hunterSystem.js'
import { getClanDeUsuario } from '../lib/clanSystem.js'
import { getUserPosition } from '../lib/pvpSystem.js'

function tpl(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`))
}

function bar(current, max) {
  if (!max) return '░░░░░'
  const filled = Math.round((current / max) * 10)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

function msToTime(duration) {
  if (!duration || duration <= 0) return '0s'
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const days = Math.floor(duration / (1000 * 60 * 60 * 24))
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

const handler = async (m, { conn, args }) => {
  const mentionedRaw = resolveMention(m, args)
  const mentioned = mentionedRaw ? (idCanonico(mentionedRaw) || mentionedRaw) : null
  const who = mentioned || idCanonico(m.fromMe ? conn.user.jid : m.sender) || (m.fromMe ? conn.user.jid : m.sender)

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es'
  const _tr = await global.loadTranslation(idioma)
  const t = _tr?.plugins?.rpg_profile || {}

  const stats = getUserStats(who)
  const name = (conn.getName && await conn.getName(who)) || who.split('@')[0]
  const sn = createHash('md5').update(who).digest('hex')

  const { exp = 0, level = 0, money = 0, mysticcoins = 0, lunaCoins = 0, limit = 0, joincount = 0, premiumTime = 0, hp = 100, maxHp = 100, pet = { type: 'ninguna' } } = stats || {}
  const { max } = xpRange(level, global.multiplier || 1)
  const xpProgress = `${exp} / ${max} XP`
  const currentRole = getRoleByLevel(level)
  const armor = stats.armor || { type: 'ninguna', durability: 0, maxDurability: 0, defense: 0 }
  const protectionMs = (typeof getProteccionRestante === 'function') ? getProteccionRestante(who) : 0
  const protectionText = protectionMs > 0 ? msToTime(protectionMs) : ((stats.protectActive || stats.protectExpires > Date.now()) ? (t.activo || 'Activo') : '—')
  const hunterStatus = getHunterStatus(who)
  const buffs = (stats.activeBuffs || []).filter(b => b.expiresAt > Date.now())
  const buffText = buffs.length ? buffs.map(b => b.type).join(', ') : '—'
  const inv = stats.inventory || {}
  const invItems = Object.entries(inv).filter(([, q]) => q > 0).map(([k, q]) => `${k} x${q}`).join(', ') || '—'
  const bountyStars = stats.bountyStars || 0
  const bountyFine = stats.bountyFine || 0
  const capturedText = stats.isCaptured ? (t.capturado || '⛓️ Capturado') : (t.libre || '✅ Libre')
  const petEmoji = { lobo: '🐺', dragon: '🐉', fenix: '🔥', gato: '🐱', unicornio: '🦄', ninguna: '—' }[pet.type] || '—'

  const clanInfo = getClanDeUsuario(who)
  const clanLine = clanInfo
    ? `┃ 🏰 *${t.clan || 'Clan'}:* ${clanInfo.nombre} (${clanInfo.clan.miembros.length} ${t.miembros || 'miembros'})\n┃ 🏦 ${tpl(t.clan_fondo || 'Fondo: *{fondo}💎* · Bono *+{pct}%*', { fondo: clanInfo.clan.fondo || 0, pct: (clanInfo.clan.fondo || 0) >= 1000 ? 5 : 0 })}`
    : `┃ 🏰 *${t.clan || 'Clan'}:* ${t.sin_clan || 'sin clan'}`

  const pvp = getUserPosition(who)
  const pvpLine = pvp.pos
    ? `┃ ⚔️ ${tpl(t.pvp_line || '*PvP:* #{pos} — {puntos} pts ({wins}V/{losses}D)', { pos: pvp.pos, puntos: pvp.stats.points || 0, wins: pvp.stats.wins || 0, losses: pvp.stats.losses || 0 })}`
    : `┃ ⚔️ ${t.pvp_sin || '*PvP:* sin duelos esta semana'}`

  let profilePic = 'https://telegra.ph/file/06cc652844ea19e8aed1c.jpg'
  try { profilePic = await conn.profilePictureUrl(who, 'image') } catch {}

  const resolvedPhone = resolveJidToPhone(who)
  let number = resolvedPhone || who.replace(/@.+/, '')
  try { number = PhoneNumber('+' + number).getNumber('international') } catch {}
  if (!resolvedPhone) number = 'desconocido'

  const tag = '@' + (resolvedPhone || who.split('@')[0])

  const text = `╭━━━〔 *${t.titulo || 'Perfil de Usuario'}* 〕━━━⬣
┃ 👤 *${t.nombre || 'Nombre'}:* ${name}
┃ 🌎 *${t.telefono || 'Número'}:* ${number}
┃ 🔗 *${t.usuario || 'Usuario'}:* ${tag}
┃
┃ 📈 *${t.nivel || 'Nivel'}:* ${level} (${xpProgress})
┃ ${bar(exp, max)}
┃ 🏅 *${t.rol || 'Rango'}:* ${currentRole}
┃
┃ 💎 *${t.diamantes || 'Diamantes'}:* ${money}
┃ ✨ *MysticCoins:* ${mysticcoins}
┃ 🌙 *LunaCoins:* ${lunaCoins}
┃ 📦 *${t.limite || 'Límite'}:* ${limit}
┃ 🎯 *${t.participaciones || 'Participaciones'}:* ${joincount}
┃ 🪙 *Premium:* ${premiumTime > 0 ? (t.si || 'Sí') : (t.no || 'No')}
┃
${clanLine}
${pvpLine}
┃
┃ ❤️ *${t.vida || 'Vida'}:* ${hp}/${maxHp}
┃ 🥼 *${t.armadura || 'Armadura'}:* ${armor.type} (${armor.durability || 0}/${armor.maxDurability || 0}) DEF ${armor.defense || 0}
┃ 🛡️ *${t.proteccion || 'Protección'}:* ${protectionText}
┃ 🚨 *Bounty:* ${'⭐'.repeat(bountyStars) || '—'} (${bountyFine} 💎)
┃ ⛓️ *${t.estado || 'Estado'}:* ${capturedText}
┃ 🎯 *${t.amenaza || 'Amenaza'}:* ${hunterStatus.threat}%
┃
┃ ✨ *Buffs:* ${buffText}
┃ 🎒 *${t.inventario || 'Inventario'}:* ${invItems}
┃ 🐾 *${t.mascota || 'Mascota'}:* ${petEmoji} ${pet.name || '—'} (Nv ${pet.level || 0})
┃
╰━━━━━━━━━━━━━━━━━━━━⬣
🔑 ${t.id || 'ID'}: ${sn}`

  await conn.sendMessage(m.chat, {
    image: { url: profilePic },
    caption: text,
    mentions: [who]
  }, { quoted: m })
}

handler.help = ['perfil', 'profile']
handler.tags = ['xp', 'rpg']
handler.command = /^(perfil|profile)$/i

export default handler
