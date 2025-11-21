import fs from 'fs'

const handler = (m) => m

handler.all = async function (m, { conn }) {
  try {
   
    if (!m || m.fromMe || m.isBaileys) return

    const text = (m.text || '').trim()
    if (!text) return

  
    if (text.length < 2) return

    const chat = (global.db.data.chats && global.db.data.chats[m.chat]) || {}
    if (chat.isBanned) return

   
    if (!/^bot$/i.test(text)) return

    const vn = './src/assets/audio/01J67301CY64MEGCXYP1NRFPF1.mp3'
    if (!fs.existsSync(vn)) {
      console.log('Audio de saludo no encontrado:', vn)
      return
    }

    try {
      await conn.sendPresenceUpdate('recording', m.chat)
      await m.reply('*Hola, ¿Cómo puedo ayudarte?*')

      await conn.sendMessage(
        m.chat,
        {
          audio: { url: vn },
          fileName: 'bot.mp3',
          mimetype: 'audio/mpeg',
          ptt: true
        },
        { quoted: m }
      )
    } catch (e) {
      console.error('Error enviando audio de "bot":', e)
    }
  } catch (e) {
    console.error('Error en cmd-processor (bot):', e)
  }

  return !0
}

export default handler
