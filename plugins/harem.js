import { getHarem } from '../lib/datoswaifuusuarios.js'

let handler = async (m, { conn }) => {
  let harem = getHarem(m.sender)
  if (!harem || harem.length === 0) return await conn.reply(m.chat, '❌ No tienes waifus en tu harem.', m)
  let text = '💖 Tu Harem 💖\n\n'
  harem.forEach((w,i)=>{text+=`${i+1}. ${w.nombre} (${w.anime}) - Valor: ${w.valor} - Rareza: ${w.rareza}\n`})
  await conn.reply(m.chat, text, m)
}

handler.help = ['harem']
handler.tags = ['rpg', 'gacha']
handler.command = /^harem$/i
export default handler
