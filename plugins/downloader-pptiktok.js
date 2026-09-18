import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY }
const TIMEOUT = 45000

const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, headers = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

const handler = async (m, { conn, text, command, usedPrefix }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.downloader_pptiktok

  const user = String(text || '').trim().replace(/^@/, '')
  if (!user) throw `${tradutor.texto1} ${usedPrefix + command} luisitocomunica`
  await m.reply(global.wait)

  try {
    const res = await ft(SERVER_URL + '/api/social/pptiktok?user=' + encodeURIComponent(user), DL_HEADERS)
    if (!res.ok) throw new Error('Error del servidor')
    const data = await res.json()
    if (!data.status || !data.avatar) throw new Error(data.error || 'No se pudo obtener la foto de perfil')
    await conn.sendFile(m.chat, data.avatar, 'error.jpg', `${tradutor.texto2} ${data.usuario}*`, m)
  } catch (err) {
    m.reply('❌ ' + ocultar(err.message || err))
  }
}

handler.help = ['tiktokfoto'].map((v) => v + ' <username>')
handler.tags = ['downloader']
handler.command = /^(tiktokfoto|pptiktok)$/i
export default handler