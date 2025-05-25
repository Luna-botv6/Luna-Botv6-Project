import { addExp, addMoney, getExp, getMoney, spendExp, spendMoney } from '../lib/stats.js'

const cooldown = 5 * 60 * 1000 // 5 minutos
const tiempos = {}

const handler = async (m, { conn, usedPrefix, args }) => {
  const id = m.sender

  if (args.length < 3) {
    if (tiempos[id] && (Date.now() - tiempos[id]) < cooldown) {
      const tiempoRestante = Math.ceil((cooldown - (Date.now() - tiempos[id])) / 1000)
      return m.reply(`⏳ Espera *${tiempoRestante} segundos* antes de volver a jugar.`)
    }

    const message = `
🎰 *¡Bienvenido a la Ruleta de Colores!* 🎰

Apuesta usando EXP o Diamantes (money) y elige un color:
🟢 Verde (x5) — Difícil pero muy recompensado  
🔴 Rojo (x3) — Probabilidad media  
⚪ Blanco (x2) — Mayor probabilidad

Ejemplo:  
*${usedPrefix}ruleta exp rojo 50*  
*${usedPrefix}ruleta money verde 100*

O elige una opción rápida tocando un botón:

`.trim()

    const botones = [
      ['🟢 Apuesta Exp Verde 300', `${usedPrefix}ruleta exp verde 300`],
      ['🔴 Apuesta Diamants Rojo 50', `${usedPrefix}ruleta money rojo 50`],
      ['⚪ Apuesta Exp Blanco 250', `${usedPrefix}ruleta exp blanco 250`]
    ]

    await conn.sendButton(
      m.chat,
      message,
      'LunaBot V6',
      null,
      botones,
      null,
      null,
      m
    )

    tiempos[id] = Date.now()
    return
  }

  const tipo = args[0].toLowerCase()
  const color = args[1]?.toLowerCase()
  const cantidad = parseInt(args[2])

  if (!['exp', 'money'].includes(tipo)) return m.reply('❌ Debes apostar "Exp" o "money" (Diamantes).')
  if (!['verde', 'rojo', 'blanco'].includes(color)) return m.reply('❌ Colores válidos: verde, rojo o blanco.')
  if (isNaN(cantidad) || cantidad < 1) return m.reply('❌ Ingresa una cantidad válida mayor a 0.')

  const saldoExp = await getExp(id)
  const saldoMoney = await getMoney(id)

  if (tipo === 'exp' && saldoExp < cantidad) return m.reply('❌ No tienes suficiente *Exp* para apostar.')
  if (tipo === 'money' && saldoMoney < cantidad) return m.reply('❌ No tienes suficientes *Diamantes* para apostar.')

  const colores = ['verde', 'rojo', 'blanco', 'rojo', 'blanco', 'rojo', 'blanco', 'rojo', 'blanco', 'rojo']
  const resultado = colores[Math.floor(Math.random() * colores.length)]

  let ganancia = 0
  if (color === resultado) {
    switch (resultado) {
      case 'verde':
        ganancia = cantidad * 5
        break
      case 'rojo':
        ganancia = cantidad * 3
        break
      case 'blanco':
        ganancia = cantidad * 2
        break
    }
    if (tipo === 'exp') {
      addExp(id, ganancia)
      spendExp(id, cantidad)
    } else {
      addMoney(id, ganancia)
      spendMoney(id, cantidad)
    }

    return m.reply(`🎉 ¡Ganaste! El color fue *${resultado.toUpperCase()}*.\nHas ganado *${ganancia} ${tipo === 'exp' ? 'Exp' : 'Diamantes'}*`)
  } else {
    if (tipo === 'exp') {
      spendExp(id, cantidad)
    } else {
      spendMoney(id, cantidad)
    }
    return m.reply(`😢 Perdiste...\nEl color fue *${resultado.toUpperCase()}*.\nPerdiste *${cantidad} ${tipo === 'exp' ? 'Exp' : 'Diamantes'}*`)
  }
}

handler.command = /^ruleta$/i
export default handler