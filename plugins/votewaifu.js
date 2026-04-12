import { addVote } from '../lib/datoswaifuusuarios.js'

let handler = async (m, { conn, args }) => {
  if (!args || args.length < 2) return await conn.reply(m.chat, 'Uso: .vote <NombreWaifu> <valor>', m)
  let nombre = args[0]
  let valor = parseInt(args[1])
  if (isNaN(valor)) return await conn.reply(m.chat, 'El valor debe ser un número.', m)
  addVote(m.sender, nombre, valor)
  await conn.reply(m.chat, `✅ Has votado ${valor} puntos a ${nombre}`, m)
}

handler.help = ['vote']
handler.tags = ['rpg', 'gacha']
handler.command = /^vote$/i
export default handler
