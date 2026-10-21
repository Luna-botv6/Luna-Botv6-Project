import fs from 'fs'
import fetch from 'node-fetch'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'
import { cabecerasDescarga } from '../src/libraries/api/clientIdentity.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = cabecerasDescarga(API_KEY, { json: true })
const TIMEOUT = 30000

const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, options = {}) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT)
  try { const r = await fetch(url, { ...options, signal: c.signal }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.db.data.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));const tradutor = _translate.plugins.downloader_imagen;

  if (!text) return m.reply(`${tradutor.texto1} ${usedPrefix + command} Minecraft*`);

  try {
    const res = await ft(`${SERVER_URL}/api/imagen?q=${encodeURIComponent(text)}&n=15`, { headers: DL_HEADERS })
    if (!res.ok) throw new Error('Error del servidor')
    const data = await res.json()
    if (!data.status || !data.resultado?.length) throw new Error(data.error || 'Sin resultados')
    const image = data.resultado[Math.floor(Math.random() * data.resultado.length)]
    conn.sendFile(m.chat, image.url, 'error.jpg', `${tradutor.texto2[0]} ${text}\n${tradutor.texto2[1]} ${image.source}\n${tradutor.texto2[2]}`, m)
  } catch (e) {
    m.reply(`${tradutor.texto1}\n${ocultar(e.message || e)}`)
  }
};

handler.help = ['gimage <query>', 'imagen <query>'];
handler.tags = ['internet', 'tools'];
handler.command = /^(gimage|image|imagen)$/i;

export default handler;