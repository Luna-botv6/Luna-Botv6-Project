import fs from 'fs'
import { getUserStats, spendMoney, spendExp, setUserStats } from '../lib/stats.js'
import { activarProteccion } from '../lib/usarprote.js'

const handler = async (m, { conn, args, usedPrefix }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.comprarprote

  const userId = m.sender
  const user = getUserStats(userId)

  const opcionesProte = [
    { horas: 2,  costoDiamantes: 400, costoExp: 1600, gananciaMysticcoins: 10 },
    { horas: 5,  costoDiamantes: 600, costoExp: 2400, gananciaMysticcoins: 20 },
    { horas: 12, costoDiamantes: 800, costoExp: 3000, gananciaMysticcoins: 30 },
    { horas: 24, costoDiamantes: 900, costoExp: 4000, gananciaMysticcoins: 50 }
  ]

  if (!args[0]) {
    let texto = `${t.texto1}\n\n`
    opcionesProte.forEach(op => {
      texto += `- ${op.horas} ${t.texto2} → 💎 ${op.costoDiamantes} ${t.texto3} + ✨ ${op.costoExp} Exp\n`
    })
    texto += `\n${t.texto4}\n${usedPrefix}comprarprote <horas>\n${t.texto5}`
    await conn.sendMessage(m.chat, { text: texto }, { quoted: m })
    return
  }

  const horas = parseInt(args[0])
  const prote = opcionesProte.find(op => op.horas === horas)
  if (!prote) return conn.sendMessage(m.chat, { text: t.texto6 }, { quoted: m })

  if (user.money < prote.costoDiamantes || user.exp < prote.costoExp) {
    let falta = []
    if (user.money < prote.costoDiamantes) falta.push(t.texto7)
    if (user.exp < prote.costoExp) falta.push(t.texto8)
    return conn.sendMessage(m.chat, { text: `${t.texto9} ${falta.join(' y ')}` }, { quoted: m })
  }

  spendMoney(userId, prote.costoDiamantes)
  spendExp(userId, prote.costoExp)
  user.mysticcoins = (user.mysticcoins || 0) + prote.gananciaMysticcoins
  setUserStats(userId, user)
  await activarProteccion(m, conn, horas.toString())
  await conn.sendMessage(m.chat, { text: `${t.texto10} ${horas} ${t.texto2}.\n${t.texto11} ${prote.gananciaMysticcoins} mysticcoins.` }, { quoted: m })
}

handler.help = ['comprarprote <horas>']
handler.tags = ['econ']
handler.command = /^comprarprote$/i
export default handler