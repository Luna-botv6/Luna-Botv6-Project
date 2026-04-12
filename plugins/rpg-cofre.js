import fs from 'fs'
import { getUserStats, setUserStats, addExp, addMoney } from '../lib/stats.js'
import { getLastCofreTime, setLastCofreTime, initCofreUser } from '../lib/cofre.js'

const handler = async (m, { isPrems, conn }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_cofre

  const userId = m.sender
  initCofreUser(userId)

  const baseRewards = {
    exp: 7500,
    money: 3000, 
    mysticcoins: 10
  }

  const premiumRewards = {
    exp: 15000,
    money: 6000,
    mysticcoins: 20
  }

  const stats = global.db.data.users[m.sender]
  const isPremium = stats.premiumTime && stats.premiumTime > Date.now()
  const recompensas = isPremium ? premiumRewards : baseRewards

  const lastCofre = getLastCofreTime(userId)
  const cooldown = 86400000 
  const now = Date.now()
  const remaining = cooldown - (now - lastCofre)
  
  if (remaining > 0) {
    throw `${tradutor.texto1[0]} *${msToTime(remaining)}* ${tradutor.texto1[1]}`
  }

  addExp(userId, recompensas.exp)
  addMoney(userId, recompensas.money)
  
  const updatedUser = global.db.data.users[userId]
  updatedUser.mysticcoins = (updatedUser.mysticcoins || 0) + recompensas.mysticcoins
  
  setLastCofreTime(userId, now)

  const img = 'https://img.freepik.com/vector-gratis/cofre-monedas-oro-piedras-preciosas-cristales-trofeo_107791-7769.jpg?w=2000'
  
  const texto = `
${tradutor.texto2[0]}
${tradutor.texto2[1]}
${tradutor.texto2[2]}
║➢ *${recompensas.exp}* ⭐ ${tradutor.texto2[3]}
║➢ *${recompensas.money}* 💎 ${tradutor.texto2[4]}
║➢ *${recompensas.mysticcoins}* 🪙 ${tradutor.texto2[5]}
║➢ ${tradutor.texto2[6]} ${isPremium ? '✅' : '❌'}
${tradutor.texto2[7]}`

  const fkontak = {
    key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
    message: { contactMessage: { vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` } },
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
  return `${hours}h ${minutes}m ${seconds}s`
}