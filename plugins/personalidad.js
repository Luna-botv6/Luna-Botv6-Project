import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const BASE_IMG = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/otros/'

const GENDER_IMG = {
  'Hombre':            'hombre.jpeg',
  'Mujer':             'mujer.jpg',
  'Homosexual':        'homosexual.jpg',
  'Bisexual':          'bisexual.jpg',
  'Pansexual':         'pansexual.jpeg',
  'Feminista':         'feminista.jpg',
  'Macho alfa':        'machoalfa.webp',
  'Marimacha':         'marimacha.jpg',
  'PlayStationSexual': 'playstationsexual.png',
  'Sr. Manuela':       'Srmanuela.jpg',
  'Pollosexual':       'pollosexual.jpeg',
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

  const genero = pick([
    'Hombre', 'Mujer', 'Homosexual', 'Bisexual', 'Pansexual',
    'Feminista', 'Heterosexual', 'Macho alfa', 'Mujerzona',
    'Marimacha', 'Palosexual', 'PlayStationSexual', 'Sr. Manuela', 'Pollosexual'
  ])

  const resultado =
    `╭━━━「 🎭 *PERSONALIDAD* 」━━━╮\n` +
    `┃\n` +
    `┃ 👤 *Nombre* › ${nombre}\n` +
    `┃ 🏳️‍🌈 *Género* › ${genero}\n` +
    `┃\n` +
    `┃ ✅ *Buena Moral* › ${pick(PORCENTAJES)}\n` +
    `┃ ❌ *Mala Moral* › ${pick(PORCENTAJES)}\n` +
    `┃ 💎 *Tipo de persona* › ${pick(['De buen corazón','Arrogante','Tacaño','Generoso','Humilde','Tímido','Cobarde','Entrometido','Cristal','No binarie XD','Pendejo'])}\n` +
    `┃ ⏰ *Siempre está* › ${pick(['Pesado','De malas','Distraído','De molestoso','Chismoso','Jalandosela','De compras','Viendo anime','Chateando porque está soltero','Acostado bueno para nada','De mujeriego','En el celular'])}\n` +
    `┃\n` +
    `┃ 🧠 *Inteligencia* › ${pick(PORCENTAJES)}\n` +
    `┃ 💤 *Morosidad* › ${pick(PORCENTAJES)}\n` +
    `┃ 🔥 *Coraje* › ${pick(PORCENTAJES)}\n` +
    `┃ 😱 *Miedo* › ${pick(PORCENTAJES)}\n` +
    `┃ 🌟 *Fama* › ${pick(PORCENTAJES)}\n` +
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
