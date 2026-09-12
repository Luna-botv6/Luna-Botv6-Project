import { Jimp } from 'jimp';

const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.gc_setpp || {};
  try {
    if (!m.quoted) throw (t.responde_imagen || '*⚠️️ Responde a una imagen.*');

    const quoted = m.quoted;
    const media = await quoted.download();
    const groupJid = m.chat;

    async function resizeImage(buffer) {
      const image = await Jimp.read(buffer);
      const resized = image.width > image.height
        ? image.resize({ w: 720 })
        : image.resize({ h: 720 });
      return { img: await resized.getBuffer('image/jpeg') };
    }

    const { img } = await resizeImage(media);

    await conn.query({
      tag: 'iq',
      attrs: { to: groupJid, type: 'set', xmlns: 'w:profile:picture' },
      content: [{ tag: 'picture', attrs: { type: 'image' }, content: img }]
    });

    m.reply(t.exito || '⚘ *_Imagen actualizada con éxito._*');
  } catch {
    throw (t.responde_imagen || '*⚠️️ Responde a una imagen.*');
  }
};

handler.help = ['setppgc'];
handler.tags = ['group', 'adm'];
handler.command = /^setpp(gc|grup|group)$/i;
handler.botAdmin = handler.admin = handler.group = true;

export default handler;
