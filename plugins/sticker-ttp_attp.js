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
const TIMEOUT = 90000

const BOT = () => global.BotName || 'LUNA'

const MENU = (t) => t.menu || `🎨 *STICKERS ANIMADOS*
✏️ Escribe el comando + tu texto.

─────────────────
🌈 */attp*   — Cambia de colores
🏀 */ttp3*   — Rebota con colores
🔍 */ttp4*   — Zoom pulso
💥 */ttp5*   — Vibración shake
🌊 */ttp6*   — Ola de colores
👻 */ttp7*   — Aparece y desaparece
🔥 */ttp8*   — Glitch de colores
✍️ */ttp9*   — Escritura letra a letra
💡 */ttp10*  — Neón parpadeante
⬇️ */ttp11*  — Caída desde arriba
📈 */ttp12*  — Escala creciente
🎨 */ttp13*  — Arcoíris por letra
─────────────────
📌 *Ejemplo:* /ttp9 Hola mundo`

const handler = async (m, { conn, text, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.sticker_ttp_attp || {};
  const cmd = command.toLowerCase()
  if (!text) return m.reply(MENU(t))

  const waitMsg = await conn.sendMessage(m.chat, { text: t.generando || '⏳ Generando sticker...' }, { quoted: m })

  try {
    const url = `${SERVER_URL}/api/sticker/ttp?effect=${encodeURIComponent(cmd)}&text=${encodeURIComponent(text)}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)

    let res
    try {
      res = await fetch(url, { signal: controller.signal, headers: DL_HEADERS })
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      throw new Error(err.error || (t.error_http || 'HTTP {codigo}').replace('{codigo}', res.status))
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('image/webp')) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || t.respuesta_inesperada || 'Respuesta inesperada del servidor')
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1000) throw new Error(t.sticker_pequeno || 'Sticker demasiado pequeño')

    await conn.sendMessage(m.chat, { sticker: buffer }, { quoted: m })

  } catch (e) {
    if (waitMsg?.key) {
      await conn.sendMessage(m.chat, { text: (t.error || '❌ Error: {msg}').replace('{msg}', e.message), edit: waitMsg.key }).catch(() => {})
    } else {
      m.reply((t.error || '❌ Error: {msg}').replace('{msg}', e.message))
    }
  }
}

handler.help = ['attp <texto>']
handler.tags = ['sticker']
handler.command = /^(attp|attp2|ttp3|ttp4|ttp5|ttp6|ttp7|ttp8|ttp9|ttp10|ttp11|ttp12|ttp13)$/i
export default handler
