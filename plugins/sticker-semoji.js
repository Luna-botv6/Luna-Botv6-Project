import { stickerServer } from '../src/libraries/sticker.js'
import fetch from 'node-fetch'
import fs from 'fs'

const urlDe = (cp) => `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${cp}.png`

const conseguirUrl = async (emoji) => {
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

const handler = async (m, { usedPrefix, conn, args, text, command }) => {

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es'
  let _t = {}
  try {
    const _lang = idioma || global.defaultLenguaje || 'es'
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${_lang}.json`, 'utf8'))
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')) } catch {}
  }
  const tradutor = _t.plugins.sticker_semoji

  let [tipe, emoji] = text.includes('|') ? text.split('|') : args
  const defaultType = 'apple'

  if (tipe && !emoji) {
    emoji = '😎'
    tipe = defaultType
  }

  const err = `${tradutor.texto1[0]}
*◉ ${usedPrefix + command} ${tradutor.texto1[1]}

${tradutor.texto1[0]}
*◉ ${usedPrefix + command}* ${tradutor.texto1[2]}

${tradutor.texto1[3]}

${tradutor.texto1[4]}
${tradutor.texto1[5]}
${tradutor.texto1[6]}
${tradutor.texto1[7]}
${tradutor.texto1[8]}
${tradutor.texto1[9]}
${tradutor.texto1[10]}
${tradutor.texto1[11]}
${tradutor.texto1[12]}
${tradutor.texto1[13]}
${tradutor.texto1[14]}

${tradutor.texto1[0]}`

  if (!emoji) throw err

  const typess = {
    mo: 'mozilla',
    op: 'openmoji',
    pi: 'joypixels',
    sa: 'samsung',
    go: 'google',
    wha: 'whatsapp',
    fa: 'facebook',
    ap: 'apple',
    mi: 'microsoft',
    ht: 'htc',
    tw: 'twitter',
  }

  tipe = tipe && typess[tipe] ? typess[tipe] : defaultType

  try {
    emoji = emoji.trim()
    tipe = tipe.trim().toLowerCase()

    const chosenURL = await conseguirUrl(emoji)
    if (!chosenURL) throw new Error('Sin fuente para el emoji')

    const res = await fetch(chosenURL)
    if (res.status !== 200) throw new Error('No se pudo descargar el emoji')
    const emojiBuffer = await res.buffer()

    const stiker = await stickerServer(emojiBuffer, false, global.packname, global.author, [], {})

    const stickerBuffer = Buffer.isBuffer(stiker) ? stiker : Buffer.from(stiker)
    await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })

  } catch (e) {
    console.log(new Error(e).message)
    throw tradutor.texto2
  }
}

handler.help = ['emoji <tipo> <emoji>']
handler.tags = ['sticker']
handler.command = ['emoji', 'smoji', 'semoji']

export default handler