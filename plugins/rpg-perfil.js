import { createHash } from 'crypto'
import PhoneNumber from 'awesome-phonenumber'
import fs from 'fs'
import { xpRange } from '../lib/levelling.js'
import { getUserStats, getRoleByLevel } from '../lib/stats.js'

const handler = async (m, { conn }) => {
  const who = m.mentionedJid && m.mentionedJid[0]
    ? m.mentionedJid[0]
    : m.fromMe
    ? conn.user.jid
    : m.sender

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_profile

  const stats = getUserStats(who)
  const name = conn.getName(who)
  const sn = createHash('md5').update(who).digest('hex')

  const { exp, level, money, mysticcoins, lunaCoins, limit, joincount, premiumTime } = stats
  const { max } = xpRange(level, global.multiplier || 1)
  const xpProgress = `${exp} / ${max} XP`
  const currentRole = getRoleByLevel(level)

  let profilePic = 'https://telegra.ph/file/06cc652844ea19e8aed1c.jpg'
  try {
    profilePic = await conn.profilePictureUrl(who, 'image')
  } catch {}

  const number = PhoneNumber('+' + who.replace(/@.+/, '')).getNumber('international')

  const text = `
╭━━━〔 *${tradutor.texto1}* 〕━━━⬣
┃ *👤 ${tradutor.texto2}:* ${name}
┃ *🌎 ${tradutor.texto3}:* ${number}
┃ *🔗 WhatsApp:* wa.me/${who.split('@')[0]}
┃
┃ *📈 ${tradutor.texto4}:* ${level} (${xpProgress})
┃ *🏅 ${tradutor.texto5}:* ${currentRole}
┃ *💎 ${tradutor.texto6}:* ${money}
┃ *✨ MysticCoins:* ${mysticcoins}
┃ *🌙 LunaCoins:* ${lunaCoins}
┃ *📦 ${tradutor.texto7}:* ${limit}
┃ *🎯 ${tradutor.texto8}:* ${joincount}
┃ *🪙 Premium:* ${premiumTime > 0 ? tradutor.texto9 : tradutor.texto10}
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