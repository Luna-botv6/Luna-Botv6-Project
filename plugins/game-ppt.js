import { addExp, removeExp, canPlay, setwait } from '../lib/ppt.js'

const handler = async (m, { text, command, usedPrefix }) => {
  const userId = m.sender
  const options = ['piedra', 'papel', 'tijera']
  const choice = text.trim().toLowerCase()

  if (!options.includes(choice)) {
    return m.reply(`Usa el comando con una de estas opciones:\n\n${usedPrefix + command} piedra\n${usedPrefix + command} papel\n${usedPrefix + command} tijera`)
  }

  if (!canPlay(userId)) {
    return m.reply('Espera unos segundos antes de volver a jugar.')
  }

  setwait(userId)

  const botChoice = options[Math.floor(Math.random() * options.length)]
  let result = ''

  if (choice === botChoice) {
    result = 'Empate!'
  } else if (
    (choice === 'piedra' && botChoice === 'tijera') ||
    (choice === 'papel' && botChoice === 'piedra') ||
    (choice === 'tijera' && botChoice === 'papel')
  ) {
    addExp(userId, 200)
    result = `¡Ganaste! ${choice} vence a ${botChoice}. Ganaste 200 exp.`
  } else {
    removeExp(userId, 100)
    result = `Perdiste... ${botChoice} vence a ${choice}. Perdiste 100 exp.`
  }

  await m.reply(`Tú elegiste: ${choice}\nBot eligió: ${botChoice}\n\n${result}`)
}

handler.help = ['ppt'].map(v => v + ' <piedra|papel|tijera>')
handler.tags = ['game']
handler.command = /^ppt$/i

export default handler