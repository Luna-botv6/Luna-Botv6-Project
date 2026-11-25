import { downloadContentFromMessage, prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys'
import { spawn } from 'child_process'
import { promises as fsp } from 'fs'
import os from 'os'
import path from 'path'
import { sticker as crearSticker, sticker6 } from '../src/libraries/sticker.js'

const MAX_SEG = 10
const MIME_AUDIO = 'audio/ogg; codecs=opus'
const MAX_STICKER = 1000 * 1000
const TTL_PENDIENTE = 5 * 60 * 1000
const TTL_RECIENTE = 10 * 60 * 1000
const MAX_CACHE = 500

const pendientes = new Map()
const recientes = new Map()

const claveDe = (chat, sender) => `${chat}|${sender}`
const tipoDe = (x) => x?.mtype || ''
const mimeDe = (x) => x?.mimetype || x?.msg?.mimetype || ''
const segundosDe = (x) => Number(x?.seconds || x?.msg?.seconds || 0) || 0
const esAudio = (tipo) => tipo === 'audioMessage' || tipo === 'pttMessage'
const esSticker = (tipo) => tipo === 'stickerMessage'
const esVideo = (tipo) => tipo === 'videoMessage' || tipo === 'ptvMessage'
const esAudioDoc = (x) => tipoDe(x) === 'documentMessage' && /audio|ogg|opus|mpeg|mp3|m4a|aac|wav|amr/i.test(mimeDe(x))
const esWebp = (b) => Buffer.isBuffer(b) && b.length > 32 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
const esOgg = (b) => Buffer.isBuffer(b) && b.length > 4 && b.toString('ascii', 0, 4) === 'OggS'

const limpiar = (mapa, ttl) => {
  const ahora = Date.now()
  for (const [k, v] of mapa) if (ahora - (v?.ts || 0) > ttl) mapa.delete(k)
  if (mapa.size > MAX_CACHE) {
    const viejos = [...mapa.entries()].sort((a, b) => (a[1]?.ts || 0) - (b[1]?.ts || 0)).slice(0, mapa.size - MAX_CACHE)
    for (const [k] of viejos) mapa.delete(k)
  }
}

const bajar = async (x) => {
  if (!x) return null
  try {
    if (typeof x.download === 'function') {
      const buf = await x.download()
      if (Buffer.isBuffer(buf) && buf.length) return buf
    }
  } catch {}
  try {
    const mensaje = x?.message && typeof x.message === 'object' ? x.message : x
    const tipo = tipoDe(x) || Object.keys(mensaje || {})[0]
    const media = mensaje?.[tipo]
    if (!media || (!media.directPath && !media.url)) return null
    const limpio = tipo.replace(/Message$/, '').replace('ptv', 'video')
    const stream = await downloadContentFromMessage(media, limpio)
    const partes = []
    for await (const p of stream) partes.push(p)
    const buf = Buffer.concat(partes)
    return buf.length ? buf : null
  } catch {
    return null
  }
}

const correr = (args) => new Promise((resolver, rechazar) => {
  let proceso
  try {
    proceso = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args])
  } catch (e) {
    return rechazar(e)
  }
  let salidaError = ''
  proceso.stderr.on('data', (d) => {
    salidaError = (salidaError + d.toString()).slice(-300)
  })
  proceso.on('error', rechazar)
  proceso.on('close', (codigo) => (codigo === 0 ? resolver() : rechazar(new Error(`ffmpeg ${codigo} ${salidaError.trim()}`))))
})

