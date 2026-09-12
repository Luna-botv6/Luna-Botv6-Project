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

const ft = async (url, headers = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { signal: c.signal, headers }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

let handler = async (m, { conn, text }) => {
    const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
    const t = _tr?.plugins?.sticker_txt || {};
    if (m.quoted?.text) {
        text = m.quoted.text
    }

    if (!text) {
        return conn.sendMessage(
            m.chat,
            {
                text: t.sin_texto || '❀ Por favor, responde un mensaje o escribe un texto.'
            },
            { quoted: m }
        )
    }

    try {
        const user = global.db.data.users[m.sender] || {}

        const pack = user.text1 || global.packsticker || 'Luna Bot'
        const author = user.text2 || global.packsticker2 || 'Crack lam'

        const res = await ft(
            SERVER_URL + '/api/sticker/nota?text=' + encodeURIComponent(text) +
            '&pack=' + encodeURIComponent(pack) + '&author=' + encodeURIComponent(author),
            DL_HEADERS
        )

        const contentType = res.headers.get('content-type') || ''
        if (!res.ok || contentType.includes('application/json')) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Error del servidor')
        }

        const buffer = Buffer.from(await res.arrayBuffer())
        if (buffer.length < 500) throw new Error('Sticker inválido')

        await conn.sendMessage(
            m.chat,
            {
                sticker: buffer
            },
            {
                quoted: m
            }
        )

    } catch (e) {
        await conn.sendMessage(
            m.chat,
            {
                text: (t.error?.replace('{msg}', e.message) || `⚠️ Ocurrió un error al generar el sticker.\n\n${e.message}`)
            },
            {
                quoted: m
            }
        )
    }
}

handler.help = ['txt <texto>']
handler.tags = ['sticker']
handler.command = ['txt']

export default handler
