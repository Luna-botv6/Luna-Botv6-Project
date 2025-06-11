
import fs from 'fs'
import path from 'path'
import { getUserStats } from '../lib/stats.js'

const file = path.join('./database', 'stats.json')

const handler = async (m, { conn, isOwner, isROwner, command }) => {
  if (!isOwner && !isROwner) throw 'Este comando es solo para los *propietarios del bot*.'

  if (!fs.existsSync(file)) throw 'No se encontró la base de datos de estadísticas.'

  const raw = JSON.parse(fs.readFileSync(file))
  const stats = []

  for (const id in raw) {
    const user = getUserStats(id)
    stats.push({ id, ...user })
  }

  stats.sort((a, b) => b.exp - a.exp)

  const top = stats.slice(0, 10)

  let text = `╭━━━〔 *TOP 10 EXP - LunaBotV6* 〕━━━╮\n`
  for (let i = 0; i < top.length; i++) {
    const user = top[i]
    text += `\n${i + 1}. *${user.id.split('@')[0]}*\n`
    text += `   ✨ Nivel: *${user.level}*\n`
    text += `   ⚡ EXP: *${user.exp}*\n`
    text += `   💎 Diamantes: *${user.money}*\n`
    text += `   🪙 LunaCoins: *${user.lunaCoins}*\n`
  }
  text += `\n╰━━━━━━━━━━━━━━━━━━━━━━━╯`

  m.reply(text)
}

handler.command = /^statsglobal|estadisticas$/i
handler.rowner = true
export default handler