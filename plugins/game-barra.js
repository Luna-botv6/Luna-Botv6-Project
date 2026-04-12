const handler = async (m, { conn }) => {
  // Mensaje de respuesta con el emoji de durazno
  const msg = 'A ella le pusieron una barra por el 🍑'
  
  // Envía el mensaje como respuesta
  await conn.sendMessage(m.chat, { text: msg }, { quoted: m })
}

handler.help = ['barra']
handler.tags = ['fun']
handler.command = /^(barra|Barra|BARRA)$/i

export default handler