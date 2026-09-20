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
const TIMEOUT = 60000

const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, headers = {}) => {
	const c = new AbortController()
	const t = setTimeout(() => c.abort(), TIMEOUT)
	try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r }
	catch (e) { clearTimeout(t); throw e }
}

let _efectosCache = null
const obtenerEfectos = async () => {
	if (_efectosCache) return _efectosCache
	const res = await ft(SERVER_URL + '/api/maker/logo?list=1', DL_HEADERS)
	const data = await res.json()
	if (!data.status || !Array.isArray(data.efectos)) throw new Error('No se pudo cargar la lista de efectos')
	_efectosCache = data.efectos
	return _efectosCache
}

const handler = async (m, { conn, args: [effect], text: txt, usedPrefix, command }) => {
	const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
	const tradutor = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))?.plugins?.maker_logos || {}
	const t1 = tradutor.texto1 || 'Falta el efecto'
	const t2 = tradutor.texto2 || ['Efecto no válido', 'no existe']
	const t3 = tradutor.texto3 || 'Error del generador'
	const t5 = tradutor.texto5 || 'Logo generado con'
	const lista = await obtenerEfectos().catch(() => [])
	if (!effect) {
		const menu = t1 + (lista.length ? '\n' + lista.map(v => `° ඬ⃟📝 #${command} ${v}`).join('\n') : '')
		throw menu
	}
	const efectoOk = lista.find(v => (new RegExp(v, 'gi')).test(effect))
	if (!efectoOk) throw `${t2[0]} ${effect} ${t2[1]}`
	const texto = txt.replace(new RegExp(effect, 'gi'), '').trimStart()
	if (!texto) throw t1
	const texts = texto.includes('|') ? texto.split('|').map(v => v.trim()) : [texto.trim()]
	try {
		const res = await ft(SERVER_URL + '/api/maker/logo?effect=' + encodeURIComponent(effect) + '&text=' + encodeURIComponent(texts.join('|')), DL_HEADERS)
		const data = await res.json()
		if (!data.status) throw new Error(data.code === 'efecto-no-valido' ? `${t2[0]} ${effect} ${t2[1]}` : (data.error || t3))
		const buffer = Buffer.from(data.imagen, 'base64')
		if (!buffer.length) throw new Error(t3)
		await conn.sendMessage(m.chat, { image: buffer, caption: `${t5}: ${effect}` }, { quoted: m })
	} catch (e) {
		throw typeof e === 'string' ? e : (tradutor.texto3 || `❌ ${ocultar(e.message || e)}`)
	}
}

handler.help = ['logos'].map(v => v + ' <texto|texto>')
handler.tags = ['nulis']
handler.command = /^(logo|logos|logos2)$/i
export default handler