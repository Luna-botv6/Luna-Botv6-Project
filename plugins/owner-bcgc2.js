import fs from 'fs';

const BOT = () => global.BotName || 'Luna';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const MENU_DIR = './database/WELCOME';
const CUSTOM_IMG = `${MENU_DIR}/menu_image.jpg`;
const DEFAULT_IMG = './src/assets/images/menu/languages/es/menu.png';

function getMenuImage(idioma) {
  if (fs.existsSync(CUSTOM_IMG)) return CUSTOM_IMG;
  const langImg = `./src/assets/images/menu/languages/${idioma}/menu.png`;
  if (fs.existsSync(langImg)) return langImg;
  return DEFAULT_IMG;
}

const handler = async (m, { conn, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let _t = {};
  try {
    const mod = await import(`../src/lunaidiomas/${idioma}.json`, { with: { type: 'json' } });
    _t = mod.default;
  } catch {
    try {
      const mod = await import('../src/lunaidiomas/es.json', { with: { type: 'json' } });
      _t = mod.default;
    } catch {}
  }
  const tradutor = _t.plugins?.owner_bcgc2 || {};

  if (!m.quoted) {
    return conn.reply(
      m.chat,
      `${tradutor.texto1?.[0] || '❌ Cita un mensaje para usar'} *${usedPrefix}${command}* ${tradutor.texto1?.[1] || ''}`.trim(),
      m
    );
  }

  const allGroups = await conn.groupFetchAllParticipating();
  const groupIds = Object.keys(allGroups).filter((jid) => jid.endsWith('@g.us'));

  if (!groupIds.length) return conn.reply(m.chat, '❌ El bot no está en ningún grupo.', m);

  conn.reply(m.chat, `📣 *${BOT()}* — Difundiendo multimedia a *${groupIds.length}* grupos...`, m);

  const imgPath = getMenuImage(idioma);
  const fproducto = {
    key: { fromMe: false, participant: '0@s.whatsapp.net' },
    message: {
      productMessage: {
        product: {
          productImage: { mimetype: 'image/jpeg', jpegThumbnail: fs.existsSync(imgPath) ? fs.readFileSync(imgPath) : undefined },
          title: `📣 ${BOT()} — Comunicado oficial`,
          description: `Difusión a grupos`,
          currencyCode: 'USD',
          priceAmount1000: '0',
          retailerId: BOT(),
          productImageCount: 1
        },
        businessOwnerJid: '0@s.whatsapp.net'
      }
    }
  };

  let enviados = 0;
  let fallidos = 0;

  for (const gid of groupIds) {
    try {
      await conn.sendMessage(
        gid,
        { forward: m.quoted.fakeObj },
        { quoted: fproducto }
      );
      enviados++;
    } catch {
      fallidos++;
    }
    await delay(3000);
  }

  conn.reply(
    m.chat,
    `✅ *Difusión completada*\n\n📤 Enviados: *${enviados}*\n❌ Fallidos: *${fallidos}*`,
    m
  );
};

handler.help = ['bcgc2'];
handler.tags = ['owner'];
handler.command = /^(bcgc2)$/i;
handler.owner = true;

export default handler;
