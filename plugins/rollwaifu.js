import { setUserWaifuData, updateRolls, getUserData } from '../lib/datoswaifuusuarios.js'

let waifus = [
  { nombre:'Asuna', anime:'SAO', imagen:'https://i.imgur.com/Asuna.jpg', rareza:'★', valor:50, descripcion:'Espadachina de SAO' },
  { nombre:'Rem', anime:'Re:Zero', imagen:'https://i.imgur.com/Rem.jpg', rareza:'★★', valor:100, descripcion:'Demonio leal' },
  { nombre:'Mikasa', anime:'Attack on Titan', imagen:'https://i.imgur.com/Mikasa.jpg', rareza:'★★★', valor:200, descripcion:'Guerrera experta' }
]

let handler = async (m, { conn, usedPrefix }) => {
  let user = getUserData(m.sender)
  let now = Date.now()
  if (!user.rollsToday) user.rollsToday = 0
  let cooldown = 24 * 60 * 60 * 1000
  if (user.lastRoll && now - user.lastRoll < cooldown) {
    let remaining = cooldown - (now - user.lastRoll)
    let hrs = Math.floor(remaining / 3600000)
    let mins = Math.floor((remaining % 3600000) / 60000)
    await conn.reply(m.chat, `⏳ Ya hiciste tu tirada hoy.\nVuelve en ${hrs}h ${mins}m.`, m)
    return
  }
  let waifu = waifus[Math.floor(Math.random() * waifus.length)]
  setUserWaifuData(m.sender, waifu)
  updateRolls(m.sender)
  await conn.reply(m.chat, `🎲 Tirada de Waifu!\n\nNombre: ${waifu.nombre}\nAnime: ${waifu.anime}\nRareza: ${waifu.rareza}\nValor: ${waifu.valor}\nDescripción: ${waifu.descripcion}\n\nUsa ${usedPrefix}claim para reclamarla.`, m)
}

handler.help = ['rw']
handler.tags = ['rpg', 'gacha']
handler.command = /^rw$/i
export default handler
