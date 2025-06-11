import fs from 'fs'
import { getUserStats, setUserStats, addExp, addMoney } from '../lib/stats.js'

const handler = async (m, {conn}) => {
  const idioma = 'es' // Puedes adaptar para leer el idioma desde stats si quieres
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.rpg_daily

  const fkontak = m
  const userId = m.sender
  const user = getUserStats(userId)

  // Variables para recompensas
  const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]

  const exp = pickRandom([500, 600, 700, 800, 900, 999, 1000, 1300, 1500, 1800])
  const exppremium = pickRandom([1000, 1500, 1800, 2100, 2500, 2900, 3300, 3600, 4000, 4500])

  const money = pickRandom([300, 500, 700, 900, 500, 800, 900, 1100, 1350, 1500])
  const moneypremium = pickRandom([800, 1300, 1600, 1900, 2200, 2500, 2700, 3000, 3300, 3500])

  const potion = pickRandom([1, 2, 3, 4, 5])
  const potionpremium = pickRandom([2, 4, 6, 9, 12])

  const tiketcoin = pickRandom([1, 0, 0, 2, 0])
  const tiketcoinpremium = pickRandom([2, 1, 1, 3, 4])

  const eleksirb = pickRandom([1, 1, 1, 3, 1, 2, 2, 1, 5, 8])
  const eleksirbpremium = pickRandom([3, 3, 5, 3, 8, 3, 4, 4, 10, 7])

  const umpan = pickRandom([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
  const umpanpremium = pickRandom([30, 60, 90, 120, 150, 180, 210, 240, 270, 300])

  // Comprobamos si es premium según premiumTime y fecha actual (puedes adaptar según tu lógica)
  const isPremium = user.premiumTime && user.premiumTime > Date.now()

  const recompensas = {
    exp: isPremium ? exppremium : exp,
    money: isPremium ? moneypremium : money,
    potion: isPremium ? potionpremium : potion,
    tiketcoin: isPremium ? tiketcoinpremium : tiketcoin,
    eleksirb: isPremium ? eleksirbpremium : eleksirb,
    umpan: isPremium ? umpanpremium : umpan,
  }

  // Para manejar lastclaim: guardaremos esta propiedad en user y actualizaremos la base
  if (!user.lastclaim) user.lastclaim = 0

  const cooldown = 7200000 // 2 horas
  const now = Date.now()
  if (now - user.lastclaim < cooldown) {
    const remaining = cooldown - (now - user.lastclaim)
    return await conn.reply(m.chat, `${tradutor.texto1[0]} *${msToTime(remaining)}* ${tradutor.texto1[1]}`, fkontak, m)
  }

  // Sumar recompensas a user y guardar
  addExp(userId, recompensas.exp)
  addMoney(userId, recompensas.money)

  // Guardamos items que no están en stats.js, así que los agregamos dinámicamente y guardamos
  user.potion = (user.potion || 0) + recompensas.potion
  user.tiketcoin = (user.tiketcoin || 0) + recompensas.tiketcoin
  user.eleksirb = (user.eleksirb || 0) + recompensas.eleksirb
  user.umpan = (user.umpan || 0) + recompensas.umpan

  user.lastclaim = now
  setUserStats(userId, user)

  let texto = ''
  for (const key of Object.keys(recompensas)) {
    texto += `*+${recompensas[key]}* ${global.rpgshop.emoticon ? global.rpgshop.emoticon(key) : key}\n┃ `
  }

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
