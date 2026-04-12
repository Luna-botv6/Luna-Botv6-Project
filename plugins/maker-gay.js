import fetch from 'node-fetch'
import { Readable } from 'stream'
import { PassThrough } from 'stream'
import ffmpeg from 'fluent-ffmpeg'

const handler = async (m, {conn}) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.maker_gay

  const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender;
  await conn.sendFile(m.chat, global.API('https://some-random-api.com', '/canvas/gay', {
    avatar: await conn.profilePictureUrl(who, 'image').catch((_) => 'https://telegra.ph/file/24fa902ead26340f3df2c.png'),
  }), 'error.png', tradutor.texto1, m);

  const audioUrl = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/audio/01J673A5RN30C5EYPMKE5MR9XQ.mp3'
  const res = await fetch(audioUrl)
  const mp3Buffer = Buffer.from(await res.arrayBuffer())
  const oggBuffer = await convertToOgg(mp3Buffer)

  await conn.sendMessage(m.chat, {audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true}, {quoted: m});
};

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

handler.help = ['gay'];
handler.tags = ['maker'];
handler.command = /^(gay)$/i;
export default handler;
