import fs from 'fs';
import { getUserStats, setUserStats, addExp, addMoney } from '../lib/stats.js';
import { getLastClaimTime, setLastClaimTime, initClaimUser } from '../lib/reclamar.js';
import { resolveMenuImage } from '../lib/funcion/menu-media.js';

const BOT = () => global.BotName || 'Luna';
const DEFAULT_IMG = 'https://github.com/Luna-botv6/base-archivos/blob/main/otros/reclamar.png?raw=true';

async function getMenuImage(conn, idioma) {
  try {
    const propia = await resolveMenuImage(conn, idioma);
    if (propia) return propia;
  } catch {}
  return DEFAULT_IMG;
}

const handler = async (m, { conn }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let _t = {};
  try {
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'));
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch {}
  }
  const tradutor = _t.plugins?.rpg_daily || {};
  const userId = m.sender;
  const user = getUserStats(userId);
  initClaimUser(userId);
  const baseRewards = { exp: 5000, money: 2500, mysticcoins: 5 };
  const premiumRewards = { exp: 10000, money: 5000, mysticcoins: 10 };
  const isPremium = user.premiumTime && user.premiumTime > Date.now();
  const recompensas = isPremium ? premiumRewards : baseRewards;
  const lastClaim = getLastClaimTime(userId);
  const cooldown = 21600000;
  const now = Date.now();
  if (now - lastClaim < cooldown) {
    const remaining = cooldown - (now - lastClaim);
    return await conn.reply(m.chat, `⏳ ${tradutor.texto1?.[0] || 'Espera'} *${msToTime(remaining)}* ${tradutor.texto1?.[1] || 'para reclamar de nuevo'}`, m);
  }
  addExp(userId, recompensas.exp);
  addMoney(userId, recompensas.money);
  const updatedUser = getUserStats(userId);
  updatedUser.mysticcoins = (updatedUser.mysticcoins || 0) + recompensas.mysticcoins;
  setUserStats(userId, updatedUser);
  setLastClaimTime(userId, now);
  const text = `╭〔 🎁 *${tradutor.texto2 || 'RECOMPENSA DIARIA'}* 〕━⬣
┃
┃ *${isPremium ? (tradutor.texto3?.[0] || '✨ Premium') : (tradutor.texto3?.[1] || '🎁 Estándar')}*
┃
┃ ✨ *+${recompensas.exp}* EXP
┃ 💰 *+${recompensas.money}* ${tradutor.texto4 || 'monedas'}
┃ 🪙 *+${recompensas.mysticcoins}* MysticCoins
┃
┃ 🌟 *Premium:* ${isPremium ? '✅' : '❌'}
┃ 🤖 *${BOT()}*
╰━━━━━━━━━━━━━━━━━━━⬣`;
  const img = await getMenuImage(conn, idioma);
  await conn.sendFile(m.chat, img, 'daily.jpg', text, m);
};

handler.help = ['daily'];
handler.tags = ['xp'];
handler.command = ['daily', 'reclamar', 'reclamo', 'regalo', 'claim'];
export default handler;

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  return `${hours}h ${minutes}m ${seconds}s`;
}