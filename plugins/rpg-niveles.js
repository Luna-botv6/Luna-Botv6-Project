import fs from 'fs'
import path from 'path'
import { getUserStats } from '../lib/stats.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const statsFile = path.join('./database', 'stats.json')

function loadAllStats() {
  if (!fs.existsSync(statsFile)) return {}
  try {
    return JSON.parse(fs.readFileSync(statsFile, 'utf-8'))
  } catch {
    return {}
  }
}

const handler = async (m, { conn }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_leaderboard

  const allStats = loadAllStats()

  if (!allStats || Object.keys(allStats).length === 0) {
    return m.reply(`❌ ${tradutor.texto1}`)
  }

  const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender)

  const realSender = (() => {
    if (!m.sender?.includes('@lid')) return conn.decodeJid(m.sender)
    const p = participants.find(x => x.lid === m.sender)
    return p ? conn.decodeJid(p.id) : conn.decodeJid(m.sender)
  })()

  const senderNum = realSender.split('@')[0]

  const groupStats = []
  for (const p of participants) {
    const realJid = conn.decodeJid(p.id)
    const realNum = realJid.split('@')[0]
    let statsData = allStats[realNum]

    if (!statsData && p.lid) {
      const lidNum = p.lid.replace('@lid', '').replace(/[^0-9]/g, '')
      statsData = allStats[lidNum]
    }

    if (!statsData) continue

    groupStats.push({
      jid: realJid,
      num: realNum,
      ...(typeof statsData === 'object' ? statsData : getUserStats(realNum))
    })
  }

  if (groupStats.length === 0) {
    return m.reply(`❌ ${tradutor.texto2}`)
  }

  const top = (key, limit = 10) =>
    [...groupStats].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, limit)

  const topExp = top('exp')
  const topLevel = top('level')
  const topMoney = top('money')

  const total = groupStats.length
  const medals = ['🥇', '🥈', '🥉']
  const medal = i => medals[i] ?? '🏅'

  const row = (user, i) => {
    const isSelf = user.num === senderNum
    return `${medal(i)} *${i + 1}.* @${user.num}${isSelf ? ' ⭐' : ''}`
  }

  const pos = (list) => {
    const p = list.findIndex(u => u.num === senderNum) + 1
    return p ? `_📍 ${tradutor.texto3} #${p} ${tradutor.texto4} ${total}_` : `_📍 ${tradutor.texto5}_`
  }

  let text = `⚔️ *${tradutor.texto6}* ⚔️\n`
  text += `▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱\n\n`

  text += `✨ *${tradutor.texto7}*\n`
  topExp.forEach((u, i) => { text += `${row(u, i)} ➤ *${u.exp || 0}* exp\n` })
  text += `${pos(topExp)}\n\n`

  text += `🎚️ *${tradutor.texto8}*\n`
  topLevel.forEach((u, i) => { text += `${row(u, i)} ➤ ${tradutor.texto11} *${u.level || 0}*\n` })
  text += `${pos(topLevel)}\n\n`

  text += `💎 *${tradutor.texto9}*\n`
  topMoney.forEach((u, i) => { text += `${row(u, i)} ➤ *${u.money || 0}* 💎\n` })
  text += `${pos(topMoney)}\n\n`

  text += `▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱\n`
  text += `_⚔️ ${tradutor.texto10}_`

  const mentions = [...new Set([
    ...topExp.map(u => u.jid),
    ...topLevel.map(u => u.jid),
    ...topMoney.map(u => u.jid)
  ])]

  await m.reply(text, null, { mentions })
}

handler.command = /^lb|leaderboard$/i
handler.tags = ['rpg']
handler.help = ['lb']

export default handler