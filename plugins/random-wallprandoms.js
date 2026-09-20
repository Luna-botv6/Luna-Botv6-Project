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

const ft = async (url, headers = {}) => {
	const c = new AbortController()
	const t = setTimeout(() => c.abort(), TIMEOUT)
	try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r }
	catch (e) { clearTimeout(t); throw e }
}

const TEMAS = {
	wpmontaña: 'mountain',
	pubg: ['pubg', 'playerunknowns battlegrounds', 'pubg mobile'],
	wpgaming: ['gaming', 'gamers', 'video game'],
	wpaesthetic: 'aesthetic',
	pentol: 'milk y mocha',
	caricatura: 'cartoon network',
	ciberespacio: 'cyberspace',
	technology: 'technology',
	doraemon: 'doraemon',
	hacker: 'hacker',
	planeta: 'planet',
	randomprofile: 'profile picture',
	wpvehiculo: 'car',
	wallhp: 'mobile wallpaper',
	wpmoto: 'motorcycle'
}

const wallpaper = async (title) => {
	const res = await ft(SERVER_URL + '/api/wallpaper?q=' + encodeURIComponent(title), DL_HEADERS)
	const data = await res.json()
	if (!data.status || !Array.isArray(data.wallpapers) || !data.wallpapers.length) throw new Error(data.error || 'Sin resultados')
	return data.wallpapers
}

const handler = async (m, { command, conn }) => {
	const capt = `_${command}_`.trim()
	if (command === 'coffee') {
		const haha = await conn.getFile('https://coffee.alexflipnote.dev/random')
		await conn.reply(m.chat, global.wait, m)
		return conn.sendMessage(m.chat, { image: { url: haha.data }, caption: capt }, { quoted: m })
	}
	const raw = command === 'wprandom' ? 'wprandom' : TEMAS[command]
	if (!raw) return
	const termino = Array.isArray(raw) ? raw[Math.floor(Math.random() * raw.length)] : raw
	await conn.reply(m.chat, global.wait, m)
	const lista = await wallpaper(termino)
	const item = lista[Math.floor(Math.random() * lista.length)]
	return conn.sendMessage(m.chat, { image: { url: item.image }, caption: capt }, { quoted: m })
}

handler.command = ['wpmontaña', 'pubg', 'wpgaming', 'wpaesthetic', 'wprandom', 'coffee', 'pentol', 'caricatura', 'ciberespacio', 'technology', 'doraemon', 'hacker', 'planeta', 'randomprofile', 'wpvehiculo', 'wallhp', 'wpmoto']
export default handler