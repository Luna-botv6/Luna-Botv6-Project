import fs from 'fs'
import { getMuteInfo } from './gc-mute.js'

const handler = async (m, { conn }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.lista_mute

  if (!m.isGroup) return m.reply(t.solo_grupos)

  const db = global.db?.data?.mutes || {}
  const prefix = m.chat + '_'
  const now = Date.now()

  const activos = Object.entries(db).filter(([key, entry]) => {
    if (!key.startsWith(prefix)) return false
    if (entry.until && now > entry.until) return false
    return true
  })

  if (activos.length === 0) return m.reply(t.sin_silenciados)

  const vistos = new Set()
  const lineas = []
  const menciones = []
  let idx = 1

  for (const [key, entry] of activos) {
    const userJid = key.replace(prefix, '')
    const num = userJid.replace(/[^0-9]/g, '')
    if (vistos.has(num)) continue
    vistos.add(num)
    const jid = userJid.includes('@') ? userJid : num + '@s.whatsapp.net'
    menciones.push(jid)
    const tiempoRest = entry.until
      ? t.expira.replace('{min}', Math.ceil((entry.until - now) / 60000))
      : t.sin_limite
    lineas.push(`${idx}. @${num} — ${tiempoRest}`)
    idx++
  }

  const texto = `${t.titulo}\n\n${lineas.join('\n')}\n\n${t.total} ${lineas.length} ${t.usuarios}`
  await conn.sendMessage(m.chat, { text: texto, mentions: menciones }, { quoted: m })
}

handler.help = ['listamute']
handler.tags = ['group']
handler.command = /^listamute$/i
handler.group = true

export default handler
