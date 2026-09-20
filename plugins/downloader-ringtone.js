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
const TIMEOUT = 30000

const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, headers = {}) => {
	const c = new AbortController()
	const t = setTimeout(() => c.abort(), TIMEOUT)
	try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r }
	catch (e) { clearTimeout(t); throw e }
}

const handler = async (m, { conn, usedPrefix, text, command }) => {
	const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
	const tradutor = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))?.plugins?.downloader_ringtone || {}
	if (!text) throw `${tradutor.texto1 || 'Ingresá un nombre de tono'} *${usedPrefix + command} Hola*`
	try {
		const res = await ft(SERVER_URL + '/api/ringtone?q=' + encodeURIComponent(text.trim()), DL_HEADERS)
		if (!res.ok) throw new Error('Error del servidor')
		const data = await res.json()
		if (!data.status || !Array.isArray(data.tonos) || !data.tonos.length) throw new Error(data.error || 'Sin resultados')
		const tono = data.tonos[Math.floor(Math.random() * data.tonos.length)]
		if (!tono.audio) throw new Error('Sin audio disponible')
		await conn.sendMessage(m.chat, { audio: { url: tono.audio }, fileName: (tono.title || 'ringtone') + '.mp3', mimetype: 'audio/mpeg' }, { quoted: m })
	} catch (e) {
		m.reply('❌ ' + ocultar(e.message || e))
	}
}

handler.command = ['ringtone']
handler.help = ['ringtone'].map(v => v + ' <nombre>')
handler.tags = ['downloader']
export default handler