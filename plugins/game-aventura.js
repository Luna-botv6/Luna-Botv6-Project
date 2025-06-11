// Archivo: plugins/game-aventura.js

import fs from 'fs'
import path from 'path'
import { addExp, addMoney, removeExp, removeMoney } from '../lib/stats.js'

const cooldownFile = path.join('./database', 'aventuracooldown.json')
if (!fs.existsSync('./database')) fs.mkdirSync('./database')
if (!fs.existsSync(cooldownFile)) fs.writeFileSync(cooldownFile, '{}')

let cooldowns = JSON.parse(fs.readFileSync(cooldownFile))

const aventuras = [
  { tipo: 'cofre', mensaje: '¡Encontraste un cofre escondido en una cueva misteriosa!', exp: 1200, money: 200 },
  { tipo: 'enemigo', mensaje: '¡Luchaste contra un guerrero esqueleto y saliste victorioso!', exp: 1600, money: 350 },
  { tipo: 'aliado', mensaje: 'Un sabio anciano te dio experiencia por ayudarlo.', exp: 1000, money: 300 },
  { tipo: 'trampa', mensaje: '¡Pisaste una trampa mágica! Perdiste un poco...', exp: -600, money: -200 },
  { tipo: 'boss', mensaje: '¡Venciste a un mini-jefe en la mazmorra!', exp: 2200, money: 450 },
  { tipo: 'poción', mensaje: 'Encontraste una poción mágica y subiste de experiencia.', exp: 1400, money: 250 },
  { tipo: 'mercader', mensaje: 'Un mercader perdido te recompensó por escoltarlo.', exp: 1800, money: 400 },
  { tipo: 'oscuro', mensaje: 'Un espíritu oscuro te drenó energía...', exp: -700, money: -150 },
  { tipo: 'hada', mensaje: 'Un hada encantada te bendijo con luz y diamantes.', exp: 2000, money: 300 },
  { tipo: 'ruinas', mensaje: 'Exploraste ruinas antiguas y descubriste tesoros.', exp: 1700, money: 420 },
  { tipo: 'dragón dormido', mensaje: 'Te acercaste sigilosamente a un dragón dormido y robaste tesoros.', exp: 2500, money: 500 }
]

const handler = async (m, { conn, usedPrefix }) => {
  const userId = m.sender
  const timestamp = cooldowns[userId] || 0
  const cooldownTime = 10 * 60 * 1000 // 10 minutos

  if (Date.now() - timestamp < cooldownTime) {
    const remaining = Math.ceil((cooldownTime - (Date.now() - timestamp)) / 1000)
    return m.reply(`⏳ Aún estás recuperándote de tu última aventura...\nVuelve en *${remaining} segundos*.`)
  }

  const aventura = aventuras[Math.floor(Math.random() * aventuras.length)]
  const { exp, money, mensaje } = aventura

  let texto = `*🌍 Aventura iniciada...*\n\n${mensaje}\n\n`

  if (exp > 0) {
    addExp(userId, exp)
    texto += `✨ Ganaste *${exp} XP*\n`
  } else {
    removeExp(userId, -exp)
    texto += `💥 Perdiste *${-exp} XP*\n`
  }

  if (money > 0) {
    addMoney(userId, money)
    texto += `💎 Ganaste *${money} diamantes*\n`
  } else {
    removeMoney(userId, -money)
    texto += `💸 Perdiste *${-money} diamantes*\n`
  }

  texto += `\n🎒 Usa *${usedPrefix}perfil* para ver tus estadísticas.`

  m.reply(texto)
  cooldowns[userId] = Date.now()
  fs.writeFileSync(cooldownFile, JSON.stringify(cooldowns, null, 2))
}

handler.help = ['aventure']
handler.tags = ['rpg']
handler.command = /^aventure$/i

export default handler