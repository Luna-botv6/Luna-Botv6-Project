import fs from 'fs'
import fetch from 'node-fetch'
import { Readable } from 'stream'
import { PassThrough } from 'stream'
import ffmpeg from 'fluent-ffmpeg'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const user = (a) => '@' + a.split('@')[0]

function convertToOgg(mp3Buffer) {
  return new Promise((resolve, reject) => {
    const input = new Readable()
    input.push(mp3Buffer)
    input.push(null)
    const output = new PassThrough()
    const chunks = []
    output.on('data', chunk => chunks.push(chunk))
    output.on('end', () => resolve(Buffer.concat(chunks)))
    output.on('error', reject)
    ffmpeg(input)
      .inputFormat('mp3')
      .audioCodec('libopus')
      .audioChannels(1)
      .audioFrequency(48000)
      .audioBitrate('128k')
      .outputOptions(['-application voip', '-frame_duration 20', '-packet_loss 0'])
      .format('ogg')
      .on('error', reject)
      .pipe(output)
  })
}

const AUDIO_GAYS   = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/audio/01J673A5RN30C5EYPMKE5MR9XQ.mp3'
const AUDIO_OTAKUS = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/audio/01J67441AFAPG1YRQXDQ0VDTZB.mp3'

const handler = async (m, { conn, command }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.fun_tops

  const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender)
  const ps = participants.map(v => v.id)

  if (ps.length < 10) return m.reply(t.pocos_miembros)

  const getRandom = () => ps[Math.floor(Math.random() * ps.length)]
  const picked = Array.from({ length: 10 }, getRandom)

  const buildTop = (titulo) =>
    titulo + '\n\n' +
    picked.map((p, i) => `*_${i + 1}.- ${user(p)}_*`).join('\n')

  const sendAudio = async (url) => {
    const res = await fetch(url)
    const mp3Buffer = Buffer.from(await res.arrayBuffer())
    const oggBuffer = await convertToOgg(mp3Buffer)
    await conn.sendMessage(m.chat, { audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
  }

  if (command === 'topgays') {
    m.reply(buildTop(t.texto1), null, { mentions: picked })
    await sendAudio(AUDIO_GAYS)
  }

  if (command === 'topotakus') {
    m.reply(buildTop(t.texto2), null, { mentions: picked })
    await sendAudio(AUDIO_OTAKUS)
  }
}

handler.help = ['topgays', 'topotakus']
handler.command = ['topgays', 'topotakus']
handler.tags = ['games']
handler.group = true

export default handler