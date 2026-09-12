import fetch from 'node-fetch';

const GIPHY_API_KEY = 'TU_API_KEY_AQUI';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.gc_stickerly || {};
  const p = usedPrefix + command;
  if (!text) return m.reply(t.uso?.replace('{prefix}', p).replace('{prefix}', p) || `🔍 Uso: *${p} <término>*\nEjemplo: ${p} gato`);

  await m.reply(t.buscando || '🔍 Buscando sticker...');

  try {
    const query = encodeURIComponent(text.trim());
    const url = `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=5&rating=g&lang=es`;

    const res = await fetch(url);
    const json = await res.json();

    if (!json.data || json.data.length === 0) return m.reply(t.sin_resultados || '❌ No se encontraron stickers para ese término.');

    const sticker = json.data[Math.floor(Math.random() * json.data.length)];
    const webpUrl = sticker.images?.original?.webp || sticker.images?.fixed_height?.webp;

    if (!webpUrl) return m.reply(t.sin_sticker || '❌ No se pudo obtener el sticker.');

    const imgRes = await fetch(webpUrl);
    if (!imgRes.ok) return m.reply(t.sin_descarga || '❌ No se pudo descargar el sticker.');

    const buffer = Buffer.from(await imgRes.arrayBuffer());

    await conn.sendMessage(m.chat, { sticker: buffer }, { quoted: m });

  } catch (e) {
    console.error('[stickerly]', e);
    m.reply(t.error || '❌ Error al buscar el sticker.');
  }
};

handler.command = /^(stickerly|buscarsticker|searchsticker)$/i;
handler.group = true;
export default handler;
