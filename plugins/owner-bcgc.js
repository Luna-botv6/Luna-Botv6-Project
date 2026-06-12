import fs from 'fs';

const BOT = () => global.BotName || 'Luna';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const MENU_DIR = './database/WELCOME';
const CUSTOM_IMG = `${MENU_DIR}/menu_image.jpg`;
const DEFAULT_IMG = './src/assets/images/menu/languages/es/menu.png';

function getThumb(idioma) {
  if (fs.existsSync(CUSTOM_IMG)) return fs.readFileSync(CUSTOM_IMG);
  const langImg = `./src/assets/images/menu/languages/${idioma}/menu.png`;
  if (fs.existsSync(langImg)) return fs.readFileSync(langImg);
  if (fs.existsSync(DEFAULT_IMG)) return fs.readFileSync(DEFAULT_IMG);
  return undefined;
}

const handler = async (m, { conn, text }) => {
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
  const tradutor = _t.plugins?.owner_bcgc || {};

  const pesan = m.quoted?.text || text;
  if (!pesan) return conn.reply(m.chat, tradutor.texto1 || '❌ Debes escribir o citar un mensaje para difundir.', m);

  const allGroups = await conn.groupFetchAllParticipating();
  const groupIds = Object.keys(allGroups).filter((jid) => jid.endsWith('@g.us'));

  if (!groupIds.length) return conn.reply(m.chat, '❌ El bot no está en ningún grupo.', m);

  conn.reply(m.chat, `📣 *${BOT()}* — Difundiendo a *${groupIds.length}* grupos...`, m);

  const thumb = getThumb(idioma);
  const msgOptions = {
    text: `╔══〔 *COMUNICADO* 〕══╗\n\n${pesan}\n\n╚══〔 *${BOT()}* 〕══╝`,
    contextInfo: {
      externalAdReply: {
        title: `📣 ${BOT()} — Comunicado Oficial`,
        body: 'Mensaje enviado a todos los grupos',
        thumbnail: thumb,
        mediaType: 1,
        renderLargerThumbnail: false
      }
    }
  };

  let enviados = 0;
  let fallidos = 0;

  for (const gid of groupIds) {
    try {
      await conn.sendMessage(gid, msgOptions);
      enviados++;
    } catch {
      fallidos++;
    }
    await delay(2500);
  }

  conn.reply(
    m.chat,
    `✅ *Difusión completada*\n\n📤 Enviados: *${enviados}*\n❌ Fallidos: *${fallidos}*`,
    m
  );
};

handler.help = ['bcgc <texto>'];
handler.tags = ['owner'];
handler.command = /^((broadcast|bc)(group|grup|gc)?|bc)$/i;
handler.owner = true;

export default handler;
