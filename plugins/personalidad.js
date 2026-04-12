import fs from 'fs'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const BASE_IMG = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/otros/'

const GENDER_IMG = {
  'Hombre': 'hombre.jpeg',
  'Mujer': 'mujer.jpg',
  'Homosexual': 'homosexual.jpg',
  'Bisexual': 'bisexual.jpg',
  'Pansexual': 'pansexual.jpeg',
  'Feminista': 'feminista.jpg',
  'Macho alfa': 'machoalfa.webp',
  'Marimacha': 'marimacha.jpg',
  'PlayStationSexual': 'playstationsexual.png',
  'Sr. Manuela': 'Srmanuela.jpg',
  'Pollosexual': 'pollosexual.jpeg',
}

const PORCENTAJES = [
  '0%','0,4%','1%','2,9%','6%','12%','20%','27%',
  '35%','41%','49%','54%','60%','66%','73%','78%',
  '84%','92%','93%','94%','96%','98,3%','99,7%','99,9%'
]

const pick = list => list[Math.floor(Math.random() * list.length)]

const resolveLid = async (jid, conn, m) => {
  if (!jid.includes('@lid') || !m.isGroup) return jid
  const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender)
  return participants.find(p => p.lid === jid)?.id || jid
}

var handler = async (m, { conn, text }) => {

  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.personalidad

  let nombre = text?.trim()
  let mentions = []

  if (m.mentionedJid?.length) {
    const realJid = await resolveLid(m.mentionedJid[0], conn, m)
    mentions = [realJid]
    nombre = `@${realJid.split('@')[0]}`
  }

  if (!nombre) {
    const realSender = await resolveLid(m.sender, conn, m)
    mentions = [realSender]
    nombre = `@${realSender.split('@')[0]}`
  }

  const genero = pick(tradutor.generos)

  const resultado =
    `╭━━━「 🎭 *${tradutor.titulo}* 」━━━╮\n` +
    `┃\n` +
    `┃ 👤 *${tradutor.nombre}* › ${nombre}\n` +
    `┃ 🏳️‍🌈 *${tradutor.genero}* › ${genero}\n` +
    `┃\n` +
    `┃ ✅ *${tradutor.buena}* › ${pick(PORCENTAJES)}\n` +
    `┃ ❌ *${tradutor.mala}* › ${pick(PORCENTAJES)}\n` +
    `┃ 💎 *${tradutor.tipo}* › ${pick(tradutor.tipos)}\n` +
    `┃ ⏰ *${tradutor.estado}* › ${pick(tradutor.estados)}\n` +
    `┃\n` +
    `┃ 🧠 *${tradutor.inteligencia}* › ${pick(PORCENTAJES)}\n` +
    `┃ 💤 *${tradutor.morosidad}* › ${pick(PORCENTAJES)}\n` +
    `┃ 🔥 *${tradutor.coraje}* › ${pick(PORCENTAJES)}\n` +
    `┃ 😱 *${tradutor.miedo}* › ${pick(PORCENTAJES)}\n` +
    `┃ 🌟 *${tradutor.fama}* › ${pick(PORCENTAJES)}\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━╯`

  const imgFile = GENDER_IMG[genero]

  if (imgFile) {
    await conn.sendMessage(
      m.chat,
      { image: { url: BASE_IMG + imgFile }, caption: resultado, mentions },
      { quoted: m }
    )
  } else {
    await conn.sendMessage(
      m.chat,
      { text: resultado, mentions },
      { quoted: m }
    )
  }
}

handler.tags = ['fun']
handler.command = ['personalidad']

export default handler