const aOpus = async (buffer, seg) => {
  const id = `sa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const entrada = path.join(os.tmpdir(), `${id}.bin`)
  const salida = path.join(os.tmpdir(), `${id}.ogg`)
  try {
    await fsp.writeFile(entrada, buffer)
    await correr(['-i', entrada, '-vn', '-map', '0:a:0', '-t', String(seg), '-c:a', 'libopus', '-b:a', '32k', '-ar', '48000', '-ac', '1', '-application', 'voip', '-f', 'ogg', salida])
    const listo = await fsp.readFile(salida)
    return listo?.length ? listo : null
  } catch {
    return null
  } finally {
    await fsp.unlink(entrada).catch(() => {})
    await fsp.unlink(salida).catch(() => {})
  }
}

const prepararAudio = async (buffer, seg, duracion) => {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return null
  if (esOgg(buffer) && duracion <= MAX_SEG) return buffer
  const convertido = await aOpus(buffer, seg)
  if (convertido) return convertido
  return esOgg(buffer) ? buffer : null
}

const planificarRecorte = (duracion) => {
  const numero = Number(duracion)
  const seg = Number.isFinite(numero) && numero > 0
    ? Math.min(MAX_SEG, Math.max(1, Math.ceil(numero)))
    : MAX_SEG
  const recortar = !Number.isFinite(numero) || numero <= 0 || numero > seg + 0.05
  return { seg, recortar }
}

const recortarVideo = async (buffer, seg) => {
  const id = `sa-cut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const entrada = path.join(os.tmpdir(), `${id}.bin`)
  const salida = path.join(os.tmpdir(), `${id}.mp4`)
  try {
    await fsp.writeFile(entrada, buffer)
    await correr(['-i', entrada, '-t', String(seg), '-c:v', 'mpeg4', '-q:v', '4', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', salida])
    const listo = await fsp.readFile(salida)
    return listo?.length ? listo : null
  } catch {
    return null
  } finally {
    await fsp.unlink(entrada).catch(() => {})
    await fsp.unlink(salida).catch(() => {})
  }
}

const onda = (buffer) => {
  const marcas = new Uint8Array(64)
  if (!Buffer.isBuffer(buffer) || !buffer.length) return marcas
  const paso = Math.max(1, Math.floor(buffer.length / 64))
  for (let i = 0; i < 64; i++) {
    const inicio = i * paso
    const fin = Math.min(buffer.length, inicio + paso)
    let suma = 0
    for (let j = inicio; j < fin; j++) suma += Math.abs(buffer[j] - 128)
    marcas[i] = Math.min(100, Math.round((suma / Math.max(1, fin - inicio)) * 1.5))
  }
  return marcas
}

const reaccion = (conn, m, emoji) => {
  try {
    return conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})
  } catch {
    return null
  }
}

const mandar = async (conn, m, webp, opus, seg, animado) => {
  const marcas = onda(opus)
  const subida = { upload: conn.waUploadToServer }
  const stickerMedia = await prepareWAMessageMedia({ sticker: webp, mimetype: 'image/webp', isAnimated: animado === true }, subida)
  const audioMedia = await prepareWAMessageMedia({ audio: opus, mimetype: MIME_AUDIO, ptt: true, seconds: seg, waveform: marcas }, subida)
  if (!stickerMedia?.stickerMessage || !audioMedia?.audioMessage) throw new Error('No se pudo preparar el sticker o el audio')
  const contenido = {
    ...stickerMedia.stickerMessage,
    isAnimated: animado === true,
    audioMessage: {
      ...audioMedia.audioMessage,
      mimetype: MIME_AUDIO,
      seconds: seg,
      ptt: true,
      waveform: marcas
    }
  }
  const armado = generateWAMessageFromContent(m.chat, { stickerMessage: contenido }, { quoted: m, userJid: conn.user?.jid || conn.user?.id })
  if (!armado?.message?.stickerMessage?.audioMessage) throw new Error('Este Baileys no soporta audio dentro del sticker')
  await conn.relayMessage(m.chat, armado.message, { messageId: armado.key.id })
  return armado
}

const combinar = async (conn, m, webp, animado, audio, duracion) => {
  const seg = Math.min(MAX_SEG, Math.max(1, Math.round(duracion || MAX_SEG)))
  const opus = await prepararAudio(audio, seg, duracion)
  if (!opus) return null
  return mandar(conn, m, webp, opus, seg, animado)
}

