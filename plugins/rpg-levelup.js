import fs from 'fs'
import { canLevelUp, xpRange } from '../lib/levelling.js'
import { levelup } from '../lib/canvas.js'
import {
  getUserStats,
  setUserStats,
  getRoleByLevel,
  addExp,
  addMoney
} from '../lib/stats.js'

const handler = async (m, { conn }) => {
  const id = m.sender
  const idioma = global.db.data.users[id]?.language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_levelup

  let user = getUserStats(id)
  const beforeLevel = user.level
  let leveledUp = false

  while (canLevelUp(user.level, user.exp)) {
    const { max } = xpRange(user.level)
    if (user.exp >= max) {
      user.exp -= max
      user.level++
      leveledUp = true
    } else break
  }

  if (leveledUp) {
    user.role = getRoleByLevel(user.level)
    setUserStats(id, user)
  }

  if (user.level > beforeLevel) {
    const levelsGained = user.level - beforeLevel
    const expBonus = levelsGained * 1000
    const moneyBonus = levelsGained * 600
    
    addExp(id, expBonus)
    addMoney(id, moneyBonus)

    const name = await conn.getName(id)
    const textoSubida = `🎉 *${tradutor.texto1}*\n\n` +
      `◉ ${tradutor.texto2} ${beforeLevel}\n` +
      `◉ ${tradutor.texto3} ${user.level}\n` +
      `◉ ${tradutor.texto4} ${user.role}\n\n` +
      `🎁 Bonus: +${expBonus} XP, +${moneyBonus} ${tradutor.texto10}`

    try {
      const img = await levelup(`${tradutor.texto5}\n¡${tradutor.texto6}, ${name}!`, user.level)
      await conn.sendFile(m.chat, img, 'levelup.jpg', textoSubida, m)
    } catch {
      m.reply(textoSubida)
    }
  } else {
    const { max } = xpRange(user.level)
    const xpNeeded = Math.max(0, max - user.exp)
    const percent = Math.max(0, Math.min(100, Math.floor((user.exp / max) * 100)))
    const bars = progressBar(percent)

    return m.reply(
      `🏰 *${tradutor.texto5}*\n` +
      `*¡${tradutor.texto7}, ${await conn.getName(id)}!*\n\n` +
      `◉ ${tradutor.texto3} ${user.level}\n` +
      `◉ ${tradutor.texto8} ${user.role}\n` +
      `◉ ${tradutor.texto9} ${user.exp}/${max} (${percent}%)\n` +
      `◉ Progreso: ${bars}\n\n` +
      `—◉ ${tradutor.texto11[0]} ${xpNeeded} ${tradutor.texto11[1]}`)
  }
}

function progressBar(percent) {
  const totalBars = 10
  const filledBars = Math.floor(percent / 10)
  const emptyBars = totalBars - filledBars
  return '▰'.repeat(filledBars) + '▱'.repeat(emptyBars)
}

handler.help = ['nivel', 'lvl', 'levelup']
handler.tags = ['xp']
handler.command = ['nivel', 'lvl', 'levelup']
export default handler
