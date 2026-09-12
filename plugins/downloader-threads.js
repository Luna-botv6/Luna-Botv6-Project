import axios from 'axios';

const handler = async (m, { conn, args, command, usedPrefix }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.downloader_threads || {};
  if (!args[0]) throw (t.sin_enlace || '*Ingresa un enlace de Threads*');
  try {
    const res = await axios.get(
      global.BASE_API_DELIRIUS + '/download/threads',
      {
        params: {
          url: args[0],
        },
      },
    );
    if (res.data.status && res.data.data.media.length > 0) {
      const txtresthreads = (t.info ? t.info
        .replace('{usuario}', res.data.data.username || '-')
        .replace('{descripcion}', res.data.data.description || '-')
        .replace('{likes}', res.data.data.likes || '-')
        .replace('{verificado}', res.data.data.is_verified ? '√' : '×')
        .replace('{archivos}', res.data.data.media.length || '-')
        .replace('{enlace}', args[0].trim()) : null) ||
        `亗 T H R E A D S\n\n*Usuario :* ${res.data.data.username || '-'}\n*Descripción :* ${res.data.data.description || '-'}\n*Likes :* ${res.data.data.likes || '-'}\n*Verificado :* ${res.data.data.is_verified ? '√' : '×'}\n*Archivos :* ${res.data.data.media.length || '-'}\n*Enlace :* ${args[0].trim()}`;
      await conn.sendMessage(m.chat, { text: txtresthreads }, { quoted: m });
      const media = res.data.data.media;
      for (const item of media) {
        if (item.type === 'image') {
          await conn.sendMessage(
            m.chat,
            { image: { url: item.url } },
            { quoted: m },
          );
        } else if (item.type === 'video') {
          await conn.sendMessage(
            m.chat,
            { video: { url: item.url } },
            { quoted: m },
          );
        }
      }
    } else {
      await conn.sendMessage(
        m.chat,
        { text: (t.sin_resultados?.replace('{enlace}', args[0]) || '*🍟 Sin resultados para :* ' + args[0]) },
        { quoted: m },
      );
    }
  } catch (err) {
    console.log(new Error(err).message);
  }
};

handler.command = /^(threadsd|threads|threaddl|thread)$/i;

export default handler;