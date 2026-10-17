import fs from 'fs';
import { addExp, addMoney } from '../lib/stats.js';
import { getLastCofreTime, setLastCofreTime, initCofreUser } from '../lib/cofre.js';

const IMG = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/otros/cofre.png';

function cargarIdioma(m) {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  try {
    return JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'));
  } catch {
    try { return JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch { return {}; }
  }
}

function nf(n) {
  return Number(n || 0).toLocaleString();
}

function render(tpl, valores) {
  let out = tpl;
  for (const [k, v] of Object.entries(valores)) out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  return out;
}

const handler = async (m, { conn }) => {
  const _t = cargarIdioma(m);
  const t = _t.plugins?.rpg_cofre || {};

  const userId = m.sender;
  initCofreUser(userId);

  const baseRewards = { exp: 7500, money: 3000, mysticcoins: 10 };
  const premiumRewards = { exp: 15000, money: 6000, mysticcoins: 20 };

  const stats = global.db.data.users[m.sender];
  const isPremium = stats.premiumTime && stats.premiumTime > Date.now();
  const recompensas = isPremium ? premiumRewards : baseRewards;

  const lastCofre = getLastCofreTime(userId);
  const cooldown = 86400000;
  const now = Date.now();
  const remaining = cooldown - (now - lastCofre);

  if (remaining > 0) {
    if (t.card_cofre_cooldown) throw render(t.card_cofre_cooldown, { tiempo: msToTime(remaining) });
    throw `${t.texto1[0]} *${msToTime(remaining)}* ${t.texto1[1]}`;
  }

  addExp(userId, recompensas.exp);
  addMoney(userId, recompensas.money);

  const updatedUser = global.db.data.users[userId];
  updatedUser.mysticcoins = (updatedUser.mysticcoins || 0) + recompensas.mysticcoins;

  setLastCofreTime(userId, now);

  const texto = t.card_cofre
    ? render(t.card_cofre, {
      exp: nf(recompensas.exp),
      money: nf(recompensas.money),
      mystic: nf(recompensas.mysticcoins),
      premium: isPremium ? '✅' : '❌',
      saldo: nf(updatedUser.money || 0)
    })
    : `
${t.texto2[0]}
${t.texto2[1]}
${t.texto2[2]}
║➢ *${nf(recompensas.exp)}* ⭐ ${t.texto2[3]}
║➢ *${nf(recompensas.money)}* 💎 ${t.texto2[4]}
║➢ *${nf(recompensas.mysticcoins)}* 🪙 ${t.texto2[5]}
║➢ ${t.texto2[6]} ${isPremium ? '✅' : '❌'}
${t.texto2[7]}`;

  const fkontak = {
    key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
    message: { contactMessage: { vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` } },
    participant: '0@s.whatsapp.net',
  };

  try {
    await conn.sendFile(m.chat, IMG, 'cofre.png', texto, fkontak);
  } catch {
    await conn.sendMessage(m.chat, { text: texto }, { quoted: m });
  }
};

handler.help = ['cofre', 'abrircofre'];
handler.tags = ['xp'];
handler.command = ['coffer', 'cofre', 'abrircofre', 'cofreabrir'];
handler.level = 5;
export default handler;

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  return `${hours}h ${minutes}m ${seconds}s`;
}
