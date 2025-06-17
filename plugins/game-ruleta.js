import { addExp, addMoney, getExp, getMoney, spendExp, spendMoney, removeExp, removeMoney } from '../lib/stats.js'

// Objeto para almacenar el historial de comandos por usuario
const userCommandHistory = {}
// Objeto para almacenar las advertencias por usuario
const userWarnings = {}

const handler = async (m, { conn, usedPrefix, args }) => {
  const id = m.sender
  const currentTime = Date.now()
  
  // Inicializar historial del usuario si no existe
  if (!userCommandHistory[id]) {
    userCommandHistory[id] = []
  }
  
  // Inicializar advertencias del usuario si no existe
  if (!userWarnings[id]) {
    userWarnings[id] = {
      count: 0,
      lastWarning: 0
    }
  }
  
  // Limpiar comandos antiguos (más de 10 segundos)
  userCommandHistory[id] = userCommandHistory[id].filter(timestamp => 
    currentTime - timestamp < 10000
  )
  
  // Resetear advertencias si ha pasado mucho tiempo sin spam (30 segundos)
  if (currentTime - userWarnings[id].lastWarning > 30000) {
    userWarnings[id].count = 0
  }
  
  // Verificar diferentes niveles de spam
  const commandCount = userCommandHistory[id].length
  
  // Primera advertencia - 3 comandos en 10 segundos
  if (commandCount >= 3 && userWarnings[id].count === 0) {
    userWarnings[id].count = 1
    userWarnings[id].lastWarning = currentTime
    
    return m.reply(`⚠️ *PRIMERA ADVERTENCIA* ⚠️

Estás usando el comando de ruleta muy rápido.
*Has usado ${commandCount} comandos en los últimos 10 segundos.*

🚨 *¡ATENCIÓN!* Si usas el comando 5 veces en 10 segundos:
💸 Perderás el 45% de tus Diamantes
⭐ Perderás el 45% de tu EXP

🕐 Tómate un descanso y juega con moderación.`)
  }
  
  // Segunda advertencia - 4 comandos en 10 segundos
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

💀 *Si usas el comando una vez más, perderás:*
⭐ EXP: ${posibleMultaExp} (45% de tu total: ${saldoExp})
💎 Diamantes: ${posibleMultaMoney} (45% de tu total: ${saldoMoney})

🛑 *¡PARA AHORA!* Espera unos segundos antes de continuar.`)
  }
  
  // Aplicar multa - 5 comandos en 10 segundos
  if (commandCount >= 5) {
    // Aplicar multa antispam
    const saldoExp = await getExp(id)
    const saldoMoney = await getMoney(id)
    
    // Calcular multa (un poco menos de la mitad)
    const multaExp = Math.floor(saldoExp * 0.45) // 45% del EXP
    const multaMoney = Math.floor(saldoMoney * 0.45) // 45% de los Diamantes
    
    // Aplicar las multas usando las funciones directas
    if (multaExp > 0) await removeExp(id, multaExp)
    if (multaMoney > 0) await removeMoney(id, multaMoney)
    
    // Limpiar historial y advertencias para resetear el conteo
    userCommandHistory[id] = []
    userWarnings[id] = { count: 0, lastWarning: 0 }
    
    return m.reply(`🚫 *MULTA POR SPAM APLICADA* 🚫

¡Ignoraste las advertencias y continuaste haciendo spam!

*Multa aplicada por usar el comando 5 veces en 10 segundos:*
💸 EXP perdido: ${multaExp}
💎 Diamantes perdidos: ${multaMoney}

⏰ La próxima vez, respeta las advertencias y juega con moderación.
🎮 Puedes volver a jugar normalmente ahora.`)
  }
  
  // Agregar el timestamp actual al historial
  userCommandHistory[id].push(currentTime)
  
  if (args.length < 3) {
    const message = `🎰 *¡Bienvenido a la Ruleta de Colores!* 🎰
Apuesta usando EXP o Diamantes (money) y elige un color:
🟢 Verde (x5) — Difícil pero muy recompensado  
🔴 Rojo (x3) — Probabilidad media  
⚪ Blanco (x2) — Mayor probabilidad

⚠️ *Aviso:* Hacer spam del comando resultará en advertencias y multas.
• 3 usos rápidos = Primera advertencia
• 4 usos rápidos = Última advertencia
• 5 usos rápidos = Multa del 45% de tus recursos

Ejemplo:  
*${usedPrefix}ruleta exp rojo 50*  
*${usedPrefix}ruleta money verde 100*

O elige una opción rápida tocando un botón:`
    
    const botones = [
      ['🟢 Apuesta Exp Verde 300', `${usedPrefix}ruleta exp verde 300`],
      ['🔴 Apuesta Diamantes Rojo 50', `${usedPrefix}ruleta money rojo 50`],
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
    return
  }
  
  const tipo = args[0].toLowerCase()
  const color = args[1]?.toLowerCase()
  const cantidad = parseInt(args[2])
  
  if (!['exp', 'money'].includes(tipo)) return m.reply('❌ Debes apostar "exp" o "money" (diamantes).')
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