const handler = async (m, { conn, usedPrefix, command }) => {
  const uso = `${usedPrefix || ''}${command || 'sa'}`
  let t = {}
  try {
    t = (await global.loadTranslation?.(global.getIdioma?.(m) || 'es'))?.plugins?.sticker_audio || {}
  } catch {}

  const responder = (clave, porDefecto) => {
    const texto = t[clave] || porDefecto || '❌ No pude hacer eso.'
    return m.reply(texto.replace(/\{cmd\}/g, uso))
  }

  const q = m.quoted
  const tipoM = tipoDe(m)
  const chat = m.chat
  const sender = m.sender
  const k = claveDe(chat, sender)
  const pack = global.packsticker || global.packname || global.BotName || 'Luna Bot'
  const author = global.packsticker2 || global.author || global.BotName || 'Luna Bot'

  try {
    if (!q) {
      if (esAudio(tipoM) || esAudioDoc(m)) {
        const audio = await bajar(m)
        if (!audio) return responder('no_descarga', '❌ No pude descargar ese audio, probá de nuevo.')
        pendientes.set(k, { tipo: 'audio', buffer: audio, duracion: segundosDe(m), ts: Date.now() })
        return responder('pide_sticker', '🎨 Listo, guardé ese audio.\n\nMandá ahora el *sticker* al que se lo querés pegar.')
      }
      return responder('ayuda', `🎧 *Sticker con audio*\n\n1️⃣ Mandá el audio (nota de voz o archivo) y respondé a tu *sticker* con *{cmd}*.\n2️⃣ O respondé al *audio* con *{cmd}* y después mandá el *sticker*.\n\n🎬 También sirve con videos: respondé al video con *{cmd}* y sale el sticker animado con su audio.`)
    }

    if (esVideo(tipoDe(q))) {
      console.log('[STICKERAUDIO] video pedido', { tipo: tipoDe(q), dur: segundosDe(q), download: typeof q?.download === 'function', directPath: !!(q?.msg?.directPath || q?.msg?.url) })
      await reaccion(conn, m, '⏳')
      const video = await bajar(q)
      console.log('[STICKERAUDIO] video bytes', video?.length || 0)
      if (!video) {
        await reaccion(conn, m, '❌')
        return responder('no_descarga', '❌ No pude descargar ese video.')
      }
      const duracion = segundosDe(q)
      const { seg, recortar } = planificarRecorte(duracion)
      let videoFinal = video
      if (recortar) {
        const recortado = await recortarVideo(video, seg)
        console.log('[STICKERAUDIO] recorte', { seg, recortar, bytes: recortado?.length || 0 })
        if (!recortado) {
          await reaccion(conn, m, '❌')
          return responder('no_recorta', '❌ Ese video dura más de 10 segundos y no pude recortarlo. Probá con uno más corto.')
        }
        videoFinal = recortado
      }
      let webp = await crearSticker(videoFinal, false, pack, author)
      console.log('[STICKERAUDIO] webp', webp?.length || 0)
      if (!esWebp(webp) || webp.length > MAX_STICKER) {
        try {
          const local = await sticker6(videoFinal)
          console.log('[STICKERAUDIO] webp local', local?.length || 0)
          if (esWebp(local)) webp = local
        } catch (e) {
          console.log('[STICKERAUDIO] sticker6 error', e?.message || e)
        }
      }
      if (!esWebp(webp) || webp.length > MAX_STICKER) {
        await reaccion(conn, m, '❌')
        return responder('no_video', '❌ No pude convertir ese video en sticker.')
      }
      const opus = await prepararAudio(videoFinal, seg, seg)
      console.log('[STICKERAUDIO] opus', opus?.length || 0, 'animado', webp.includes('ANMF'))
      if (!opus) {
        await reaccion(conn, m, '❌')
        return responder('sin_audio', '❌ No encontré audio en ese video.')
      }
      await mandar(conn, m, webp, opus, seg, webp.includes('ANMF'))
      console.log('[STICKERAUDIO] enviado')
      await reaccion(conn, m, '✅')
      return
    }

    if (esAudio(tipoDe(q)) || esAudioDoc(q)) {
      const audio = await bajar(q)
      if (!audio) return responder('no_descarga', '❌ No pude descargar ese audio, probá de nuevo.')
      pendientes.set(k, { tipo: 'audio', buffer: audio, duracion: segundosDe(q), ts: Date.now() })
      return responder('pide_sticker', '🎨 Listo, guardé ese audio.\n\nMandá ahora el *sticker* al que se lo querés pegar.')
    }

    if (esSticker(tipoDe(q))) {
      const webp = await bajar(q)
      if (!esWebp(webp)) return responder('no_sticker', '❌ El mensaje que citaste no es un sticker válido.')
      if (webp.length > MAX_STICKER) return responder('grande', '❌ Ese sticker es demasiado grande.')
      const animado = q?.isAnimated === true || webp.includes('ANMF')

      let fuente = null
      if (esAudio(tipoM) || esAudioDoc(m)) {
        const propio = await bajar(m)
        if (propio) fuente = { buffer: propio, duracion: segundosDe(m) }
      }
      if (!fuente) {
        limpiar(recientes, TTL_RECIENTE)
        const guardado = recientes.get(k)
        if (guardado) {
          const audio = await bajar(guardado.msg)
          if (audio) fuente = { buffer: audio, duracion: guardado.duracion }
        }
      }
      if (!fuente) {
        pendientes.set(k, { tipo: 'sticker', buffer: webp, animado, ts: Date.now() })
        return responder('pide_audio', '🔊 Listo, guardé ese sticker.\n\nMandá ahora el *audio* (nota de voz o archivo) en un mensaje aparte y se lo pego.')
      }

      pendientes.delete(k)
      await reaccion(conn, m, '⏳')
      const enviado = await combinar(conn, m, webp, animado, fuente.buffer, fuente.duracion)
      if (!enviado) {
        await reaccion(conn, m, '❌')
        return responder('error_audio', '❌ No pude preparar ese audio para el sticker, probá con otro.')
      }
      await reaccion(conn, m, '✅')
      return
    }

    return responder('ayuda', `🎧 Respondé con *{cmd}* a un *sticker* o a un *audio*.`)
  } catch (e) {
    console.log('[STICKERAUDIO]', e?.message || e)
    await reaccion(conn, m, '❌')
    return responder('error', '❌ Algo falló armando el sticker con audio, probá de nuevo.')
  }
}

