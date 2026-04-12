import { getUserStats, spendExp, spendMoney, setUserStats } from '../lib/stats.js'

const emojis = ['🍒', '🍋', '🍇', '🔔', '⭐']
const getRandomEmoji = () => emojis[Math.floor(Math.random() * emojis.length)]

const COST_EXP = 500
const COST_MONEY = 100
const userPlayLog = {}

const handler = async (m, { args, command }) => {
  const userId = m.sender
  const method = (args[0] || '').toLowerCase()

  if (!['xp', 'diamantes'].includes(method)) {
    return m.reply(
      `🎰 *「 Mystic Slot Machine 🎲 」*\n\n` +
      `📝 *Modo de uso:*\n` +
      `» *${command} xp* (500 de EXP)\n` +
      `» *${command} diamantes* (100 Diamantes)\n\n` +
      `🎯 *Objetivo:* Alinea símbolos iguales y gana MysticCoins!\n` +
      `💡 Puedes jugar hasta 4 veces cada 10 segundos.\n\n` +
      `🎮 ¡Prueba tu suerte ahora!`
    )
  }

  const now = Date.now()
  if (!userPlayLog[userId]) {
    userPlayLog[userId] = { timestamps: [], blockedUntil: 0 }
  }

  const userLog = userPlayLog[userId]

  if (userLog.blockedUntil > now) {
    const remaining = Math.ceil((userLog.blockedUntil - now) / 1000)
    return m.reply(`🚫 Has jugado demasiado rápido.\n🕐 Espera *${Math.ceil(remaining / 60)} minuto(s)* para volver a jugar.`)
  }

  userLog.timestamps = userLog.timestamps.filter(ts => now - ts < 10000)
  userLog.timestamps.push(now)

  if (userLog.timestamps.length >= 4) {
    userLog.blockedUntil = now + 5 * 60 * 1000
    userLog.timestamps = []
    return m.reply(`⛔ Has jugado 4 veces muy rápido.\n🕔 Cooldown activado por *5 minutos*.`)
  }

  const user = getUserStats(userId)

  if (method === 'xp' && user.exp < COST_EXP) {
    return m.reply('❌ No tienes suficiente EXP (mínimo 500) para jugar.')
  }
  if (method === 'diamantes' && user.money < COST_MONEY) {
    return m.reply('❌ No tienes suficientes Diamantes (mínimo 100) para jugar.')
  }

  // Descontar recursos
  if (method === 'xp') spendExp(userId, COST_EXP)
  else spendMoney(userId, COST_MONEY)

  const s1 = getRandomEmoji()
  const s2 = getRandomEmoji()
  const s3 = getRandomEmoji()

  const result = `🎰 *「 Mystic Slot Machine 」*\n\n` +
                 `╔════════════════════╗\n` +
                 `║     ${s1}   |   ${s2}   |   ${s3}     ║\n` +
                 `╚════════════════════╝\n`

  let reward = 0
  if (s1 === s2 && s2 === s3) reward = 3
  else if (s1 === s2 || s1 === s3 || s2 === s3) reward = 1

  if (reward > 0) {
    user.mysticcoins += reward
    setUserStats(userId, user)
  }

  const winMessage = reward > 0 
    ? `🎉 ¡Ganaste *${reward}* MysticCoin${reward > 1 ? 's' : ''}!`
    : `💀 No ganaste nada esta vez...`

  const finalMessage = 
    `${result}\n` +
    `${winMessage}\n\n` +
    `📊 *Tu saldo actual:*\n` +
    `• ✨ EXP: ${user.exp}\n` +
    `• 💎 Diamantes: ${user.money}\n` +
    `• 🪙 MysticCoins: ${user.mysticcoins}\n\n` +
    `🎮 Usa */${command} xp* o */${command} diamantes* para volver a jugar.`

  m.reply(finalMessage)
}

handler.command = /^gira$/i
handler.help = ['gira xp', 'gira diamantes']
handler.tags = ['juegos']
handler.register = false

export default handler