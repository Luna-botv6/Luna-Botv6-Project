import fs from 'fs'
import { getLastDiamantMiningTime, setLastDiamantMiningTime, initDiamantMiningUser } from '../lib/minardiamantes.js'
import { addMoney, getMoney } from '../lib/stats.js'

const handler = async (m, { conn }) => {
  const userId = m.sender
  await initDiamantMiningUser(userId)

  const idioma = global.db?.data?.users?.[userId]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`, 'utf-8'))
  const tradutor = _translate.plugins.rpg_minar

  const cooldown = 600000 // 10 minutos
  const lastTime = getLastDiamantMiningTime(userId)
  const now = Date.now()

  if (now - lastTime < cooldown) {
    const remaining = cooldown - (now - lastTime)
    throw ` *¡Aún estás cansado!* \n\n Podrás minar diamantes nuevamente en *${msToTime(remaining)}*`
  }

  const reward = calcularDiamantes()
  setLastDiamantMiningTime(userId, now)

  addMoney(userId, reward)
  const total = getMoney(userId)

  let mensaje = `
* MINADO EXITOSO*

 Has encontrado *${reward} diamantes* 
 Total acumulado: *${total} diamantes*

 Podrás volver a minar en *10 minutos*
`.trim()

  m.reply(mensaje)
}

handler.help = ['minardiamantes']
handler.tags = ['economia']
handler.command = ['minardiamantes', 'minard', 'diamondmine']
handler.fail = null
handler.exp = 0

export default handler

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}

function calcularDiamantes() {
  const chance = Math.random()

  if (chance < 0.5) return rand([1, 5, 10, 20, 25])         // 50%
  else if (chance < 0.75) return rand([30, 40, 50, 60])     // 25%
  else if (chance < 0.9) return rand([100, 120, 150])       // 15%
  else if (chance < 0.98) return rand([200, 250, 320])      // 8%
  else return rand([400, 450, 500])                         // 2%
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}