handler.all = async function (m, { conn }) {
  try {
    const chat = m?.chat
    const sender = m?.sender
    if (!chat || !sender) return

    const k = claveDe(chat, sender)
    const tipo = tipoDe(m)

    if (esAudio(tipo) || esAudioDoc(m)) {
      limpiar(recientes, TTL_RECIENTE)
      recientes.set(k, { msg: m, duracion: segundosDe(m), ts: Date.now() })
    }

    if (!pendientes.size) return
    const pendiente = pendientes.get(k)
    if (!pendiente) return
    if (Date.now() - pendiente.ts > TTL_PENDIENTE) {
      pendientes.delete(k)
      return
    }

    if (typeof m.text === 'string' && m.text.trim() && global.prefix?.test?.(m.text.trim())) return

    if (pendiente.tipo === 'sticker') {
      if (!esAudio(tipo) && !esAudioDoc(m)) return
      const audio = await bajar(m)
      if (!audio) return
      pendientes.delete(k)
      const enviado = await combinar(conn, m, pendiente.buffer, pendiente.animado, audio, segundosDe(m))
      if (!enviado) {
        await reaccion(conn, m, '❌')
        await m.reply('❌ No pude preparar ese audio para el sticker, probá con otro.')
        return
      }
      await reaccion(conn, m, '✅')
      return
    }

    if (pendiente.tipo === 'audio') {
      if (!esSticker(tipo)) return
      const webp = await bajar(m)
      if (!esWebp(webp)) return
      if (webp.length > MAX_STICKER) {
        pendientes.delete(k)
        await m.reply('❌ Ese sticker es demasiado grande.')
        return
      }
      pendientes.delete(k)
      const animado = m?.msg?.isAnimated === true || webp.includes('ANMF')
      const enviado = await combinar(conn, m, webp, animado, pendiente.buffer, pendiente.duracion)
      if (!enviado) {
        await reaccion(conn, m, '❌')
        await m.reply('❌ No pude armar el sticker con ese audio, probá con otro.')
        return
      }
      await reaccion(conn, m, '✅')
    }
  } catch (e) {
    console.log('[STICKERAUDIO]', e?.message || e)
  }
}

handler.command = ['sa', 'stickeraudio', 'stickeraudioagregar', 'stickersonoro']
handler.tags = ['sticker']
handler.help = ['sa']

export const __test = { planificarRecorte, recortarVideo, prepararAudio, MAX_SEG }

export default handler
