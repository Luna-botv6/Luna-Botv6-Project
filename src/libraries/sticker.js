import { dirname } from 'path'
import { fileURLToPath } from 'url'
import * as fs from 'fs'
import * as path from 'path'
import { ffmpeg } from './converter.js'
import fluent_ffmpeg from 'fluent-ffmpeg'
import { spawn } from 'child_process'
import { fileTypeFromBuffer } from 'file-type'
import fetch from 'node-fetch'
import { obtenerMenuIuman } from '../assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from './api/apiKeyManager.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tmp = path.join(__dirname, '../tmp')

const MAX_STICKER_SIZE = 50 * 1024 * 1024;
const assertSize = (buf) => {
  if (buf && buf.length > MAX_STICKER_SIZE) throw new Error('[sticker] Media demasiado grande (máximo 50MB)')
};

const SERVER_URL = obtenerMenuIuman()
const API_KEY = cargarOGenerarAPIKey()
const DL_HEADERS = { 'X-Client-Name': 'luna-bot-v6', 'X-API-Key': API_KEY, 'Content-Type': 'application/json' }
const TIMEOUT = 30000

const ocultar = (m) => String(m || '').replace(/https?:\/\/\S+/g, '[enlace oculto]').replace(/key=\w+/gi, 'key=[oculta]')

const ft = async (url, options = {}, timeout = TIMEOUT) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeout)
  try { const r = await fetch(url, { ...options, signal: c.signal }); clearTimeout(t); return r }
  catch (e) { clearTimeout(t); throw e }
}

function sticker2(img, url) {
  return new Promise(async (resolve, reject) => {
    try {
      if (url) {
        const res = await fetch(url)
        if (res.status !== 200) throw await res.text()
        img = await res.buffer()
        assertSize(img)
      }
      const inp = path.join(tmp, +new Date() + '.jpeg')
      await fs.promises.writeFile(inp, img)
      const ff = spawn('ffmpeg', [
        '-y',
        '-i', inp,
        '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=increase,crop=512:512,format=rgba,setsar=1',
        '-f', 'png',
        '-'
      ])
      ff.on('error', reject)
      ff.on('close', async () => {
        await fs.promises.unlink(inp)
      })
      const bufs = []
      const [_spawnprocess, ..._spawnargs] = [...(module.exports.support.gm ? ['gm'] : module.exports.magick ? ['magick'] : []), 'convert', 'png:-', 'webp:-']
      const im = spawn(_spawnprocess, _spawnargs)
      im.on('error', e => console.error(e))
      im.stdout.on('data', chunk => bufs.push(chunk))
      ff.stdout.pipe(im.stdin)
      im.on('exit', () => {
        resolve(Buffer.concat(bufs))
      })
    } catch (e) {
      reject(e)
    }
  })
}

async function sticker4(img, url) {
  if (url) {
    const res = await fetch(url)
    if (res.status !== 200) throw await res.text()
    img = await res.buffer()
    assertSize(img)
  }
  return await ffmpeg(img, [
    '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=increase,crop=512:512,format=rgba,setsar=1'
  ], 'jpeg', 'webp')
}

function sticker6(img, url) {
  return new Promise(async (resolve, reject) => {
    if (url) {
      const res = await fetch(url)
      if (res.status !== 200) throw await res.text()
      img = await res.buffer()
      assertSize(img)
    }
    const type = await fileTypeFromBuffer(img) || {
      mime: 'application/octet-stream',
      ext: 'bin'
    }
    if (type.ext == 'bin' || !/^[a-zA-Z0-9]+$/.test(type.ext)) return reject(img)
    const safeExt = path.basename(type.ext)
    const filename = path.basename(`${+ new Date()}.${safeExt}`)
    const tmp = path.join(__dirname, '../tmp', filename)
    const out = `${tmp}.webp`
    await fs.promises.writeFile(tmp, img)
    const Fffmpeg = /video/i.test(type.mime) ? fluent_ffmpeg(tmp).inputFormat(safeExt) : fluent_ffmpeg(tmp).input(tmp)
    Fffmpeg
      .on('error', function (err) {
        console.error(err)
        fs.promises.unlink(tmp)
        reject(img)
      })
      .on('end', async function () {
        fs.promises.unlink(tmp)
        resolve(await fs.promises.readFile(out))
      })
      .addOutputOptions([
        `-vcodec`, `libwebp`, `-quality`, `50`, `-compression_level`, `6`, `-t`, `10`, `-vf`,
        `scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=10,format=rgba,split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`
      ])
      .toFormat('webp')
      .save(out)
  })
}

