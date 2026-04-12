import axios from 'axios';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const progressBar = (step, total = 5) => {
  const filled = '█'.repeat(step);
  const empty = '░'.repeat(total - step);
  const percent = Math.round((step / total) * 100);
  return filled + empty + ` ${percent}%`;
};

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = await import(`../src/lunaidiomas/${idioma}.json`, { assert: { type: 'json' } })
  const t = _translate.default.plugins.tiktok_dl

  const example = `${usedPrefix + command} https://www.tiktok.com/@lunabotv6/video/7562318278455037191`

  if (!text) {
    return conn.reply(
      m.chat,
      t.no_text.replace('{example}', example),
      m
    );
  }

  if (!/(?:https?:\/\/)?(?:www|vm|vt|t)?\.?tiktok\.com\/([^\s&]+)/gi.test(text)) {
    return conn.reply(
      m.chat,
      t.invalid_url.replace('{example}', example),
      m
    );
  }

  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

  const steps = [
    t.step1.replace('{progress}', progressBar(1)),
    t.step2.replace('{progress}', progressBar(2)),
    t.step3.replace('{progress}', progressBar(3)),
    t.step4.replace('{progress}', progressBar(4)),
    t.step5.replace('{progress}', progressBar(5)),
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
        text: t.no_video.replace('{progress}', progressBar(0)),
        edit: sent.key
      });
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      return;
    }

    await conn.sendMessage(m.chat, {
      text: t.ready.replace('{progress}', progressBar(5)),
      edit: sent.key
    });

    await conn.sendMessage(
      m.chat,
      {
        video: { url: download },
        caption: t.caption
      },
      { quoted: m }
    );

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    await conn.sendMessage(m.chat, {
      text: t.error
        .replace('{error}', e?.message || 'unknown')
        .replace('{progress}', progressBar(0)),
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
        'User-Agent': 'Mozilla/5.0'
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