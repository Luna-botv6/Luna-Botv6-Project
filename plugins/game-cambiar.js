import { getUserStats, setUserStats } from '../lib/stats.js'

const handler = async (m, { args }) => {
  const id = m.sender
  const tipo = args[0]?.toLowerCase()
  const cantidad = parseInt(args[1])

  if (!['exp', 'diamantes'].includes(tipo)) {
    return m.reply(`❌ Usa el comando correctamente:\n\n/cambiar exp <cantidad>\n/cambiar diamantes <cantidad>`)
  }

  if (isNaN(cantidad) || cantidad <= 0) {
    return m.reply('❌ Ingresa una cantidad válida y mayor que 0.')
  }

  const user = getUserStats(id)

  if (tipo === 'exp') {
    // Cambiar exp por diamantes
    const expNecesaria = cantidad * 10

    if (user.exp < expNecesaria) {
      return m.reply(`❌ No tienes suficiente *Exp*. Necesitas *${expNecesaria}* de Exp para obtener *${cantidad}* diamantes.`)
    }

    user.exp -= expNecesaria
    user.money += cantidad
    setUserStats(id, user)

    return m.reply(
      `✅ Cambio realizado:\n\n- Has cambiado *${expNecesaria}* de Exp por *${cantidad}* diamantes.\n\nAhora tienes:\n🔹 Exp: *${user.exp}*\n💎 Diamantes: *${user.money}*`
    )
  } else if (tipo === 'diamantes') {
    // Cambiar diamantes por exp
    if (user.money < cantidad) {
      return m.reply(`❌ No tienes suficientes *Diamantes*. Tienes *${user.money}* diamantes.`)
    }

    const expGanada = cantidad * 10
    user.money -= cantidad
    user.exp += expGanada
    setUserStats(id, user)

    return m.reply(
      `✅ Cambio realizado:\n\n- Has cambiado *${cantidad}* diamantes por *${expGanada}* de Exp.\n\nAhora tienes:\n💎 Diamantes: *${user.money}*\n🔹 Exp: *${user.exp}*`
    )
  }
}

handler.command = /^cambiar$/i
export default handler