async function stickerServer(img, url, packname, author, categories = [''], extra = {}) {
  if (url) {
    const res = await ft(url)
    if (res.status !== 200) throw await res.text()
    img = await res.buffer()
    assertSize(img)
  }
  const tipo = await fileTypeFromBuffer(img) || { mime: 'application/octet-stream', ext: 'bin' }
  const mime = tipo.mime || ''
  let kind = 'image'
  if (tipo.ext === 'gif') kind = 'gif'
  else if (/video/i.test(mime)) kind = 'video'
  else if (tipo.ext === 'webp') kind = 'webp'
  const res = await ft(SERVER_URL + '/api/sticker/convert', {
    method: 'POST',
    headers: DL_HEADERS,
    body: JSON.stringify({
      image: img.toString('base64'),
      kind,
      pack: packname,
      author,
      categories,
      metadata: (extra && typeof extra === 'object') ? extra : {}
    })
  }, 15000)
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || `Servidor respondio ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error('Respuesta vacia del servidor')
  return buf
}

async function addExif(webpSticker, packname, author, categories = [''], metadata = {}) {
  if (!webpSticker || !Buffer.isBuffer(webpSticker) || webpSticker.length < 20) return webpSticker
  if (webpSticker.toString('ascii', 0, 4) !== 'RIFF' || webpSticker.toString('ascii', 8, 12) !== 'WEBP') return webpSticker
  try {
    const res = await ft(SERVER_URL + '/api/sticker/wm', {
      method: 'POST',
      headers: DL_HEADERS,
      body: JSON.stringify({
        image: webpSticker.toString('base64'),
        pack: packname,
        author,
        categories,
        metadata: (metadata && typeof metadata === 'object') ? metadata : {}
      })
    })
    if (!res.ok) throw new Error(`Servidor respondio ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) throw new Error('Respuesta vacia del servidor')
    return buf
  } catch (e) {
    console.error('[sticker] addExif fallback local:', ocultar(e.message || e))
    return webpSticker
  }
}

async function sticker(img, url, ...args) {
  assertSize(img)
  let lastError, stiker
  for (const func of [
    stickerServer, global.support.ffmpeg && sticker6,
    global.support.ffmpeg && global.support.ffmpegWebp && sticker4,
    global.support.ffmpeg && (global.support.convert || global.support.magick || global.support.gm) && sticker2,
  ].filter(f => f)) {
    try {
      stiker = await func(img, url, ...args)
      if (!Buffer.isBuffer(stiker) || !stiker.length) continue
      if (stiker.includes('html')) continue
      if (stiker.includes('WEBP')) {
        if (func === stickerServer) return stiker
        try {
          return await addExif(stiker, ...args)
        } catch (e) {
          console.error(e)
          return stiker
        }
      }
      throw stiker.toString()
    } catch (err) {
      lastError = err
      continue
    }
  }
  console.error(lastError)
  return lastError
}

const support = {
  ffmpeg: true,
  ffprobe: true,
  ffmpegWebp: true,
  convert: true,
  magick: false,
  gm: false,
  find: false
}

export {
  sticker,
  sticker2,
  sticker4,
  sticker6,
  stickerServer,
  addExif,
  support
}