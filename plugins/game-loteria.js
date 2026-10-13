import fs from 'node:fs';
import path from 'node:path';
import { getUserStats, addExp, addMoney, removeMoney } from '../lib/stats.js';
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js';

const DIR = './database';
const FILE = path.join(DIR, 'lottery.json');
const DURACION = 30 * 60 * 1000;
const PRECIO = 200;
const MINIMO = 5;
const PREMIOS = [
  { money: 20000, exp: 60000 },
  { money: 10000, exp: 30000 },
  { money: 5000, exp: 15000 }
];
const CONSOLO_MONEY = 100;
const CONSOLO_EXP = 1000;

function estadoVacio() {
  return { active: false, participants: [], startTime: null, endTime: null, ticketPrice: PRECIO, prizePool: 0, winners: [] };
}

function leer() {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    if (!fs.existsSync(FILE)) return { chats: {} };
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (raw && typeof raw === 'object' && raw.chats && typeof raw.chats === 'object') return raw;
    return { chats: {} };
  } catch {
    return { chats: {} };
  }
}

function guardar(data) {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  } catch {}
}

function migrarLegado() {
  let raw = null;
  try {
    if (!fs.existsSync(FILE)) return;
    raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return; }
  if (!raw || typeof raw !== 'object' || raw.chats) return;
  if (raw.active === true && Array.isArray(raw.participants) && raw.participants.length > 0) {
    const precio = Number(raw.ticketPrice) || PRECIO;
    for (const p of raw.participants) {
      try { if (p && p.id) addMoney(p.id, precio); } catch {}
    }
  }
  guardar({ chats: {} });
}

function juegoDe(chatId) {
  const data = leer();
  const st = data.chats[chatId];
  if (st && typeof st === 'object' && Array.isArray(st.participants)) return st;
  return estadoVacio();
}

function guardarJuego(chatId, st) {
  const data = leer();
  if (st && st.active) data.chats[chatId] = st;
  else delete data.chats[chatId];
  guardar(data);
}

function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function numeroDe(sender, conn) {
  try {
    const tel = resolveJidToPhone(sender, conn);
    if (tel) return String(tel).replace(/\D/g, '');
  } catch {}
  return String(sender || '').split('@')[0].replace(/\D/g, '');
}

function textos(idioma) {
  const lang = idioma || global.defaultLenguaje || 'es';
  try {
    const parsed = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'));
    if (parsed?.plugins?.game_loteria) return parsed.plugins.game_loteria;
  } catch {}
  try {
    const parsed = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'));
    if (parsed?.plugins?.game_loteria) return parsed.plugins.game_loteria;
  } catch {}
  return {};
}

const timers = new Map();

function limpiarTimer(chatId) {
  try {
    if (timers.has(chatId)) clearTimeout(timers.get(chatId));
  } catch {}
  timers.delete(chatId);
}

function programarCierre(conn, chatId) {
  limpiarTimer(chatId);
  const st = juegoDe(chatId);
  if (!st.active || !st.endTime) return;
  const resto = st.endTime - Date.now();
  if (resto <= 0) return;
  timers.set(chatId, setTimeout(() => {
    timers.delete(chatId);
    try { endLottery(conn, chatId); } catch {}
  }, resto));
}

