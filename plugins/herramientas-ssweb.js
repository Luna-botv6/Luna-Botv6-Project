import fs from 'fs'
import fetch from 'node-fetch'

const handler = async (m, { conn, args }) => {
  try {
    const datas = global
    const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
    const tradutor = _translate.plugins.herramientas_ssweb

    if (!args[0]) {
      return conn.reply(m.chat, tradutor.texto1, m)
    }

    let url = args[0].trim()

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url
    }

    const api = `https://api.screenshotmachine.com/?key=38863b&url=${encodeURIComponent(url)}&dimension=1024x768`

    const res = await fetch(api)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const type = res.headers.get('content-type') || ''

    if (!type.includes('image')) {
      throw new Error('No devolvió imagen')
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    await conn.sendMessage(
      m.chat,
      {
        image: buffer,
        caption: `📸 Captura\n${url}`
      },
      {
        quoted: m
      }
    )

  } catch (e) {
    console.error('[SSWEB ERROR]', e)

    await conn.reply(
      m.chat,
      `❌ Error screenshot:\n${e.message}`,
      m
    )
  }
}

handler.help = ['ssweb <url>']
handler.tags = ['internet']
handler.command = /^ss(web)?f?$/i

export default handler