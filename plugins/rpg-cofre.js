import fs from 'fs'
import { getUserStats, setUserStats, addExp, addMoney } from '../lib/stats.js'

const handler = async (m, { isPrems, conn }) => {
  const stats = getUserStats(m.sender)

  const idioma = stats.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.rpg_cofre

  const now = Date.now()
  const cooldown = 86400000 // 24 horas
  const lastClaim = stats.lastcofre || 0
  const remaining = cooldown - (now - lastClaim)

  if (remaining > 0) throw `${tradutor.texto1[0]} *${msToTime(remaining)}* ${tradutor.texto1[1]}`

  // Recompensas aleatorias
  const dia = Math.floor(Math.random() * 30)
  const tok = Math.floor(Math.random() * 10)
  const mystic = Math.floor(Math.random() * 4000)
  const expp = Math.floor(Math.random() * 5000)

  // Sumar recompensas
  stats.limit += dia
  stats.money += mystic
  stats.joincount += tok
  addExp(m.sender, expp)

  // Actualizar tiempo de cofre
  stats.lastcofre = now
  setUserStats(m.sender, stats)

  const img = 'https://img.freepik.com/vector-gratis/cofre-monedas-oro-piedras-preciosas-cristales-trofeo_107791-7769.jpg?w=2000'
  const texto = `
${tradutor.texto2[0]}
${tradutor.texto2[1]}
${tradutor.texto2[2]}
║➢ *${dia} ${tradutor.texto2[3]}
║➢ *${tok} ${tradutor.texto2[4]}
║➢ *${mystic} ${tradutor.texto2[5]}
║➢ *${expp} ${tradutor.texto2[6]}
${tradutor.texto2[7]}`

  const fkontak = {
    key: {
      participants: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
      fromMe: false,
      id: 'Halo',
    },
    message: {
      contactMessage: {
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
      },
    },
    participant: '0@s.whatsapp.net',
  }

  await conn.sendFile(m.chat, img, 'mystic.jpg', texto, fkontak)
}

handler.help = ['daily']
handler.tags = ['xp']
handler.command = ['coffer', 'cofre', 'abrircofre', 'cofreabrir']
handler.level = 5
export default handler

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

  hours = (hours < 10) ? '0' + hours : hours
  minutes = (minutes < 10) ? '0' + minutes : minutes
  seconds = (seconds < 10) ? '0' + seconds : seconds

  return hours + ' Horas ' + minutes + ' Minutos'
}
