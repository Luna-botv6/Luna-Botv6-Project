import fetch from 'node-fetch'

const GIF_URL = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/InShot_20260315_144951431.mp4'

const handler = async (m, { conn, participants }) => {

if (!m.isGroup) return m.reply('Este comando solo funciona en grupos')

if (!m.mentionedJid || m.mentionedJid.length === 0) {
return m.reply('Usa el comando así:\n/similarc @usuario')
}

const birthdayJids = m.mentionedJid
const meta = await conn.groupMetadata(m.chat)
const allParticipants = meta.participants.map(p => p.id)

const cantCumple = birthdayJids.length
const hidetag = '\u200e'.repeat(850) + allParticipants.map(p => ` @${p.split('@')[0]}`).join('')

const nombresCumple = birthdayJids.map(j => `@${j.split('@')[0]}`).join(', ')

const msg =
'🎂 *FELIZ CUMPLEAÑOS* 🎂\n' +
`🎉 Hoy celebramos el cumpleaños de ${nombresCumple}! 🎂\n\n` +
'🥳 Que tengas un día increíble lleno de alegría,\n' +
'   amor y muchas sorpresas. Lo merecés todo! 💜\n\n' +
'🎈🎁🎊🌟✨🎆🎇🪅🎠\n' +
hidetag;

const gifBuffer = await fetch(GIF_URL).then(r => r.arrayBuffer()).then(b => Buffer.from(b))

await conn.sendMessage(m.chat,{
video: gifBuffer,
caption: msg,
    mentions: [...allParticipants, ...birthdayJids],
gifPlayback: true
},{quoted:m})

}

handler.command = ['similarc']
export default handler