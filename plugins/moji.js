import fetch from 'node-fetch'
import { sticker } from '../src/libraries/sticker.js'

const urlDe = (cp) => `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${cp}.png`

const conseguirEmoji = async (emoji) => {
  const full = [...emoji].map(c => c.codePointAt(0).toString(16)).join('-')
  const candidatas = [full, full.replace(/-fe0f/g, '')]
  for (const cp of candidatas) {
    const url = urlDe(cp)
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 8000)
      try {
        const r = await fetch(url, { method: 'HEAD', signal: c.signal })
        if (r.ok) return url
      } finally { clearTimeout(t) }
    } catch {}
  }
  return null
}

const handler = async (m, { conn, text }) => {
  if (!text) throw '*🌅 Ingresa un emoji.*'
  try {
    const url = await conseguirEmoji(text.trim())
    if (!url) throw new Error('no-source')
    const stiker = await sticker(false, url, global.packname, global.author)
    if (!Buffer.isBuffer(stiker)) throw new Error('no-sticker')
    const stickerBuffer = Buffer.isBuffer(stiker) ? stiker : Buffer.from(stiker)
    await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
  } catch (e) {
    m.reply('*🍟 Emoji no compatible.*')
  }
}
handler.help = ['moji'].map(v => v + ' emoji')
handler.tags = ['emoji']
handler.command = /^(moji|mojit)$/i
export default handler