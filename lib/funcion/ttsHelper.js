import * as googleTTS from '@sefinek/google-tts-api'
import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import axios from 'axios'

// ─────────────────────────────────────────────────────────────────────────
// Lógica de Google TTS + conversión a ogg/opus, sacada de
// plugins/convertidor-tts.js para poder reusarla también desde
// conversation-plugin.js (respuestas por voz de Luna) sin duplicar código.
// El plugin de .tts/.gtts sigue andando igual, solo que ahora llama a estas
// mismas funciones en vez de tenerlas repetidas adentro.
// ─────────────────────────────────────────────────────────────────────────

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

export function mp3BufferToOggOpus(mp3Buffer) {
  return new Promise((resolve, reject) => {
    const tmpIn = join(tmpdir(), `${Date.now()}_in.mp3`)
    const tmpOut = join(tmpdir(), `${Date.now()}_out.ogg`)
    writeFileSync(tmpIn, mp3Buffer)

    const ff = spawn('ffmpeg', ['-y', '-i', tmpIn, '-c:a', 'libopus', '-b:a', '128k', '-f', 'ogg', tmpOut])

    ff.on('error', (e) => {
      try { unlinkSync(tmpIn) } catch {}
      reject(e)
    })

    ff.on('close', (code) => {
      try { unlinkSync(tmpIn) } catch {}
      if (code !== 0) return reject(new Error(`ffmpeg exit code ${code}`))
      try {
        const out = readFileSync(tmpOut)
        unlinkSync(tmpOut)
        resolve(out)
      } catch (e) {
        reject(e)
      }
    })
  })
}

// Descarga el audio de Google TTS para un texto+idioma dado y lo devuelve
// ya convertido a buffer ogg/opus, listo para mandar como nota de voz.
// Lanza si algo falla — quien la llame decide qué hacer (fallback a texto).
export async function textToOggBuffer(text, lang = 'es') {
  if (!text || !text.trim()) throw new Error('Texto vacío para TTS')

  // googleTTS.getAudioUrl tira RangeError para textos de más de 200
  // caracteres (límite del endpoint de Google Translate TTS), y las
  // respuestas de la IA llegan a tener hasta 280. getAllAudioUrls parte el
  // texto en varios pedidos ≤200 chars (respetando espacios/puntuación) y
  // hay que pedir cada uno y concatenar los buffers antes de convertir.
  const chunks = googleTTS.getAllAudioUrls(text, { lang: lang || 'es', slow: false, host: 'https://translate.google.com' })

  const buffers = []
  for (const { url } of chunks) {
    const { data } = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': USER_AGENT }
    })
    buffers.push(Buffer.from(data))
  }

  return mp3BufferToOggOpus(Buffer.concat(buffers))
}
