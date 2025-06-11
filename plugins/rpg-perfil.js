import { createHash } from 'crypto'
import PhoneNumber from 'awesome-phonenumber'
import { xpRange } from '../lib/levelling.js'
import { getUserStats } from '../lib/stats.js'

const handler = async (m, { conn }) => {
  const who = m.mentionedJid && m.mentionedJid[0]
    ? m.mentionedJid[0]
    : m.fromMe
    ? conn.user.jid
    : m.sender

  const stats = getUserStats(who)
  const name = conn.getName(who)
  const sn = createHash('md5').update(who).digest('hex')

  const { exp, level, money, mysticcoins, lunaCoins, role, limit, joincount, premiumTime } = stats
  const { min, max } = xpRange(level, global.multiplier || 1)
  const xpProgress = `${exp} / ${max} XP`

  let profilePic = 'https://telegra.ph/file/06cc652844ea19e8aed1c.jpg'
  try {
    profilePic = await conn.profilePictureUrl(who, 'image')
  } catch {}

  const number = PhoneNumber('+' + who.replace(/@.+/, '')).getNumber('international')

  const text = `
╭━━━〔 *Perfil de Usuario* 〕━━━⬣
┃ *👤 Nombre:* ${name}
┃ *🌎 Número:* ${number}
┃ *🔗 WhatsApp:* wa.me/${who.split('@')[0]}
┃
┃ *📈 Nivel:* ${level} (${xpProgress})
┃ *🏅 Rango:* ${role}
┃ *💎 Diamantes:* ${money}
┃ *✨ MysticCoins:* ${mysticcoins}
┃ *🌙 LunaCoins:* ${lunaCoins}
┃ *📦 Límite:* ${limit}
┃ *🎯 Participaciones:* ${joincount}
┃ *🪙 Premium:* ${premiumTime > 0 ? 'Sí' : 'No'}
╰━━━━━━━━━━━━━━━━━━━━⬣
🔑 ID: ${sn}
`.trim()

  await conn.sendMessage(m.chat, {
    image: { url: profilePic },
    caption: text
  }, { quoted: m })
}

handler.help = ['perfil', 'profile']
handler.tags = ['xp']
handler.command = /^perfil|profile$/i
export default handler
