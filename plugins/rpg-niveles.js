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
  const allStats = loadAllStats()

  if (!allStats || Object.keys(allStats).length === 0) {
    return m.reply('❌ No hay aventureros registrados aún.')
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
    return m.reply('❌ Ningún aventurero de este grupo tiene estadísticas aún.')
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
    return p ? `_📍 Tu posición: #${p} de ${total}_` : `_📍 No estás en el top_`
  }

  let text = `⚔️ *Los tops de este grupo* ⚔️\n`
  text += `▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱\n\n`

  text += `✨ *Top Experiencia*\n`
  topExp.forEach((u, i) => { text += `${row(u, i)} ➤ *${u.exp || 0}* exp\n` })
  text += `${pos(topExp)}\n\n`

  text += `🎚️ *Top Nivel*\n`
  topLevel.forEach((u, i) => { text += `${row(u, i)} ➤ nivel *${u.level || 0}*\n` })
  text += `${pos(topLevel)}\n\n`

  text += `💎 *Top Diamantes*\n`
  topMoney.forEach((u, i) => { text += `${row(u, i)} ➤ *${u.money || 0}* 💎\n` })
  text += `${pos(topMoney)}\n\n`

  text += `▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱\n`
  text += `_⚔️ Cada paso forja tu leyenda_`

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
