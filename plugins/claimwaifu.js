import { getUserWaifuData, saveWaifuClaim } from '../lib/datoswaifuusuarios.js'

let handler = async (m, { conn }) => {
  let waifu = getUserWaifuData(m.sender)
  if (!waifu) return await conn.reply(m.chat, '❌ No tienes ninguna waifu para reclamar. Haz una tirada primero con .rw', m)
  saveWaifuClaim(m.sender, waifu)
  await conn.reply(m.chat, `✅ Has reclamado a tu waifu!\nNombre: ${waifu.nombre}\nAnime: ${waifu.anime}`, m)
}

handler.help = ['claim']
handler.tags = ['rpg', 'gacha']
handler.command = /^claimw$/i
export default handler
