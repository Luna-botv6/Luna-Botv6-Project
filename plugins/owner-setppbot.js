import * as Jimp from 'jimp';

const handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const botJid = conn.user.jid;
    if (!m.quoted) throw `*[❗INFO❗] NO SE ENCONTRO LA IMAGEN, POR FAVOR RESPONDE A UNA IMAGEN USANDO EL COMANDO ${usedPrefix + command}*`;

    const quoted = m.quoted;
    const media = await quoted.download();

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
      attrs: { to: botJid, type: 'set', xmlns: 'w:profile:picture' },
      content: [{ tag: 'picture', attrs: { type: 'image' }, content: img }]
    });

    m.reply('*[❗INFO❗] SE CAMBIO CON EXITO LA FOTO DE PERFIL DEL NUMERO DEL BOT*');
  } catch {
    throw `*[❗INFO❗] NO SE ENCONTRO LA IMAGEN, POR FAVOR RESPONDE A UNA IMAGEN USANDO EL COMANDO ${usedPrefix + command}*`;
  }
};

handler.command = /^setppbot$/i;
handler.rowner = true;

export default handler;
