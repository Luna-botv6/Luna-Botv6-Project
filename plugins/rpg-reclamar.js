import fs from 'fs'
import { getUserStats, setUserStats, addExp, addMoney } from '../lib/stats.js'
import { getLastClaimTime, setLastClaimTime, initClaimUser } from '../lib/reclamar.js'

const handler = async (m, {conn}) => {
  const idioma = 'es' // Puedes adaptar para leer el idioma desde stats si quieres
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.rpg_daily

  const fkontak = m
  const userId = m.sender
  const user = getUserStats(userId)

  // Inicializar usuario en el sistema de reclamar si no existe
  initClaimUser(userId)

  // Recompensas fijas
  const baseRewards = {
    exp: 5000,
    money: 2500, // Diamantes
    mysticcoins: 5
  }

  // Recompensas premium (el doble)
  const premiumRewards = {
    exp: 10000,
    money: 5000,
    mysticcoins: 10
  }

  // Verificar si es premium usando la lógica de stats.js
  const isPremium = user.premiumTime && user.premiumTime > Date.now()

  // Seleccionar recompensas según el estado premium
  const recompensas = isPremium ? premiumRewards : baseRewards

  // Manejo del cooldown usando el archivo separado
  const lastClaim = getLastClaimTime(userId)
  const cooldown = 21600000 // 6 horas
  const now = Date.now()
  
  if (now - lastClaim < cooldown) {
    const remaining = cooldown - (now - lastClaim)
    return await conn.reply(m.chat, `${tradutor.texto1[0]} *${msToTime(remaining)}* ${tradutor.texto1[1]}`, fkontak, m)
  }

  // Aplicar recompensas usando las funciones de stats.js
  addExp(userId, recompensas.exp)
  addMoney(userId, recompensas.money)
  
  // Para mysticcoins, lo agregamos directamente al usuario y guardamos
  const updatedUser = getUserStats(userId)
  updatedUser.mysticcoins = (updatedUser.mysticcoins || 0) + recompensas.mysticcoins
  setUserStats(userId, updatedUser)

  // Actualizar el tiempo del último reclamo
  setLastClaimTime(userId, now)

  // Preparar texto de recompensas
  let texto = `*+${recompensas.exp}* ${global.rpgshop.emoticon ? global.rpgshop.emoticon('exp') : '⭐'} Experiencia\n┃ `
  texto += `*+${recompensas.money}* ${global.rpgshop.emoticon ? global.rpgshop.emoticon('money') : '💎'} Diamantes\n┃ `
  texto += `*+${recompensas.mysticcoins}* ${global.rpgshop.emoticon ? global.rpgshop.emoticon('mysticcoins') : '🪙'} MysticCoins\n┃ `

  const text = `${tradutor.texto3[0]}
${tradutor.texto3[1]}
┃ *${isPremium ? tradutor.texto3[2] : tradutor.texto3[3]}*
┃ ${texto}
${tradutor.texto3[4]} ${isPremium ? '✅' : '❌'}\n${global.wm || ''}`

  const img = './src/assets/images/menu/languages/es/menu.png'
  await conn.sendFile(m.chat, img, 'mystic.jpg', text, fkontak)
}

handler.help = ['daily']
handler.tags = ['xp']
handler.command = ['daily', 'reclamar', 'reclamo', 'regalo', 'claim']
export default handler

function msToTime(duration) {
  const milliseconds = parseInt((duration % 1000) / 100)
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

  hours = (hours < 10) ? '0' + hours : hours
  minutes = (minutes < 10) ? '0' + minutes : minutes
  seconds = (seconds < 10) ? '0' + seconds : seconds

  return hours + ' Horas ' + minutes + ' Minutos'
}