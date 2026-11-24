import fs from 'fs';
import { canLevelUp, xpRange } from '../lib/levelling.js';
import { levelup } from '../lib/canvas.js';
import {
  getUserStats,
  setUserStats,
  getRoleByLevel,
  addExp,
  addMoney
} from '../lib/stats.js';
import { claveEconomia } from '../lib/funcion/economiaCanonica.js';
import { nombreSeguro } from '../lib/funcion/nombre.js';

const nf = (n) => Number(n || 0).toLocaleString('es-AR');

function progressBar(percent) {
  const totalBars = 12;
  const filledBars = Math.max(0, Math.min(totalBars, Math.round((percent / 100) * totalBars)));
  return '▰'.repeat(filledBars) + '▱'.repeat(totalBars - filledBars);
}

const handler = async (m, { conn }) => {
  const id = claveEconomia(m.sender, conn) || m.sender;

  const idioma = global.db.data.users[id]?.language
    || global.db.data.users[m.sender]?.language
    || global.defaultLenguaje
    || 'es';

  let _t = {};
  try {
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'));
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch {}
  }
  const tradutor = _t.plugins?.rpg_levelup || {};

  let user = getUserStats(id);
  const beforeLevel = Number(user.level || 0);
  let leveledUp = false;

  for (let vueltas = 0; vueltas < 500; vueltas++) {
    if (!canLevelUp(user.level, user.exp)) break;
    const { max } = xpRange(user.level);
    if (user.exp < max) break;
    user.exp -= max;
    user.level += 1;
    leveledUp = true;
  }

  if (leveledUp) {
    user.role = getRoleByLevel(user.level);
    setUserStats(id, user);
  }

  const nombre = await nombreSeguro(conn, id, String(id).split('@')[0]);

  if (user.level > beforeLevel) {
    const levelsGained = user.level - beforeLevel;
    const expBonus = levelsGained * 1000;
    const moneyBonus = levelsGained * 600;

    addExp(id, expBonus);
    addMoney(id, moneyBonus);

    const textoSubida = `🎉 *${tradutor.texto1 || '¡SUBISTE DE NIVEL!'}*\n\n` +
      `◉ ${tradutor.texto2 || 'Nivel anterior'}: ${beforeLevel}\n` +
      `◉ ${tradutor.texto3 || 'Nivel nuevo'}: ${user.level}\n` +
      `◉ ${tradutor.texto4 || 'Rango'}: ${user.role}\n\n` +
      `🎁 Bonus: +${nf(expBonus)} XP, +${nf(moneyBonus)} ${tradutor.texto10 || 'diamantes'}`;

    try {
      const img = await levelup(`${tradutor.texto5 || 'NIVEL'}\n¡${tradutor.texto6 || 'Felicitaciones'}, ${nombre}!`, user.level);
      return conn.sendFile(m.chat, img, 'levelup.jpg', textoSubida, m);
    } catch {
      return m.reply(textoSubida);
    }
  }

  const { max } = xpRange(user.level);
  const exp = Number(user.exp || 0);
  const xpNeeded = Math.max(0, max - exp);
  const percent = max > 0 ? Math.max(0, Math.min(100, Math.floor((exp / max) * 100))) : 0;
  const banco = Number(user.banco?.money || 0);
  const money = Number(user.money || 0);

  return m.reply(
    `🏰 *${tradutor.texto5 || 'NIVEL'} — ${nombre}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📈 Nivel: *${user.level}* · 🏅 ${user.role || getRoleByLevel(user.level)}\n` +
    `⭐ EXP: *${nf(exp)}* / ${nf(max)}  (${percent}%)\n` +
    `${progressBar(percent)}\n` +
    `🎯 Te faltan *${nf(xpNeeded)}* EXP para el nivel ${user.level + 1}\n\n` +
    `💎 Billetera: *${nf(money)}*\n` +
    `🏦 Banco: *${nf(banco)}*\n` +
    `📦 Total: *${nf(money + banco)}*\n\n` +
    `> 💡 *${tradutor.texto12 || '.perfil'}* para ver tu personaje completo\n` +
    `> ⏳ El nivel sube solo: cada EXP que ganes se acumula acá`
  );
};

handler.help = ['nivel', 'lvl', 'levelup'];
handler.tags = ['xp'];
handler.command = ['nivel', 'lvl', 'levelup'];
export default handler;
