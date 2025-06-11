import fs from 'fs'
import path from 'path'
import { getUserStats } from '../lib/stats.js'

const statsFile = path.join('./database', 'stats.json')

// Cargar todos los stats desde el archivo JSON
function loadAllStats() {
  if (!fs.existsSync(statsFile)) return {}
  try {
    return JSON.parse(fs.readFileSync(statsFile, 'utf-8'))
  } catch {
    return {}
  }
}

// Obtener los top N usuarios ordenados por clave
function getTopUsers(allStats, key, limit = 10) {
  const arr = Object.entries(allStats).map(([id, data]) => ({
    id,
    ...(typeof data === 'object' ? data : getUserStats(id))
  }))
  arr.sort((a, b) => (b[key] || 0) - (a[key] || 0))
  return arr.slice(0, limit)
}

// Buscar la posición de un usuario en el ranking
function getUserPosition(list, id) {
  return list.findIndex(u => u.id === id) + 1 || 0
}

const handler = async (m, { command }) => {
  const allStats = loadAllStats()
  if (!allStats || Object.keys(allStats).length === 0) {
    return m.reply('No hay datos de aventureros para mostrar.')
  }

  const senderId = m.sender

  const topExp = getTopUsers(allStats, 'exp')
  const topLevel = getTopUsers(allStats, 'level')
  const topDiamonds = getTopUsers(allStats, 'money')

  let text = '*< TABLA DE LOS AVENTUREROS MÁS DESTACADOS />*\n\n'

  // TOP EXP
  text += `—◉ *TOP ${topExp.length} EXP 🌟*\n`
  topExp.forEach((user, i) => {
    const mention = '@' + user.id.split('@')[0]
    text += `*${i + 1}.* ${user.id === senderId ? `${mention} (Tú)` : mention} — *${user.exp || 0}* exp\n`
  })
  text += `*👤 Tú posición:* ${getUserPosition(topExp, senderId)} de ${Object.keys(allStats).length}\n\n`

  // TOP NIVEL
  text += `—◉ *TOP ${topLevel.length} NIVEL 🎚️*\n`
  topLevel.forEach((user, i) => {
    const mention = '@' + user.id.split('@')[0]
    text += `*${i + 1}.* ${user.id === senderId ? `${mention} (Tú)` : mention} — *${user.level || 0}* nivel\n`
  })
  text += `*👤 Tú posición:* ${getUserPosition(topLevel, senderId)} de ${Object.keys(allStats).length}\n\n`

  // TOP DIAMANTES
  text += `—◉ *TOP ${topDiamonds.length} DIAMANTES 💎*\n`
  topDiamonds.forEach((user, i) => {
    const mention = '@' + user.id.split('@')[0]
    text += `*${i + 1}.* ${user.id === senderId ? `${mention} (Tú)` : mention} — *${user.money || 0}* diamantes\n`
  })
  text += `*👤 Tú posición:* ${getUserPosition(topDiamonds, senderId)} de ${Object.keys(allStats).length}\n\n`

  text += '*⚔️ En cada paso, esculpe tu leyenda en esta gran aventura. ⚔️*'

  const mentions = [
    ...topExp.map(u => u.id),
    ...topLevel.map(u => u.id),
    ...topDiamonds.map(u => u.id)
  ]
  const uniqueMentions = [...new Set(mentions)]

  await m.reply(text, null, { mentions: uniqueMentions })
}

handler.command = /^lb|leaderboard$/i
handler.tags = ['rpg']
handler.help = ['lb']
export default handler
