import { getHarem } from '../lib/datoswaifuusuarios.js';

let handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.harem || {};
  let harem = getHarem(m.sender);
  if (!harem || harem.length === 0) return await conn.reply(m.chat, t.vacio || '❌ No tienes waifus en tu harem.', m);
  let text = (t.titulo || '💖 Tu Harem 💖') + '\n\n';
  harem.forEach((w,i)=>{text+=`${i+1}. ${w.nombre} (${w.anime}) - ${t.valor || 'Valor'}: ${w.valor} - ${t.rareza || 'Rareza'}: ${w.rareza}\n`;});
  await conn.reply(m.chat, text, m);
};

handler.help = ['harem'];
handler.tags = ['rpg', 'gacha'];
handler.command = /^harem$/i;
export default handler;
