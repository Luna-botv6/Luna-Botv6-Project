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
	const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
	const tradutor = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))?.plugins?.downloader_tiktok_img || {}
	const t1 = tradutor.texto1 || `⚠️ Ingresá el enlace de TikTok\n*${usedPrefix + command} url*`
	if (!text || !/tiktok\.com/i.test(text)) throw t1
	await m.reply(global.wait)
	try {
		const res = await ft(SERVER_URL + '/api/tiktok/img?url=' + encodeURIComponent(text.trim()), DL_HEADERS)
		if (!res.ok) throw new Error('Error del servidor')
		const data = await res.json()
		if (!data.status || !Array.isArray(data.images) || !data.images.length) throw new Error(data.error || 'No se pudo obtener la imagen')
		for (const img of data.images) {
			await conn.sendFile(m.chat, img, 'tt.jpg', '', m)
		}
	} catch (e) {
		m.reply('❌ ' + ocultar(e.message || e))
	}
}

handler.command = /^(ttimg|tiktokimg)$/i
export default handler