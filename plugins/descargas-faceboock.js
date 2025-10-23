import { fbdl } from 'ruhend-scraper';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return conn.reply(
    m.chat,
    `Ingresa un enlace de Facebook.\n\nEjemplo:\n${usedPrefix + command} https://facebook.com/reel/1341328334215918/?referral_source=external_deeplink&_rdr`,
    m
  );

  if (!/(?:https?:\/\/)?(?:www\.)?facebook\.com\/(reel|watch|video|share)\/[^\s/?#&]+/i.test(text)) {
    return conn.reply(
      m.chat,
      `El enlace no parece ser válido.\n\nEjemplo:\n${usedPrefix + command} https://facebook.com/reel/1341328334215918/?referral_source=external_deeplink&_rdr`,
      m
    );
  }

  await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } });
  await conn.reply(m.chat, `Descargando video de Facebook...`, m);

  try {
    const mediaData = await getFacebookMedia(text);

    if (!mediaData || mediaData.length === 0) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return conn.reply(m.chat, 'No se pudo obtener ningún video.', m);
    }

    const media = mediaData[0];
    const url = media.hd || media.sd || media.url;

    if (!url) return conn.reply(m.chat, 'No se encontró URL válida para el video.', m);

    await conn.sendMessage(
      m.chat,
      {
        video: { url },
        mimetype: 'video/mp4',
        caption: '✅ VIDEO DE FACEBOOK\nDescargado exitosamente\nFuente: Luna-botv6'
      },
      { quoted: m }
    );

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (error) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    return conn.reply(
      m.chat,
      `Error al descargar el video. Intenta con otro enlace o más tarde.`,
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