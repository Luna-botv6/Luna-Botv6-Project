import axios from 'axios';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const progressBar = (step, total = 5) => {
  const filled = '█'.repeat(step);
  const empty = '░'.repeat(total - step);
  const percent = Math.round((step / total) * 100);
  return filled + empty + ` ${percent}%`;
};

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  if (!text) {
    return conn.reply(
      m.chat,
      `Ingresa un enlace de TikTok.\n\nEjemplo:\n${usedPrefix + command} https://www.tiktok.com/@lunabotv6/video/7562318278455037191`,
      m
    );
  }
  if (!/(?:https?:\/\/)?(?:www|vm|vt|t)?\.?tiktok\.com\/([^\s&]+)/gi.test(text)) {
    return conn.reply(
      m.chat,
      `El enlace no parece ser válido.\n\nEjemplo:\n${usedPrefix + command} https://www.tiktok.com/@lunabotv6/video/7562318278455037191`,
      m
    );
  }

  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

  const steps = [
    `*「 🎵 TikTok 」* 🔎 Buscando video...\n${progressBar(1)}`,
    `*「 🎵 TikTok 」* 📡 Conectando al servidor...\n${progressBar(2)}`,
    `*「 🎵 TikTok 」* 🔓 Eliminando marca de agua...\n${progressBar(3)}`,
    `*「 🎵 TikTok 」* 📦 Preparando descarga...\n${progressBar(4)}`,
    `*「 🎵 TikTok 」* ⚡ Descargando video...\n${progressBar(5)}`,
  ];

  const sent = await conn.reply(m.chat, steps[0], m);

  for (let i = 1; i < steps.length; i++) {
    await sleep(800);
    await conn.sendMessage(m.chat, { text: steps[i], edit: sent.key });
  }

  try {
    const data = await fetchTikTok(args[0]);
    const download = data?.hdplay || data?.play || data?.wmplay;

    if (!download) {
      await conn.sendMessage(m.chat, {
        text: `「 🎵 *TikTok Downloader* 」\n\n❌ No se encontró el video\n${progressBar(0)}`,
        edit: sent.key
      });
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return;
    }

    await conn.sendMessage(m.chat, {
      text: `「 🎵 *TikTok Downloader* 」\n\n✅ ¡Video listo!\n${progressBar(5)}`,
      edit: sent.key
    });

    await conn.sendMessage(
      m.chat,
      {
        video: { url: download },
        caption: `「 🎵 *TikTok Downloader* 」\n\n✅ Descargado exitosamente\n🚫 Sin marca de agua\n🎬 Calidad HD`
      },
      { quoted: m }
    );

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    await conn.sendMessage(m.chat, {
      text: `「 🎵 *TikTok Downloader* 」\n\n❌ Error: ${e?.message}\n${progressBar(0)}`,
      edit: sent.key
    });
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
  }
};

async function fetchTikTok(url) {
  const res = await axios.post(
    'https://www.tikwm.com/api/',
    new URLSearchParams({ url, hd: '1' }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000
    }
  );
  if (res?.data?.code !== 0 || !res?.data?.data) {
    throw new Error(`tikwm falló: ${res?.data?.msg || 'sin respuesta'}`);
  }
  return res.data.data;
}

handler.help = ['tiktok', 'tt'];
handler.tags = ['downloader'];
handler.command = /^(tiktok|ttdl|tiktokdl|tiktoknowm|tt|ttnowm|tiktokaudio)$/i;

export default handler;