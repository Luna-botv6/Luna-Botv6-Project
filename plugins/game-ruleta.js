import { addExp, addMoney, getExp, getMoney, spendExp, spendMoney, removeExp, removeMoney } from '../lib/stats.js'

const userCommandHistory = {}
const userWarnings = {}
const userCooldowns = {}

const handler = async (m, { conn, usedPrefix, args }) => {
  const id = m.sender
  const currentTime = Date.now()
  const cooldown = 120000 // 2 minutos

  // 🕒 Verificar cooldown de 2 minutos
  if (!userCooldowns[id]) userCooldowns[id] = 0
  if (currentTime - userCooldowns[id] < cooldown) {
    const tiempoRestante = ((cooldown - (currentTime - userCooldowns[id])) / 1000).toFixed(0)
    return m.reply(`⏳ Debes esperar *${tiempoRestante} segundos* antes de volver a jugar.`)
  }

  if (!userCommandHistory[id]) userCommandHistory[id] = []
  if (!userWarnings[id]) userWarnings[id] = { count: 0, lastWarning: 0 }

  // Limpiar historial de comandos viejos (10s)
  userCommandHistory[id] = userCommandHistory[id].filter(ts => currentTime - ts < 10000)

  if (currentTime - userWarnings[id].lastWarning > 30000) {
    userWarnings[id].count = 0
  }

  const commandCount = userCommandHistory[id].length

  if (commandCount >= 3 && userWarnings[id].count === 0) {
    userWarnings[id].count = 1
    userWarnings[id].lastWarning = currentTime
    return m.reply(`⚠️ *PRIMERA ADVERTENCIA* ⚠️

Estás usando el comando de ruleta muy rápido.
*Has usado ${commandCount} comandos en los últimos 10 segundos.*

🚨 Si usas el comando 5 veces en 10 segundos:
💸 Perderás el 45% de tus Diamantes
⭐ Perderás el 45% de tu EXP`)
  }

  if (commandCount >= 4 && userWarnings[id].count === 1) {
    userWarnings[id].count = 2
    userWarnings[id].lastWarning = currentTime

    const saldoExp = await getExp(id)
    const saldoMoney = await getMoney(id)
    const posibleMultaExp = Math.floor(saldoExp * 0.45)
    const posibleMultaMoney = Math.floor(saldoMoney * 0.45)

    return m.reply(`🔥 *ÚLTIMA ADVERTENCIA* 🔥

*¡PELIGRO!* Has usado ${commandCount} comandos en 10 segundos.
*¡SOLO FALTA 1 COMANDO MÁS PARA LA MULTA!*

⭐ EXP: ${posibleMultaExp} / 💎 Diamantes: ${posibleMultaMoney}

🛑 *¡PARA AHORA!* Espera unos segundos antes de continuar.`)
  }

  if (commandCount >= 5) {
    const saldoExp = await getExp(id)
    const saldoMoney = await getMoney(id)
    const multaExp = Math.floor(saldoExp * 0.45)
    const multaMoney = Math.floor(saldoMoney * 0.45)

    if (multaExp > 0) await removeExp(id, multaExp)
    if (multaMoney > 0) await removeMoney(id, multaMoney)

    userCommandHistory[id] = []
    userWarnings[id] = { count: 0, lastWarning: 0 }

    return m.reply(`🚫 *MULTA POR SPAM APLICADA* 🚫

💸 EXP perdido: ${multaExp}
💎 Diamantes perdidos: ${multaMoney}

⏰ Espera entre comandos para evitar sanciones.`)
  }

  userCommandHistory[id].push(currentTime)

  if (args.length < 3) {
    const message = `🎰 *¡Bienvenido a la Ruleta de Colores!* 🎰
Apuesta usando EXP o Diamantes:

🟢 Verde (x5) — Difícil, alta recompensa  
🔴 Rojo (x3) — Media probabilidad  
⚪ Blanco (x2) — Alta probabilidad

Ejemplo:  
${usedPrefix}ruleta exp rojo 50  
${usedPrefix}ruleta money verde 100`

    const botones = [
      ['🟢 Exp Verde 300', `${usedPrefix}ruleta exp verde 300`],
      ['🔴 Diamantes Rojo 50', `${usedPrefix}ruleta money rojo 50`],
      ['⚪ Exp Blanco 250', `${usedPrefix}ruleta exp blanco 250`]
    ]

    await conn.sendButton(m.chat, message, 'LunaBot V6', null, botones, null, null, m)
    return
  }

  const tipo = args[0].toLowerCase()
  const color = args[1]?.toLowerCase()
  const cantidad = parseInt(args[2])

  if (!['exp', 'money'].includes(tipo)) return m.reply('❌ Apuesta "exp" o "money".')
  if (!['verde', 'rojo', 'blanco'].includes(color)) return m.reply('❌ Colores válidos: verde, rojo o blanco.')
  if (isNaN(cantidad) || cantidad < 1) return m.reply('❌ Ingresa una cantidad válida mayor a 0.')

  const saldoExp = await getExp(id)
  const saldoMoney = await getMoney(id)

  if (tipo === 'exp' && saldoExp < cantidad) return m.reply('❌ No tienes suficiente *Exp*.')
  if (tipo === 'money' && saldoMoney < cantidad) return m.reply('❌ No tienes suficientes *Diamantes*.')

  const colores = ['verde', 'rojo', 'blanco', 'rojo', 'blanco', 'rojo', 'blanco', 'rojo', 'blanco', 'rojo']
  const resultado = colores[Math.floor(Math.random() * colores.length)]

  let ganancia = 0
  if (color === resultado) {
    switch (resultado) {
      case 'verde': ganancia = cantidad * 5; break
      case 'rojo': ganancia = cantidad * 3; break
      case 'blanco': ganancia = cantidad * 2; break
    }

    if (tipo === 'exp') {
      addExp(id, ganancia)
      spendExp(id, cantidad)
    } else {
      addMoney(id, ganancia)
      spendMoney(id, cantidad)
    }

    userCooldowns[id] = Date.now()
    return m.reply(`🎉 ¡Ganaste! El color fue *${resultado.toUpperCase()}*.\nGanaste *${ganancia} ${tipo === 'exp' ? 'Exp' : 'Diamantes'}*`)
  } else {
    if (tipo === 'exp') {
      spendExp(id, cantidad)
    } else {
      spendMoney(id, cantidad)
    }

    userCooldowns[id] = Date.now()
    return m.reply(`😢 Perdiste... El color fue *${resultado.toUpperCase()}*.\nPerdiste *${cantidad} ${tipo === 'exp' ? 'Exp' : 'Diamantes'}*`)
  }
}

handler.command = /^ruleta$/i
export default handler
