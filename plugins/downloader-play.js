import pkg from 'ruhend-scraper';
const { ytdl } = pkg;

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text || !text.trim()) {
    return await conn.sendButton(
      m.chat,
      '⚠️ Escribe el nombre o enlace del video',
      'LunaBot V6',
      null,
      [['📋 Menú', usedPrefix + 'menu']],
      null,
      null,
      m
    );
  }

  if (command === 'play') {
    const info = await ytdl(text);
    if (!info || !info.video) return conn.sendButton(m.chat, `❌ No se encontró: "${text}"`, 'LunaBot V6', null, [['🔄 Reintentar', `${usedPrefix}play ${text}`]], null, null, m);

    const firstVideo = info.video[0];
    const infoMessage = `*🎵 Video encontrado*\n\n● *Título:* ${firstVideo.title}\n● *Duración:* ${firstVideo.durationH}\n● *Vistas:* ${firstVideo.view}\n● *Publicado:* ${firstVideo.publishedTime}\n● *Link:* ${firstVideo.url}\n\n*Selecciona formato*`;

    await conn.sendButton(
      m.chat,
      infoMessage,
      'LunaBot V6 - Descargas YouTube',
      firstVideo.thumbnail,
      [['🎵 Audio', `${usedPrefix}ytmp3 ${firstVideo.url}`], ['🎬 Video', `${usedPrefix}ytmp4 ${firstVideo.url}`]],
      null,
      null,
      m
    );
  }

  if (command === 'ytmp3' || command === 'ytmp4') {
    const url = text.trim();
    const info = await ytdl(url);
    if (!info || !info.video) return conn.sendButton(m.chat, '❌ No se pudo obtener el archivo', 'LunaBot V6', null, [['🔄 Reintentar', `${usedPrefix}${command} ${url}`]], null, null, m);

    const downloadUrl = command === 'ytmp3' ? info.video[0].audio : info.video[0].video;
    const fileName = info.video[0].title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 50);

    if (command === 'ytmp3') {
      await conn.sendMessage(m.chat, { audio: { url: downloadUrl }, mimetype: 'audio/mpeg', fileName: fileName + '.mp3' }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { video: { url: downloadUrl }, mimetype: 'video/mp4', caption: fileName + '.mp4' }, { quoted: m });
    }
  }
};

handler.help = ['play', 'ytmp3', 'ytmp4'];
handler.command = ['play', 'ytmp3', 'ytmp4'];
handler.tags = ['downloader'];

export default handler;
