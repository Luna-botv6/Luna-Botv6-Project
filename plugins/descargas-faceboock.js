import { fbdl } from 'ruhend-scraper';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = await import(`../src/lunaidiomas/${idioma}.json`, { assert: { type: 'json' } })
  const t = _translate.default.plugins.facebook_dl

  const example = `${usedPrefix + command} https://facebook.com/reel/1341328334215918/?referral_source=external_deeplink&_rdr`

  if (!text) return conn.reply(
    m.chat,
    t.no_text.replace('{example}', example),
    m
  );

  if (!/(?:https?:\/\/)?(?:www\.)?facebook\.com\/(reel|watch|video|share)\/[^\s/?#&]+/i.test(text)) {
    return conn.reply(
      m.chat,
      t.invalid_url.replace('{example}', example),
      m
    );
  }

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  await conn.reply(m.chat, t.downloading, m);

  try {
    const mediaData = await getFacebookMedia(text);

    if (!mediaData || mediaData.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return conn.reply(m.chat, t.no_video, m);
    }

    const media = mediaData[0];
    const url = media.hd || media.sd || media.url;

    if (!url) return conn.reply(m.chat, t.no_url, m);

    await conn.sendMessage(
      m.chat,
      {
        video: { url },
        mimetype: 'video/mp4',
        caption: t.success_caption
      },
      { quoted: m }
    );

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (error) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    return conn.reply(
      m.chat,
      t.error,
      m
    );
  }
};

async function getFacebookMedia(url) {
  try {
    const res = await fbdl(url);
    return res.data || [];
  } catch {
    return [];
  }
}

handler.help = ['facebook', 'fb'];
handler.tags = ['downloader'];
handler.command = /^(facebook|fb|facebookdl|fbdl)$/i;

export default handler;