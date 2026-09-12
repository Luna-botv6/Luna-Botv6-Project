const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.info_gruposofc || {};
  const texto = (t.texto || `
┏━━━━━━━━━━━━━━━┓
┃✨ 𝙃𝙤𝙡𝙖, 𝙚𝙨𝙩𝙖 𝙚𝙨 𝙣𝙪𝙚𝙨𝙩𝙧𝙖 𝙘𝙤𝙢𝙪𝙣𝙞𝙙𝙖𝙙 ✨
┗━━━━━━━━━━━━━━━┛

📣 Ú𝙣𝙚𝙩𝙚 𝙖 𝙣𝙪𝙚𝙨𝙩𝙧𝙤 𝘾𝘼𝙉𝘼𝙇 𝙊𝙁𝙄𝘾𝙄𝘼𝙇 𝙙𝙚 𝙒𝙝𝙖𝙩𝙨𝘼𝙥𝙥:

👉 *https://www.whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y*

🖤 ¡Te esperamos con novedades, bots, actualizaciones y más!
`);

  await conn.sendMessage(m.chat, { text: texto.trim() }, { quoted: m });
};

handler.command = ['linkgc', 'grupos'];
export default handler;

