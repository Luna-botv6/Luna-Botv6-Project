import fetch from 'node-fetch';
import * as Jimp from 'jimp';

const handler = async (m, { conn, text }) => {
  const who = m.quoted?.sender || m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
  const userText = text?.trim() || 'Licencia para dejarte en visto';
  const nombre = m.pushName || 'Usuario';
  const fecha = new Date().toLocaleDateString('es-ES');
  const vencimiento = 'nunca';

  await m.reply('⏳ Generando licencia...');

  let base = null;
  let avatar = null;

  try {
    const avatarUrl = await conn.profilePictureUrl(who, 'image')
      .catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png');

    const [avatarRes, baseRes] = await Promise.all([
      fetch(avatarUrl),
      fetch('https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/licencia.jpg')
    ]);

    const [avatarBuffer, baseBuffer] = await Promise.all([
      avatarRes.arrayBuffer().then(b => Buffer.from(b)),
      baseRes.arrayBuffer().then(b => Buffer.from(b))
    ])

    ;[base, avatar] = await Promise.all([
  Jimp.Jimp.read(baseBuffer),
  Jimp.Jimp.read(avatarBuffer)
]);
    avatar.resize({ w: 170, h: 165 });
    base.composite(avatar, 385, 180);
    avatar = null;

    const [fontWhite, fontBlack, fontSmall] = await Promise.all([
  Jimp.loadFont('/home/container/node_modules/@jimp/plugin-print/fonts/open-sans/open-sans-32-white/open-sans-32-white.fnt'),
  Jimp.loadFont('/home/container/node_modules/@jimp/plugin-print/fonts/open-sans/open-sans-32-black/open-sans-32-black.fnt'),
  Jimp.loadFont('/home/container/node_modules/@jimp/plugin-print/fonts/open-sans/open-sans-16-black/open-sans-16-black.fnt')
]);

   base.print({ font: fontSmall, x: 260, y: 175, text: 'nombre:' });
   base.print({ font: fontSmall, x: 260, y: 195, text: nombre });
   base.print({ font: fontSmall, x: 260, y: 225, text: 'fecha:' });
   base.print({ font: fontSmall, x: 260, y: 255, text: fecha });
   base.print({ font: fontSmall, x: 260, y: 285, text: 'vencimiento:' });
   base.print({ font: fontSmall, x: 260, y: 315, text: vencimiento });
    const imgW = base.bitmap.width;
    const imgH = base.bitmap.height;
    const x = 10;
    const y = imgH - 110;
    const maxW = imgW - 20;
    const maxH = 70;
    const opts = { text: userText, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER };

    for (const [dx, dy] of [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,-2],[-2,2],[2,2]]) {
      base.print({
  font: fontBlack,
  x: x + dx,
  y: y + dy,
  text: opts
});
    }
    base.print({
  font: fontWhite,
  x,
  y,
  text: opts
});

    const output = await base.getBuffer('image/jpeg');
    base = null;

    await conn.sendMessage(m.chat, { image: output }, { quoted: m });
  } catch (e) {
    await m.reply(`❌ Error: ${e.message}`);
  } finally {
    base = null;
    avatar = null;
    if (global.gc) global.gc();
  }
};

handler.help = ['licencia <texto>'];
handler.tags = ['maker'];
handler.command = /^(licencia)$/i;
export default handler;