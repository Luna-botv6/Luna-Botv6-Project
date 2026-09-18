import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY, 'Content-Type': 'application/json' }
const TIMEOUT = 30000

const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, options = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { ...options, signal: c.signal }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

const handler = async (m, { conn, text }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.downloader_soundcloud
  if (!text) throw `${tradutor.texto1}`
  try {
    const searchRes = await ft(`${SERVER_URL}/api/soundcloud/search?q=${encodeURIComponent(text.trim())}&n=1`, { headers: DL_HEADERS })
    const sj = await searchRes.json()
    if (!sj.status || !sj.data?.length) throw new Error('Sin resultados')
    const track = sj.data[0]
    const dlRes = await ft(`${SERVER_URL}/api/soundcloud/download?url=${encodeURIComponent(track.url)}`, { headers: DL_HEADERS })
    const dj = await dlRes.json()
    if (!dj.status || !dj.data?.url) throw new Error('Sin stream disponible')
    const d = dj.data
    const soundcloudt = `*亗 S O U N D C L O U D*\n\n*› Titulo :* ${d.title || '-'}\n*› Artista:* ${d.author || '-'}\n*› Likes :* ${track.likes || '-'}\n*› Url :* ${ocultar(track.url) || '-'}`
    if (d.image) {
      await conn.sendFile(m.chat, d.image, '', soundcloudt, m)
    } else {
      await conn.sendMessage(m.chat, { text: soundcloudt }, { quoted: m })
    }
    await conn.sendMessage(m.chat, { audio: { url: d.url }, fileName: `${(d.title || 'audio').replace(/[\\/:*?"<>|]/g, '_')}.mp3`, mimetype: 'audio/mpeg' }, { quoted: m })
  } catch {
    throw `${tradutor.texto3}`
  }
}
handler.command = /^(soundcloud|cover)$/i
export default handler