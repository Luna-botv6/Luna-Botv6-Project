import * as googleTTS from '@sefinek/google-tts-api'
import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import axios from 'axios'

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


export async function textToOggBuffer(text, lang = 'es') {
  if (!text || !text.trim()) throw new Error('Texto vacío para TTS')

  
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
