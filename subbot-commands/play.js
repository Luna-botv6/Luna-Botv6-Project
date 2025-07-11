const yts = require('yt-search')

let text = args.join(' ').trim()
if (!text) {
  await sock.sendMessage(m.chat, {
    text: '📥 *Uso del comando:*\n/play <nombre de canción o artista>\n\nEjemplo:\n/play Shakira Acróstico',
  }, { quoted: m })
  return
}

await sock.sendMessage(m.chat, { text: '🔎 Buscando tu canción, un momento...' }, { quoted: m })

try {
  const search = await yts(text)
  const video = search.videos[0]
  if (!video) throw '❌ No se encontró ningún resultado.'

  const title = video.title.substring(0, 60)
  const url = video.url
  const thumb = video.thumbnail
  const duration = video.timestamp
  const author = video.author.name

  const message = `
🎧 *Resultado encontrado:*

*🎵 Título:* ${title}
*🕒 Duración:* ${duration}
*👤 Autor:* ${author}
*🔗 Enlace:* ${url}

⚠️ Este comando solo muestra el resultado.
Para descargar, usa el bot principal o /ytmp3 /ytmp4 si están disponibles.
`.trim()

  await sock.sendMessage(m.chat, {
    image: { url: thumb },
    caption: message
  }, { quoted: m })

} catch (e) {
  console.error('[play.js error]', e)
  await sock.sendMessage(m.chat, {
    text: '❌ No se pudo buscar la canción. Intenta con otro nombre o más palabras clave.',
  }, { quoted: m })
}
