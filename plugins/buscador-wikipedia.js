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

const handler = async (m, { conn, text, usedPrefix, command }) => {
	const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
	const tradutor = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))?.plugins?.buscador_wikipedia || {}
	if (!text) throw `*${tradutor.texto1?.[0] || 'Ingresá un término'}* ${usedPrefix + command} ${tradutor.texto1?.[1] || 'Estrellas'}`
	try {
		const res = await ft(SERVER_URL + '/api/wikipedia?q=' + encodeURIComponent(text.trim()), DL_HEADERS)
		if (!res.ok) throw new Error('Error del servidor')
		const data = await res.json()
		if (!data.status) throw new Error(data.error || 'Sin resultado')
		m.reply(`*${tradutor.texto2 || 'Resultado'}*\n\n${data.contenido}`)
	} catch (e) {
		m.reply(`*${tradutor.texto3 || 'No se encontró resultado'}*`)
	}
}

handler.help = ['wikipedia'].map(v => v + ' <busqueda>')
handler.tags = ['internet']
handler.command = /^(wiki|wikipedia)$/i
export default handler