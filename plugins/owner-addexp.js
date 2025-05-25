// plugins/addexp.js
import { addExp } from '../lib/stats.js'

const handler = async (m, { conn, args, participants, isOwner, isROwner, command }) => {
  if (!isOwner && !isROwner) throw 'Este comando es solo para los *propietarios del bot*.'

  if (args.length < 2) throw `Uso: *${command} <cantidad> @usuario*\nEjemplo: *${command} 3000 @tag*`

  const exp = parseInt(args[0])
  if (isNaN(exp) || exp <= 0) throw 'La cantidad de experiencia debe ser un número válido y mayor que cero.'

  const mentionedJid = m.mentionedJid && m.mentionedJid[0]
  if (!mentionedJid) throw 'Debes mencionar al usuario al que deseas añadir EXP.'

  addExp(mentionedJid, exp)

  m.reply(`Se añadieron *${exp}* puntos de experiencia a *${mentionedJid.split('@')[0]}*`)
}

handler.command = /^addexp$/i
handler.rowner = true
export default handler