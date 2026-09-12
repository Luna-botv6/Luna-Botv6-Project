import { Jimp } from 'jimp';

const handler = async (m, { conn, usedPrefix, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_setppbot || {};
  try {
    const botJid = conn.user.jid;
    if (!m.quoted) throw (t.sin_imagen?.replace('{comando}', usedPrefix + command) || `*[❗INFO❗] NO SE ENCONTRO LA IMAGEN, POR FAVOR RESPONDE A UNA IMAGEN USANDO EL COMANDO ${usedPrefix + command}*`);

    const quoted = m.quoted;
    const media = await quoted.download();

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
      attrs: { to: botJid, type: 'set', xmlns: 'w:profile:picture' },
      content: [{ tag: 'picture', attrs: { type: 'image' }, content: img }]
    });

    m.reply((t.exito || '*[❗INFO❗] SE CAMBIO CON EXITO LA FOTO DE PERFIL DEL NUMERO DEL BOT*'));
  } catch {
    throw (t.sin_imagen?.replace('{comando}', usedPrefix + command) || `*[❗INFO❗] NO SE ENCONTRO LA IMAGEN, POR FAVOR RESPONDE A UNA IMAGEN USANDO EL COMANDO ${usedPrefix + command}*`);
  }
};

handler.command = /^setppbot$/i;
handler.rowner = true;

export default handler;
