import fs from 'fs'
import fetch from 'node-fetch'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY }
const TIMEOUT = 90000

const fr = async (url, body, headers = {}) => {
	const c = new AbortController()
	const t = setTimeout(() => c.abort(), TIMEOUT)
	try {
		const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: c.signal })
		clearTimeout(t)
		return r
	} catch (e) { clearTimeout(t); throw e }
}

const handler = async (m, { conn, usedPrefix, command }) => {
	const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
	const tradutor = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))?.plugins?.herramientas_hd

	const isPrems = global.db?.data?.users?.[m.sender]?.premiumTime > 0
	const isAdmin = m.isGroup
		? (await getGroupDataForPlugin(conn, m.chat, m.sender)).isAdmin
		: false
	const ownerNums = (global.owner || []).map(o => String(Array.isArray(o) ? o[0] : o).replace(/\D/g, ''))
	const isOwner = ownerNums.includes(m.sender.replace(/\D/g, ''))

	if (!isOwner && !isAdmin && !isPrems) {
		return m.reply('🌙 *Luna-Botv6-Project*\n\n⚠️ Este comando es solo para admins y usuarios premium 💎')
	}

	try {
		const q = m.quoted ? m.quoted : m
		const mime = (q.msg || q).mimetype || q.mediaType || ''

		if (!mime) throw `${tradutor?.texto1 || 'Enviá o respondé una imagen'} *${usedPrefix + command}*`
		if (!/image\/(jpe?g|png|webp)/.test(mime)) throw `${tradutor?.texto2?.[0] || 'Solo imágenes'} (${mime})`

		await m.reply(tradutor?.texto3 || '🔍 Mejorando imagen con IA, esperá un momento...')

		const imgBuffer = await q.download?.()
		if (!imgBuffer) throw tradutor?.texto4 || '❌ No se pudo descargar la imagen'

		const res = await fr(SERVER_URL + '/api/hd', { image: imgBuffer.toString('base64') }, DL_HEADERS)
		const data = await res.json()
		if (!data.status || !data.image) throw new Error(tradutor?.texto4 || '❌ Error al procesar la imagen')

		const buffer = Buffer.from(data.image, 'base64')

		await conn.sendMessage(m.chat, {
			image: buffer,
			caption: '✨ *Imagen mejorada con IA* — Luna-Botv6'
		}, { quoted: m })
	} catch (e) {
		throw typeof e === 'string' ? e : (tradutor?.texto4 || '❌ Error al procesar la imagen')
	}
}

handler.help = ['remini', 'hd', 'enhance']
handler.tags = ['ai', 'tools']
handler.command = ['remini', 'hd', 'enhance']
export default handler