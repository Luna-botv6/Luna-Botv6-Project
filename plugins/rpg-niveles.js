import fs from 'fs'
import path from 'path'
import { getUserStats } from '../lib/stats.js'

const statsFile = path.join('./database', 'stats.json')

// 📊 Cargar todos los stats desde el archivo JSON
function loadAllStats() {
  if (!fs.existsSync(statsFile)) return {}
  try {
    return JSON.parse(fs.readFileSync(statsFile, 'utf-8'))
  } catch {
    return {}
  }
}

// 🏆 Obtener los top N usuarios ordenados por clave
function getTopUsers(allStats, key, limit = 10) {
  const arr = Object.entries(allStats).map(([id, data]) => ({
    id,
    ...(typeof data === 'object' ? data : getUserStats(id))
  }))
  arr.sort((a, b) => (b[key] || 0) - (a[key] || 0))
  return arr.slice(0, limit)
}

// 🔍 Buscar la posición de un usuario en el ranking
function getUserPosition(list, id) {
  return list.findIndex(u => u.id === id) + 1 || 0
}

const handler = async (m, { command }) => {
  const allStats = loadAllStats()
  
  if (!allStats || Object.keys(allStats).length === 0) {
    return m.reply('❌ No hay datos de aventureros para mostrar.')
  }

  const senderId = m.sender
  const topExp = getTopUsers(allStats, 'exp')
  const topLevel = getTopUsers(allStats, 'level')
  const topDiamonds = getTopUsers(allStats, 'money')

  // 🎨 MENSAJE BONITO PARA WHATSAPP
  let text = `╔══════════════════════╗
║ 🏆𝐓𝐀𝐁𝐋𝐀 𝐃𝐄 𝐀𝐕𝐄𝐍𝐓𝐔𝐑𝐄𝐑𝐎𝐒 
║  ⚔️ 𝐌Á𝐒 𝐃𝐄𝐒𝐓𝐀𝐂𝐀𝐃𝐎𝐒 ⚔️        
╚══════════════════════╝

┌─────────────────────┐
│🌟 𝐓𝐎𝐏 ${topExp.length} 𝐄𝐗𝐏𝐄𝐑𝐈𝐄𝐍𝐂𝐈𝐀 🌟    
└─────────────────────┘

`

  // 🌟 TOP EXP
  topExp.forEach((user, i) => {
    const mention = '@' + user.id.split('@')[0]
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'
    text += `${medal} *${i + 1}.* ${user.id === senderId ? `${mention} ⭐(𝐓ú)⭐` : mention} ➤ *${user.exp || 0}* exp ✨\n`
  })
  text += `\n💫 *Tu posición:* ${getUserPosition(topExp, senderId)} de ${Object.keys(allStats).length} aventureros\n\n`

  // 🎚️ TOP NIVEL
  text += `┌─────────────────────┐
│      🎚️ 𝐓𝐎𝐏 ${topLevel.length} 𝐍𝐈𝐕𝐄𝐋 🎚️   
└─────────────────────┘

`
  topLevel.forEach((user, i) => {
    const mention = '@' + user.id.split('@')[0]
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'
    text += `${medal} *${i + 1}.* ${user.id === senderId ? `${mention} ⭐(𝐓ú)⭐` : mention} ➤ *${user.level || 0}* nivel 🆙\n`
  })
  text += `\n💫 *Tu posición:* ${getUserPosition(topLevel, senderId)} de ${Object.keys(allStats).length} aventureros\n\n`

  // 💎 TOP DIAMANTES
  text += `┌─────────────────────┐
│💎 𝐓𝐎𝐏 ${topDiamonds.length} 𝐃𝐈𝐀𝐌𝐀𝐍𝐓𝐄𝐒 💎     
└─────────────────────┘

`
  topDiamonds.forEach((user, i) => {
    const mention = '@' + user.id.split('@')[0]
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'
    text += `${medal} *${i + 1}.* ${user.id === senderId ? `${mention} ⭐(𝐓ú)⭐` : mention} ➤ *${user.money || 0}* diamantes 💰\n`
  })
  text += `\n💫 *Tu posición:* ${getUserPosition(topDiamonds, senderId)} de ${Object.keys(allStats).length} aventureros\n\n`

  text += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
⚔️ 𝙀𝙣 𝙘𝙖𝙙𝙖 𝙥𝙖𝙨𝙤, 𝙚𝙨𝙘𝙪𝙡𝙥𝙚 𝙩𝙪 𝙡𝙚𝙮𝙚𝙣𝙙𝙖 
      𝙚𝙣 𝙚𝙨𝙩𝙖 𝙜𝙧𝙖𝙣 𝙖𝙫𝙚𝙣𝙩𝙪𝙧𝙖 ⚔️
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`

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
