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

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.downloader_tiktokstalk

  const user = String(text || '').trim().replace(/^@/, '')
  if (!user) return conn.reply(m.chat, tradutor.texto1 + ' ' + `${usedPrefix + command} luisitocomunica`, m)

  try {
    const res = await ft(SERVER_URL + '/api/social/pptiktok?user=' + encodeURIComponent(user), DL_HEADERS)
    if (!res.ok) throw new Error('Error del servidor')
    const data = await res.json()
    if (!data.status) throw new Error(data.error || 'No se pudo obtener la información')

    const info = `
${tradutor.texto2[0]} ${data.usuario || 'Sin Información'}
${tradutor.texto2[1]} ${data.nombre || 'Sin Información'}
${tradutor.texto2[2]} ${data.stats?.seguidores || 'Sin Información'}
${tradutor.texto2[3]} ${data.stats?.siguientes || 'Sin Información'}
${tradutor.texto2[4]} ${data.stats?.likes || 'Sin Información'}
${tradutor.texto2[5]} ${data.stats?.videos || 'Sin Información'}
${tradutor.texto2[6]} ${data.firma || 'Sin Información'}
`.trim()

    await conn.sendFile(m.chat, data.avatar, 'profile.jpg', info, m)
  } catch (e) {
    throw tradutor.texto3 + '\n' + ocultar(e.message || e)
  }
}

handler.help = ['tiktokstalk'].map((v) => v + ' <username>')
handler.tags = ['stalk']
handler.command = /^(tiktokstalk|ttstalk)$/i
export default handler