function tiempoRestante(st, t) {
  if (!st.active) return t?.tiempo_cero || '0 minutos';
  const remaining = st.endTime - Date.now();
  if (remaining <= 0) return t?.terminado || '¡Terminado!';
  const minutes = Math.floor(remaining / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  return `${minutes}m ${seconds}s`;
}

function comas(x) {
  return Number(x || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function endLottery(conn, chatId) {
  const st = juegoDe(chatId);
  if (!st.active) return;
  limpiarTimer(chatId);
  const lang = global?.db?.data?.chats?.[chatId]?.language || global.defaultLenguaje || 'es';
  const t = textos(lang);
  const precio = Number(st.ticketPrice) || PRECIO;
  if (st.participants.length < MINIMO) {
    for (const p of st.participants) {
      try { addMoney(p.jid, precio); } catch {}
    }
    try {
      conn.sendMessage(chatId, { text: t?.cancelada || `❌ *Lotería cancelada*\n\n🔄 No se alcanzó el mínimo de ${MINIMO} participantes\n💎 Se reembolsó a todos` });
    } catch {}
    guardarJuego(chatId, estadoVacio());
    return;
  }
  const ganadores = barajar(st.participants).slice(0, 3);
  const medallas = ['🥇', '🥈', '🥉'];
  const puestos = [t?.puesto1 || '1er Lugar', t?.puesto2 || '2do Lugar', t?.puesto3 || '3er Lugar'];
  ganadores.forEach((w, i) => {
    try { addMoney(w.jid, PREMIOS[i].money); } catch {}
    try { addExp(w.jid, PREMIOS[i].exp); } catch {}
  });
  for (const p of st.participants) {
    if (ganadores.some((w) => w.num === p.num)) continue;
    try { addExp(p.jid, CONSOLO_EXP); } catch {}
    try { addMoney(p.jid, CONSOLO_MONEY); } catch {}
  }
  let msg = (t?.resultados || '🎰 *¡RESULTADOS DE LA LOTERÍA!* 🎰\n\n') +
    `💎 *${t?.premio_total || 'Premio total'}:* ${comas(st.prizePool)} 💎\n` +
    `👥 *${t?.participantes || 'Participantes'}:* ${st.participants.length}\n\n` +
    `🏆 *${t?.ganadores || 'GANADORES:'}* 🏆\n\n`;
  ganadores.forEach((w, i) => {
    msg += `${medallas[i]} *${puestos[i]}:* @${w.num}\n   💎 ${comas(PREMIOS[i].money)} 💎 + ${comas(PREMIOS[i].exp)} EXP\n\n`;
  });
  msg += (t?.consuelo || '✨ *Los demás recibieron 100 💎 + 1,000 EXP de consolación*\n\n¡Gracias por participar! 🎉');
  try {
    conn.sendMessage(chatId, { text: msg, mentions: ganadores.map((w) => w.jid) });
  } catch {}
  guardarJuego(chatId, estadoVacio());
}

migrarLegado();

const handler = async (m, { conn, command, usedPrefix }) => {
  const idioma = global.db.data.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
  const t = textos(idioma);
  const num = numeroDe(m.sender, conn);
  const jid = num ? num + '@s.whatsapp.net' : m.sender;
  const username = m.pushName || (t.usuario_default || 'Usuario');

  let st = juegoDe(m.chat);
  if (st.active && st.endTime && st.endTime <= Date.now()) {
    endLottery(conn, m.chat);
    st = juegoDe(m.chat);
  }
  programarCierre(conn, m.chat);

  switch (command) {
  case 'loteria':
  case 'startlottery':
    if (st.active) {
      return m.reply((t?.en_curso || '🎰 *Ya hay una lotería activa!*\n\n') +
        `⏰ ${t?.tiempo || 'Tiempo restante'}: ${tiempoRestante(st, t)}\n` +
        `👥 ${t?.participantes || 'Participantes'}: ${st.participants.length}\n` +
        `💎 ${t?.pozo || 'Pozo'}: ${comas(st.prizePool)} 💎\n\n` +
        `${t?.ver_mas || 'Usa'} *${usedPrefix}linfo*`);
    }
    st = { active: true, participants: [], startTime: Date.now(), endTime: Date.now() + DURACION, ticketPrice: PRECIO, prizePool: 0, winners: [] };
    guardarJuego(m.chat, st);
    programarCierre(conn, m.chat);
    return m.reply((t?.nueva || '🎰 *¡NUEVA LOTERÍA INICIADA!* 🎰\n\n') +
      `💎 *${t?.precio || 'Precio del ticket'}:* ${PRECIO} 💎\n` +
      `⏰ *${t?.duracion || 'Duración'}:* 30 ${t?.minutos || 'minutos'}\n` +
      `👥 *${t?.minimo || 'Mínimo'}:* ${MINIMO}\n` +
      `🏆 *${t?.premios || 'Premios'}:*\n` +
      `   🥇 20,000 💎 + 60,000 EXP\n` +
      `   🥈 10,000 💎 + 30,000 EXP\n` +
      `   🥉 5,000 💎 + 15,000 EXP\n\n` +
      `• *${usedPrefix}ticket* - ${t?.comprar || 'Comprar ticket'}\n` +
      `• *${usedPrefix}linfo* - ${t?.ver_info || 'Ver información'}`);

  case 'ticket':
  case 'buyticket':
    if (!st.active) {
      return m.reply(t?.sin_loteria?.replace('{usedPrefix}', usedPrefix) || `❌ No hay lotería activa. Usa *${usedPrefix}loteria* para iniciar una.`);
    }
    if (st.participants.some((p) => p.num === num)) {
      return m.reply(t?.ya_tienes || '⚠️ Ya tienes un ticket para esta lotería!');
    }
    {
      const stats = getUserStats(jid);
      const precio = Number(st.ticketPrice) || PRECIO;
      if (stats.money < precio) {
        return m.reply((t?.sin_diamantes?.replace('{precio}', precio).replace('{tienes}', stats.money)) || `❌ No tienes suficientes diamantes! Necesitas ${precio} 💎 pero solo tienes ${stats.money} 💎`);
      }
      removeMoney(jid, precio);
      st.prizePool += precio;
      st.participants.push({ num, jid, username, ticketNumber: st.participants.length + 1, joinTime: Date.now() });
      guardarJuego(m.chat, st);
    }
    return m.reply((t?.comprado || '🎫 *¡Ticket comprado!*\n\n') +
      `🎰 ${t?.tu_ticket || 'Tu ticket'}: #${st.participants.length}\n` +
      `💎 ${t?.pozo || 'Pozo'}: ${comas(st.prizePool)} 💎\n` +
      `👥 ${t?.participantes || 'Participantes'}: ${st.participants.length}\n` +
      `⏰ ${t?.queda || 'Quedan'}: ${tiempoRestante(st, t)}\n\n` +
      (t?.suerte || '¡Buena suerte! 🍀'));

  case 'linfo':
  case 'lotteryinfo': {
    if (!st.active) {
      return m.reply(t?.sin_loteria_corta || '❌ No hay ninguna lotería activa.');
    }
    let lista = st.participants.map((p) => `🎫 #${p.ticketNumber} - @${p.num}`).join('\n');
    if (lista.length > 1000) lista = `${st.participants.length} ${t?.registrados || 'participantes registrados'}`;
    return m.reply((t?.info_titulo || '🎰 *INFORMACIÓN DE LOTERÍA* 🎰\n\n') +
      `💎 ${t?.pozo || 'Pozo'}: ${comas(st.prizePool)} 💎\n` +
      `👥 ${t?.participantes || 'Participantes'}: ${st.participants.length}\n` +
      `⏰ ${t?.queda || 'Quedan'}: ${tiempoRestante(st, t)}\n` +
      `💎 ${t?.precio || 'Precio'}: ${Number(st.ticketPrice) || PRECIO} 💎\n\n` +
      `${t?.lista || 'Participantes'}:\n${lista}\n\n` +
      `• *${usedPrefix}ticket* - ${t?.comprar || 'Comprar ticket'}`);
  }

  case 'reiniciarloteria':
  case 'reinicarloteria':
  case 'cleanlottery':
    limpiarTimer(m.chat);
    guardarJuego(m.chat, estadoVacio());
    return m.reply(t?.reiniciada || '🧹 *Lotería reiniciada.* Ya puedes iniciar una nueva.');
  }
};

handler.help = ['loteria', 'ticket', 'linfo', 'cleanlottery', 'reiniciarloteria', 'reinicarloteria'];
handler.tags = ['game'];
handler.command = /^(loteria|startlottery|ticket|buyticket|linfo|lotteryinfo|cleanlottery|reiniciarloteria|reinicarloteria)$/i;

export default handler;
