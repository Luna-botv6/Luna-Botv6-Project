import * as Jimp from 'jimp';

const handler = async (m, { conn }) => {
  try {
    if (!m.quoted) throw '*⚠️️ Responde a una imagen.*';

    const quoted = m.quoted;
    const media = await quoted.download();
    const groupJid = m.chat;

    async function resizeImage(buffer) {
      const image = await Jimp.read(buffer);
      const resized = image.getWidth() > image.getHeight()
        ? image.resize(720, Jimp.AUTO)
        : image.resize(Jimp.AUTO, 720);
      return { img: await resized.getBufferAsync(Jimp.MIME_JPEG) };
    }

    const { img } = await resizeImage(media);

    await conn.query({
      tag: 'iq',
      attrs: { to: groupJid, type: 'set', xmlns: 'w:profile:picture' },
      content: [{ tag: 'picture', attrs: { type: 'image' }, content: img }]
    });

    m.reply('⚘ *_Imagen actualizada con éxito._*');
  } catch {
    throw '*⚠️️ Responde a una imagen.*';
  }
};

handler.help = ['setppgc'];
handler.tags = ['group', 'adm'];
handler.command = /^setpp(gc|grup|group)$/i;
handler.botAdmin = handler.admin = handler.group = true;

export default handler;
