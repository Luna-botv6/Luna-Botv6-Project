import { removeExp } from '../lib/stats.js'

const handler = async (m, { conn, args, isOwner, isROwner, command }) => {
  if (!isOwner && !isROwner) throw 'Este comando es solo para los *propietarios del bot*.'

  if (args.length < 2) throw `Uso: *${command} <cantidad> @usuario*\nEjemplo: *${command} 500 @tag*`

  const exp = parseInt(args[0])
  if (isNaN(exp) || exp <= 0) throw 'La cantidad de experiencia debe ser un número válido y mayor que cero.'

  const mentionedJid = m.mentionedJid && m.mentionedJid[0]
  if (!mentionedJid) throw 'Debes mencionar al usuario al que deseas restar EXP.'

  removeExp(mentionedJid, exp)

  m.reply(`Se le restaron *${exp}* puntos de experiencia a *${mentionedJid.split('@')[0]}*`)
}

handler.command = /^removeexp$/i
handler.rowner = true
export default handler