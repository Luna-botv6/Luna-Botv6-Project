import fs from 'fs'
import { getUserStats, setUserStats, addExp, addMoney } from '../lib/stats.js'
import { getLastClaimTime, setLastClaimTime, initClaimUser } from '../lib/reclamar.js'

const handler = async (m, { conn }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_daily

  const userId = m.sender
  const user = getUserStats(userId)
  initClaimUser(userId)

  const baseRewards = { exp: 5000, money: 2500, mysticcoins: 5 }
  const premiumRewards = { exp: 10000, money: 5000, mysticcoins: 10 }

  const isPremium = user.premiumTime && user.premiumTime > Date.now()
  const recompensas = isPremium ? premiumRewards : baseRewards

  const lastClaim = getLastClaimTime(userId)
  const cooldown = 21600000 // 6 horas
  const now = Date.now()
  
  if (now - lastClaim < cooldown) {
    const remaining = cooldown - (now - lastClaim)
    return await conn.reply(m.chat, `⏳ ${tradutor.texto1[0]} *${msToTime(remaining)}* ${tradutor.texto1[1]}`, m)
  }

  addExp(userId, recompensas.exp)
  addMoney(userId, recompensas.money)
  
  const updatedUser = getUserStats(userId)
  updatedUser.mysticcoins = (updatedUser.mysticcoins || 0) + recompensas.mysticcoins
  setUserStats(userId, updatedUser)
  setLastClaimTime(userId, now)

  const text = `
┏━━〔 🎁 *${tradutor.texto2}* 〕━━⬣
┃
┃ *${isPremium ? tradutor.texto3[0] : tradutor.texto3[1]}*
┃
┃ ✨ *+${recompensas.exp}* EXP
┃ 💎 *+${recompensas.money}* ${tradutor.texto4}
┃ 🪙 *+${recompensas.mysticcoins}* MysticCoins
┃
┃ 🌟 *Premium:* ${isPremium ? '✅' : '❌'}
┗━━━━━━━━━━━━━━━━━━━⬣`.trim()

  const img = './src/assets/images/menu/languages/es/menu.png'
  await conn.sendFile(m.chat, img, 'daily.jpg', text, m)
}

handler.help = ['daily']
handler.tags = ['xp']
handler.command = ['daily', 'reclamar', 'reclamo', 'regalo', 'claim']

export default handler

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  return `${hours}h ${minutes}m ${seconds}s`
}