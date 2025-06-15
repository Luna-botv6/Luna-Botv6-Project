import fs from 'fs'
import { getUserStats, setUserStats, addExp, addMoney } from '../lib/stats.js'
import { getLastCofreTime, setLastCofreTime, initCofreUser } from '../lib/cofre.js'

const handler = async (m, { isPrems, conn }) => {
  const stats = getUserStats(m.sender)
  const idioma = stats.language || global.defaultLenguaje || 'es'
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.rpg_cofre

  const userId = m.sender
  
  // Inicializar usuario en el sistema de cofre si no existe
  initCofreUser(userId)

  // Recompensas fijas
  const baseRewards = {
    exp: 7500,
    money: 3000, // Diamantes
    mysticcoins: 10
  }

  // Recompensas premium (el doble)
  const premiumRewards = {
    exp: 15000,
    money: 6000,
    mysticcoins: 20
  }

  // Verificar si es premium
  const isPremium = stats.premiumTime && stats.premiumTime > Date.now()

  // Seleccionar recompensas según el estado premium
  const recompensas = isPremium ? premiumRewards : baseRewards

  // Manejo del cooldown usando el archivo separado
  const lastCofre = getLastCofreTime(userId)
  const cooldown = 86400000 // 24 horas
  const now = Date.now()
  const remaining = cooldown - (now - lastCofre)
  
  if (remaining > 0) {
    throw `${tradutor.texto1[0]} ${msToTime(remaining)} ${tradutor.texto1[1]}`
  }

  // Aplicar recompensas usando las funciones de stats.js
  addExp(userId, recompensas.exp)
  addMoney(userId, recompensas.money)
  
  // Para mysticcoins, lo agregamos directamente al usuario y guardamos
  const updatedUser = getUserStats(userId)
  updatedUser.mysticcoins = (updatedUser.mysticcoins || 0) + recompensas.mysticcoins
  setUserStats(userId, updatedUser)

  // Actualizar el tiempo del último cofre
  setLastCofreTime(userId, now)

  const img = 'https://img.freepik.com/vector-gratis/cofre-monedas-oro-piedras-preciosas-cristales-trofeo_107791-7769.jpg?w=2000'
  
  const texto = `
${tradutor.texto2[0]}
${tradutor.texto2[1]}
${tradutor.texto2[2]}
║➢ *${recompensas.exp}* ⭐ Experiencia
║➢ *${recompensas.money}* 💎 Diamantes
║➢ *${recompensas.mysticcoins}* 🪙 MysticCoins
║➢ *Estado Premium:* ${isPremium ? '✅' : '❌'}
${tradutor.texto2[7] || ''}`

  const fkontak = {
    key: {
      participants: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
      fromMe: false,
      id: 'Halo',
    },
    message: {
      contactMessage: {
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
      },
    },
    participant: '0@s.whatsapp.net',
  }

  await conn.sendFile(m.chat, img, 'mystic.jpg', texto, fkontak)
}

handler.help = ['daily']
handler.tags = ['xp']
handler.command = ['coffer', 'cofre', 'abrircofre', 'cofreabrir']
handler.level = 5
export default handler

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  hours = (hours < 10) ? '0' + hours : hours
  minutes = (minutes < 10) ? '0' + minutes : minutes
  seconds = (seconds < 10) ? '0' + seconds : seconds
  return hours + ' Horas ' + minutes + ' Minutos'
}