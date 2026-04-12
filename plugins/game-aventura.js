import fs from 'fs'
import path from 'path'
import { addExp, addMoney, removeExp, removeMoney } from '../lib/stats.js'

const cooldownFile = path.join('./database', 'aventuracooldown.json')
if (!fs.existsSync('./database')) fs.mkdirSync('./database')
if (!fs.existsSync(cooldownFile)) fs.writeFileSync(cooldownFile, '{}')
let cooldowns = JSON.parse(fs.readFileSync(cooldownFile))

const aventuraStats = [
  { exp: 1200,  money: 200  },
  { exp: 1600,  money: 350  },
  { exp: 1000,  money: 300  },
  { exp: -600,  money: -200 },
  { exp: 2200,  money: 450  },
  { exp: 1400,  money: 250  },
  { exp: 1800,  money: 400  },
  { exp: -700,  money: -150 },
  { exp: 2000,  money: 300  },
  { exp: 1700,  money: 420  },
  { exp: 2500,  money: 500  }
]

const handler = async (m, { conn, usedPrefix }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.game_aventura

  const userId = m.sender
  const timestamp = cooldowns[userId] || 0
  const cooldownTime = 10 * 60 * 1000

  if (Date.now() - timestamp < cooldownTime) {
    const remaining = Math.ceil((cooldownTime - (Date.now() - timestamp)) / 1000)
    return m.reply(t.cooldown.replace('{seg}', remaining))
  }

  const idx = Math.floor(Math.random() * t.aventuras.length)
  const aventura = t.aventuras[idx]
  const stats = aventuraStats[idx]
  const { exp, money } = stats

  let texto = `${t.titulo}\n\n${aventura.mensaje}\n\n`

  if (exp > 0) {
    addExp(userId, exp)
    texto += `${t.gan_exp.replace('{val}', exp)}\n`
  } else {
    removeExp(userId, -exp)
    texto += `${t.per_exp.replace('{val}', -exp)}\n`
  }

  if (money > 0) {
    addMoney(userId, money)
    texto += `${t.gan_money.replace('{val}', money)}\n`
  } else {
    removeMoney(userId, -money)
    texto += `${t.per_money.replace('{val}', -money)}\n`
  }

  texto += `\n${t.footer.replace('{prefix}', usedPrefix)}`

  m.reply(texto)
  cooldowns[userId] = Date.now()
  fs.writeFileSync(cooldownFile, JSON.stringify(cooldowns, null, 2))
}

handler.help = ['aventure']
handler.tags = ['rpg']
handler.command = /^(aventure|adventure)$/i
export default handler