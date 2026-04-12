import fs from 'fs'
import { getUserStats, setUserStats } from '../lib/stats.js'

const handler = async (m, { args }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.cambiar

  const id = m.sender
  const tipo = args[0]?.toLowerCase()
  const cantidad = parseInt(args[1])

  if (!['exp', 'diamantes'].includes(tipo)) {
    return m.reply(`${tradutor.texto1}\n\n/cambiar exp <cantidad>\n/cambiar diamantes <cantidad>`)
  }

  if (isNaN(cantidad) || cantidad <= 0) {
    return m.reply(tradutor.texto2)
  }

  const user = getUserStats(id)

  if (tipo === 'exp') {
    const expNecesaria = cantidad * 10

    if (user.exp < expNecesaria) {
      return m.reply(`${tradutor.texto3} *${expNecesaria}* ${tradutor.texto4} *${cantidad}* ${tradutor.texto5}`)
    }

    user.exp -= expNecesaria
    user.money += cantidad
    setUserStats(id, user)

    return m.reply(
      `${tradutor.texto6}\n\n- ${tradutor.texto7} *${expNecesaria}* ${tradutor.texto8} *${cantidad}* ${tradutor.texto9}\n\n${tradutor.texto10}\n🔹 Exp: *${user.exp}*\n💎 Diamantes: *${user.money}*`
    )
  } else if (tipo === 'diamantes') {
    if (user.money < cantidad) {
      return m.reply(`${tradutor.texto11} *${user.money}* ${tradutor.texto12}`)
    }

    const expGanada = cantidad * 10
    user.money -= cantidad
    user.exp += expGanada
    setUserStats(id, user)

    return m.reply(
      `${tradutor.texto6}\n\n- ${tradutor.texto13} *${cantidad}* ${tradutor.texto9} ${tradutor.texto14} *${expGanada}* ${tradutor.texto8}\n\n${tradutor.texto10}\n💎 Diamantes: *${user.money}*\n🔹 Exp: *${user.exp}*`
    )
  }
}

handler.command = /^cambiar$/i

export default handler