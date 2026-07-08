import * as googleTTS from '@sefinek/google-tts-api'
import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import axios from 'axios'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

export function mp3BufferToOggOpus(mp3Buffer, speed = 1) {
  return new Promise((resolve, reject) => {
    const tmpIn = join(tmpdir(), `${Date.now()}_in.mp3`)
    const tmpOut = join(tmpdir(), `${Date.now()}_out.ogg`)
    writeFileSync(tmpIn, mp3Buffer)


    const args = ['-y', '-i', tmpIn]
    if (speed && speed !== 1) args.push('-filter:a', `atempo=${speed}`)
    args.push('-c:a', 'libopus', '-b:a', '128k', '-f', 'ogg', tmpOut)

    const ff = spawn('ffmpeg', args)

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

export async function textToOggBuffer(text, lang = 'es') {
  if (!text || !text.trim()) throw new Error('Texto vacío para TTS')

  const cleanText = text
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!cleanText) throw new Error('Texto vacío para TTS tras sacar emojis')

  const chunks = googleTTS.getAllAudioUrls(cleanText, { lang: lang || 'es', slow: false, host: 'https://translate.google.com' })

  const buffers = []
  for (const { url } of chunks) {
    const { data } = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': USER_AGENT }
    })
    buffers.push(Buffer.from(data))
  }

  return mp3BufferToOggOpus(Buffer.concat(buffers), 1.5)
}
