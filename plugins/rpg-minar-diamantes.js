import fs from 'fs'
import { getLastDiamantMiningTime, setLastDiamantMiningTime, initDiamantMiningUser } from '../lib/minardiamantes.js'
import { addMoney, getMoney } from '../lib/stats.js'

const handler = async (m, { conn }) => {
  try {
    const userId = m.sender
    await initDiamantMiningUser(userId)

    const idioma = global.db?.data?.users?.[userId]?.language || global.defaultLenguaje
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`, 'utf-8'))
    const tradutor = _translate.plugins.rpg_minar

    const cooldown = 600000 // 10 minutos en milisegundos
    const lastTime = getLastDiamantMiningTime(userId)
    const now = Date.now()

    // Verificar cooldown
    if (lastTime && (now - lastTime < cooldown)) {
      const remaining = cooldown - (now - lastTime)
      const mensaje = `⏰ *¡Aun estas cansado!*\n\n💎 Podras minar diamantes nuevamente en *${msToTime(remaining)}*\n\n✨ _Descansa un poco y vuelve pronto_`
      return m.reply(mensaje)
    }

    // Calcular recompensa
    const reward = calcularDiamantes()
    setLastDiamantMiningTime(userId, now)

    // Actualizar dinero del usuario
    addMoney(userId, reward)
    const total = getMoney(userId)

    // Mensaje de exito con emojis
    const mensaje = `⛏️ *MINADO EXITOSO* ⛏️

💎 Has encontrado *${reward} diamantes*
💰 Total acumulado: *${total} diamantes*

⏱️ Podras volver a minar en *10 minutos*

✨ _¡Sigue minando para conseguir mas diamantes!_ ✨`

    await m.reply(mensaje)

  } catch (error) {
    console.error('Error en comando minar diamantes:', error)
    const errorMsg = `❌ *Error*\n\nHubo un problema al minar diamantes. Intenta nuevamente en unos momentos.`
    await m.reply(errorMsg)
  }
}

handler.help = ['minardiamantes']
handler.tags = ['economia']
handler.command = ['minardiamantes', 'minard', 'diamondmine', 'minar2']
handler.fail = null
handler.exp = 0
handler.register = true
handler.limit = false

export default handler

/**
 * Convierte milisegundos a formato de tiempo legible
 * @param {number} duration - Duracion en milisegundos
 * @returns {string} Tiempo formateado
 */
function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Calcula la cantidad de diamantes ganados basado en probabilidades
 * @returns {number} Cantidad de diamantes
 */
function calcularDiamantes() {
  const chance = Math.random()

  // Sistema de probabilidades balanceado
  if (chance < 0.5) {
    return rand([1, 2, 3, 5])                    // 50% - Recompensas bajas
  } else if (chance < 0.75) {
    return rand([8, 10, 12, 15])                 // 25% - Recompensas medias
  } else if (chance < 0.9) {
    return rand([20, 25, 30])                    // 15% - Recompensas altas
  } else if (chance < 0.98) {
    return rand([50, 75, 100])                   // 8% - Recompensas muy altas
  } else {
    return rand([150, 200, 250])                 // 2% - Recompensas legendarias
  }
}

/**
 * Selecciona un elemento aleatorio de un array
 * @param {Array} arr - Array de elementos
 * @returns {*} Elemento aleatorio del array
 */
function rand(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return 1 // Valor por defecto
  }
  return arr[Math.floor(Math.random() * arr.length)]
}