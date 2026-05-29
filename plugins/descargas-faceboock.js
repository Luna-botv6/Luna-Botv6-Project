import { getFbVideoInfo } from 'fb-downloader-scrapper'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = await import(`../src/lunaidiomas/${idioma}.json`, { with: { type: 'json' } })
  const t = _translate.default.plugins.facebook_dl
  const example = `${usedPrefix + command} https://www.facebook.com/reel/1341328334215918`

  if (!text) return conn.reply(m.chat, t.no_text.replace('{example}', example), m)

  if (!/(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/\S+/i.test(text)) {
    return conn.reply(m.chat, t.invalid_url.replace('{example}', example), m)
  }

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } })
  await conn.reply(m.chat, t.downloading, m)

  try {
    const result = await getFbVideoInfo(text)

    if (!result) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return conn.reply(m.chat, t.no_video, m)
    }

    const url = result.hd || result.sd
    if (!url) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return conn.reply(m.chat, t.no_url, m)
    }

    await conn.sendMessage(
      m.chat,
      { video: { url }, mimetype: 'video/mp4', caption: t.success_caption },
      { quoted: m }
    )
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (error) {
    console.error('[FB-DL] Error:', error?.message)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return conn.reply(m.chat, t.error, m)
  }
}

handler.help = ['facebook', 'fb']
handler.tags = ['downloader']
handler.command = /^(facebook|fb|facebookdl|fbdl)$/i
export default handler