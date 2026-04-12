import { igdl } from 'ruhend-scraper';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = await import(`../src/lunaidiomas/${idioma}.json`, { assert: { type: 'json' } })
  const t = _translate.default.plugins.instagram_dl

  const example = `${usedPrefix + command} https://www.instagram.com/reel/DP7RggwD_1t/`

  if (!text) return conn.reply(
    m.chat,
    t.no_text.replace('{example}', example),
    m
  );

  if (!/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv)\//i.test(text)) return conn.reply(
    m.chat,
    t.invalid_url.replace('{example}', example),
    m
  );

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  await conn.reply(m.chat, t.downloading, m);

  try {
    const mediaData = await getInstagramMedia(text);

    if (!mediaData || mediaData.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return conn.reply(m.chat, t.no_media, m);
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
            caption: t.video_caption
          },
          { quoted: m }
        );
      } else {
        await conn.sendMessage(
          m.chat,
          {
            image: { url },
            caption: t.image_caption
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
      t.error,
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