import fs from 'fs'
import { getLastMiningTime, setLastMiningTime, initMiningUser } from '../lib/minar.js'
import { addExp } from '../lib/stats.js'

const handler = async (m, { conn }) => {
  const userId = m.sender
  await initMiningUser(userId)

  const idioma = global.db?.data?.users?.[userId]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`, 'utf-8'))
  const tradutor = _translate.plugins.rpg_minar

  const cooldown = 600000 // 10 minutos
  const lastTime = await getLastMiningTime(userId)
  const now = Date.now()

  if (now - lastTime < cooldown) {
    const remaining = cooldown - (now - lastTime)
    throw `${tradutor.texto1[0]} ${msToTime(remaining)} ${tradutor.texto1[1]}`
  }

  const expGained = Math.floor(Math.random() * 1901) + 100 // entre 100 y 2000
  await setLastMiningTime(userId, now)
  addExp(userId, expGained)

  const message = `
╭━〔 *Minería exitosa* 〕━⬣
┃⛏️ Has minado con tu pico virtual...
┃✨ Ganaste *${expGained}* puntos de experiencia
┃⌛ Podrás minar de nuevo en *10 minutos*
╰━━━━━━━━━━━━━━━━━━⬣`.trim()

  m.reply(message)
}

handler.help = ['minar']
handler.tags = ['xp']
handler.command = ['minar', 'mine', 'miming']
handler.fail = null
handler.exp = 0

export default handler

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}