import fs from 'fs'

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.calcular

  const tag = m.mentionedJid?.[0]
  const frase = args.join(' ').trim()

  if (!frase || !tag) {
    return m.reply(`${tradutor.texto1}\n${usedPrefix}${command} [frase] @usuario\n\n${tradutor.texto2}\n${usedPrefix}${command} facha @usuario`)
  }

  let fraseLimpia = frase.replace(/@\d{5,}/g, '').trim()

  const resultado = Math.floor(Math.random() * 101)

  let name
  try {
    name = await conn.getName(tag)
  } catch {
    name = tradutor.texto3
  }

  const progressBar = (valor) => {
    const total = 10
    const filled = Math.round(valor / 10)
    const empty = total - filled
    return '█'.repeat(filled) + '░'.repeat(empty)
  }

  const calcText = `${tradutor.texto4} *${name}* ${tradutor.texto5} *${fraseLimpia}*...`
  await conn.sendMessage(m.chat, { text: calcText, mentions: [tag] }, { quoted: m })

  await new Promise(resolve => setTimeout(resolve, 1500))
  await conn.sendMessage(m.chat, { text: tradutor.texto6 }, { quoted: m })

  await new Promise(resolve => setTimeout(resolve, 2000))

  let comentario = ''
  if (resultado >= 90) comentario = tradutor.texto7
  else if (resultado >= 75) comentario = tradutor.texto8
  else if (resultado >= 50) comentario = tradutor.texto9
  else if (resultado >= 25) comentario = tradutor.texto10
  else comentario = tradutor.texto11

  const finalText = `${tradutor.texto12}

🎯 *${name}* ${tradutor.texto13} *${fraseLimpia}* ${tradutor.texto14} *${resultado}%*

${progressBar(resultado)}

${comentario}`

  await conn.sendMessage(m.chat, { text: finalText }, { quoted: m })
}

handler.command = /^calcular$/i
export default handler
