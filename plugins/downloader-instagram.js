import { igdl } from 'ruhend-scraper';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return conn.reply(
    m.chat,
    `Ingresa un enlace de Instagram.\n\nEjemplo:\n${usedPrefix + command} https://www.instagram.com/reel/DP7RggwD_1t/`,
    m
  );

  if (!/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv)\//i.test(text)) return conn.reply(
    m.chat,
    `El enlace no parece ser válido.\n\nEjemplo:\n${usedPrefix + command} https://www.instagram.com/reel/DP7RggwD_1t/`,
    m
  );

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  await conn.reply(m.chat, `Descargando medios de Instagram...`, m);

  try {
    const mediaData = await getInstagramMedia(text);

    if (!mediaData || mediaData.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return conn.reply(m.chat, 'No se pudo obtener ningún medio.', m);
    }

    for (let i = 0; i < mediaData.length; i++) {
      const media = mediaData[i];
      const url = media.url;
      const isVideo = url.endsWith('.mp4') || !!media.thumbnail;

      if (isVideo) {
        await conn.sendMessage(
          m.chat,
          {
            video: { url },
            mimetype: "video/mp4",
            caption: `✅ VIDEO DE INSTAGRAM\nDescargado exitosamente\nFuente: Luna-botv6`
          },
          { quoted: m }
        );
      } else {
        await conn.sendMessage(
          m.chat,
          {
            image: { url },
            caption: `✅ IMAGEN DE INSTAGRAM\nDescargada exitosamente\nFuente: Luna-botv6`
          },
          { quoted: m }
        );
      }

      if (i < mediaData.length - 1) await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
  } catch {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    return conn.reply(
      m.chat,
      `Error al descargar los medios. Intenta con otro enlace o más tarde.`,
      m
    );
  }
};

async function getInstagramMedia(url) {
  try {
    const res = await igdl(url);
    return res.data || [];
  } catch {
    return [];
  }
}

handler.help = ['instagram', 'ig'];
handler.tags = ['downloader'];
handler.command = /^(instagramdl|instagram|igdl|ig|instagram2|ig2|instagram3|ig3)$/i;

export default handler;
