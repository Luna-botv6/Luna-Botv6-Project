import fs from 'fs'
import { createHash } from 'crypto'
import PhoneNumber from 'awesome-phonenumber'
import { xpRange } from '../lib/levelling.js'
import { getUserStats, getRoleByLevel } from '../lib/stats.js'
import { resolveMention } from '../lib/mentionHelper.js'

const handler = async (m, { conn, args }) => {
  const mentioned = resolveMention(m, args)
  const who = mentioned || (m.fromMe ? conn.user.jid : m.sender)

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es'
  let _t = {}
  try {
    const _lang = idioma || global.defaultLenguaje || 'es'
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${_lang}.json`, 'utf8'))
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')) } catch {}
  }
  const tradutor = _t.plugins?.rpg_profile || {}

  const stats = getUserStats(who)
  const name = (conn.getName && await conn.getName(who)) || who.split('@')[0]
  const sn = createHash('md5').update(who).digest('hex')

  const { exp = 0, level = 0, money = 0, mysticcoins = 0, lunaCoins = 0, limit = 0, joincount = 0, premiumTime = 0 } = stats || {}
  const { max } = xpRange(level, global.multiplier || 1)
  const xpProgress = `${exp} / ${max} XP`
  const currentRole = getRoleByLevel(level)

  let profilePic = 'https://telegra.ph/file/06cc652844ea19e8aed1c.jpg'
  try { profilePic = await conn.profilePictureUrl(who, 'image') } catch {}

  let number = who.replace(/@.+/, '')
  try { number = PhoneNumber('+' + number).getNumber('international') } catch {}

  const tag = '@' + who.split('@')[0]

  const text = `\n╭━━━〔 *${tradutor.texto1 || 'Perfil'}* 〕━━━⬣\n` +
    `┃ *👤 Nombre:* ${name}\n` +
    `┃ *🌎 Tel:* ${number}\n` +
    `┃ *🔗 Usuario:* ${tag}\n\n` +
    `┃ *📈 Nivel:* ${level} (${xpProgress})\n` +
    `┃ *🏅 Rol:* ${currentRole}\n` +
    `┃ *💎 Diamantes:* ${money}\n` +
    `┃ *✨ MysticCoins:* ${mysticcoins}\n` +
    `┃ *🌙 LunaCoins:* ${lunaCoins}\n` +
    `┃ *📦 Límite:* ${limit}\n` +
    `┃ *🎯 Veces:* ${joincount}\n` +
    `┃ *🪙 Premium:* ${premiumTime > 0 ? (tradutor.texto9 || 'Sí') : (tradutor.texto10 || 'No')}\n` +
    `╰━━━━━━━━━━━━━━━━━━━━⬣\n🔑 ID: ${sn}`

  await conn.sendMessage(m.chat, {
    image: { url: profilePic },
    caption: text
  }, { quoted: m })
}

handler.help = ['perfil', 'profile']
handler.tags = ['xp', 'rpg']
handler.command = /^(perfil|profile)$/i

export default handler
