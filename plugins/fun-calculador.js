const handler = async (m, { conn, command, text, usedPrefix }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(./src/languages/${idioma}.json))
  const tradutor = _translate.plugins.fun_calculador

  if (!text) throw ${tradutor.texto26};
  const percentage = Math.floor(Math.random() * 101)

  let emoji = ''
  let description = ''

  const barra = (value) => {
    const total = 10
    const filled = Math.floor((value / 100) * total)
    const empty = total - filled
    return '▰'.repeat(filled) + '▱'.repeat(empty)
  }

  const getText = (t1, t2, t3) =>
    ${t1} *${text.toUpperCase()}* ${t2} *${percentage}%* ${command} ${emoji}\n${barra(percentage)}\n${t3}

  switch (command) {
    case 'gay2':
      emoji = '🏳️‍🌈'
      description = percentage < 50
        ? getText(...tradutor.texto1)
        : percentage > 100
          ? getText(...tradutor.texto2)
          : getText(...tradutor.texto3)
      break
    case 'lesbiana':
      emoji = '🏳️‍🌈'
      description = percentage < 50
        ? getText(...tradutor.texto4)
        : percentage > 100
          ? getText(...tradutor.texto5)
          : getText(...tradutor.texto6)
      break
    case 'pajero':
    case 'pajera':
      emoji = '😏💦'
      description = percentage < 50
        ? getText(...tradutor.texto7)
        : percentage > 100
          ? getText(...tradutor.texto8)
          : getText(...tradutor.texto9)
      break
    case 'puto':
    case 'puta':
      emoji = '🔥🥵'
      description = percentage < 50
        ? getText(...tradutor.texto10)
        : percentage > 100
          ? getText(...tradutor.texto11)
          : getText(...tradutor.texto12)
      break
    case 'manco':
    case 'manca':
      emoji = '💩'
      description = percentage < 50
        ? getText(...tradutor.texto13)
        : percentage > 100
          ? getText(...tradutor.texto14)
          : getText(...tradutor.texto15)
      break
    case 'rata':
      emoji = '🐁'
      description = percentage < 50
        ? getText(...tradutor.texto16)
        : percentage > 100
          ? getText(...tradutor.texto17)
          : getText(...tradutor.texto18)
      break
    case 'prostituto':
    case 'prostituta':
      emoji = '🫦👅'
      description = percentage < 50
        ? getText(...tradutor.texto19)
        : percentage > 100
          ? getText(...tradutor.texto20)
          : getText(...tradutor.texto21)
      break
    default:
      throw ${tradutor.texto22}
  }

  const responses = tradutor.texto23
  const randomMessage = responses[Math.floor(Math.random() * responses.length)]

  const resultadoFinal = 
┏━━━━━━━━━━━━━━━┓
┃  💫 *${tradutor.texto24}* 💫
┗━━━━━━━━━━━━━━━┛

${description}

🗯️ *${randomMessage}*

┏━━━━━━━━━━━━━━━┓
┃ 🔮 *${tradutor.texto24}* 🔮
┗━━━━━━━━━━━━━━━┛.trim()

  const animacionCarga = [
   "🟥⬛⬛⬛⬛⬛⬛⬛⬛⬛ 10%",
  "🟥🟧⬛⬛⬛⬛⬛⬛⬛⬛ 30%",
  "🟥🟧🟨🟩⬛⬛⬛⬛⬛⬛ 50%",
  "🟥🟧🟨🟩🟦🟦⬛⬛⬛⬛ 80%",
  "🟥🟧🟨🟩🟦🟪🟫⬜⬜⬜ 100%"
  ]

  const { key } = await conn.sendMessage(m.chat, {
    text: animacionCarga[0],
    mentions: conn.parseMention(resultadoFinal)
  }, { quoted: m })

  for (let i = 1; i < animacionCarga.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    await conn.sendMessage(m.chat, {
      text: animacionCarga[i],
      edit: key
    })
  }

  await conn.sendMessage(m.chat, {
    text: resultadoFinal,
    edit: key,
    mentions: conn.parseMention(resultadoFinal)
  })
}

handler.help = ['gay2', 'lesbiana', 'pajero', 'pajera', 'puto', 'puta', 'manco', 'manca', 'rata', 'prostituta', 'prostituto'].map(v => v + ' @tag | nombre')
handler.tags = ['calculator']
handler.command = /^(gay2|lesbiana|pajero|pajera|puto|puta|manco|manca|rata|prostituta|prostituto)$/i

export default handler
