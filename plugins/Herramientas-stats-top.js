
import fs from 'fs';
import path from 'path';
import { getUserStats } from '../lib/stats.js';

const file = path.join('./database', 'stats.json');

const handler = async (m, { conn, isOwner, isROwner, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.herramientas_stats_top || {};
  if (!isOwner && !isROwner) throw (t.solo_owner || 'Este comando es solo para los *propietarios del bot*.');

  if (!fs.existsSync(file)) throw (t.sin_bd || 'No se encontró la base de datos de estadísticas.');

  const raw = JSON.parse(fs.readFileSync(file));
  const stats = [];

  for (const id in raw) {
    const user = getUserStats(id);
    stats.push({ id, ...user });
  }

  stats.sort((a, b) => b.exp - a.exp);

  const top = stats.slice(0, 10);

  let text = (t.titulo || '╭━━━〔 *TOP 10 EXP - LunaBotV6* 〕━━━╮\n');
  for (let i = 0; i < top.length; i++) {
    const user = top[i];
    text += (t.item_pos?.replace('{pos}', i + 1).replace('{id}', user.id.split('@')[0]) || `\n${i + 1}. *${user.id.split('@')[0]}*\n`);
    text += (t.nivel?.replace('{nivel}', user.level) || `   ✨ Nivel: *${user.level}*\n`);
    text += (t.exp?.replace('{exp}', user.exp) || `   ⚡ EXP: *${user.exp}*\n`);
    text += (t.diamantes?.replace('{diamantes}', user.money) || `   💎 Diamantes: *${user.money}*\n`);
    text += (t.lunacoins?.replace('{lunacoins}', user.lunaCoins) || `   🪙 LunaCoins: *${user.lunaCoins}*\n`);
  }
  text += (t.pie || '\n╰━━━━━━━━━━━━━━━━━━━━━━━╯');

  m.reply(text);
};

handler.command = /^statsglobal|estadisticas$/i;
handler.rowner = true;
export default handler;