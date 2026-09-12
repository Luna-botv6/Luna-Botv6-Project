import { addVote } from '../lib/datoswaifuusuarios.js';

let handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.votewaifu || {};
  if (!args || args.length < 2) return await conn.reply(m.chat, t.uso || 'Uso: .vote <NombreWaifu> <valor>', m);
  let nombre = args[0];
  let valor = parseInt(args[1]);
  if (isNaN(valor)) return await conn.reply(m.chat, t.numero_valido || 'El valor debe ser un número.', m);
  addVote(m.sender, nombre, valor);
  await conn.reply(m.chat, (t.votado || '✅ Has votado {valor} puntos a {nombre}').replace('{valor}', valor).replace('{nombre}', nombre), m);
};

handler.help = ['vote'];
handler.tags = ['rpg', 'gacha'];
handler.command = /^vote$/i;
export default handler;
