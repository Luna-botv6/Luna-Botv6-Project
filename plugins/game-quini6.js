import fs from 'node:fs';
import path from 'node:path';
import { getUserStats, addExp, addMoney, removeMoney } from '../lib/stats.js';
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js';

const DIR = './database';
const FILE = path.join(DIR, 'quini6.json');
const LEGADO = './lib/quini6.json';
const DURACION = 30 * 60 * 1000;
const PRECIO = 200;

function estadoVacio() {
  return { active: false, participants: [], startTime: null, endTime: null, winningNumbers: [] };
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
  const candidatos = [LEGADO, FILE];
  for (const ruta of candidatos) {
    let raw = null;
    try {
      if (!fs.existsSync(ruta)) continue;
      raw = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    } catch { continue; }
    if (!raw || typeof raw !== 'object' || raw.chats) continue;
    if (raw.active === true && Array.isArray(raw.participants) && raw.participants.length > 0) {
      for (const p of raw.participants) {
        try { if (p && p.id) addMoney(p.id, PRECIO); } catch {}
      }
    }
  }
  try { if (fs.existsSync(LEGADO)) fs.unlinkSync(LEGADO); } catch {}
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

function fmt2(n) {
  return String(n).padStart(2, '0');
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
    if (parsed?.plugins?.game_quini6) return parsed.plugins.game_quini6;
  } catch {}
  try {
    const parsed = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'));
    if (parsed?.plugins?.game_quini6) return parsed.plugins.game_quini6;
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
    try { endQuini(conn, chatId); } catch {}
  }, resto));
}

function tiempoRestante(st, t) {
  if (!st.active) return t?.tiempo_zero || '0 minutos';
  const remaining = st.endTime - Date.now();
  if (remaining <= 0) return t?.tiempo_terminado || '¡Terminado!';
  const minutes = Math.floor(remaining / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  if (t?.tiempo_formato) return t.tiempo_formato.replace('{minutes}', minutes).replace('{seconds}', seconds);
  return `${minutes}m ${seconds}s`;
}

function comas(x) {
  return Number(x || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function endQuini(conn, chatId) {
  const st = juegoDe(chatId);
  if (!st.active) return;
  limpiarTimer(chatId);
  const lang = global?.db?.data?.chats?.[chatId]?.language || global.defaultLenguaje || 'es';
  const t = textos(lang);
  st.winningNumbers = barajar(Array.from({ length: 46 }, (_, i) => i)).slice(0, 6).sort((a, b) => a - b);
  const numerosTxt = st.winningNumbers.map(fmt2).join(' ');
  let results = t?.resultados_titulo || '🎉 *¡RESULTADOS DEL QUINI6!* 🎉\n\n';
  if (t?.numeros_ganadores) results += t.numeros_ganadores.replace('{numeros}', numerosTxt);
  else results += `🎯 *Números ganadores:* ${numerosTxt}\n\n`;
  results += (t?.premios_obtenidos || '🏆 *Premios obtenidos:*\n\n');
  let anyWinner = false;
  const ganadores = [];
  for (const p of st.participants) {
    const aciertos = p.numbers.filter((num) => st.winningNumbers.includes(num)).length;
    if (aciertos > 0) {
      anyWinner = true;
      ganadores.push(p.jid);
      const premio = aciertos * 5000;
      const exp = aciertos * 3000;
      try { addMoney(p.jid, premio); } catch {}
      try { addExp(p.jid, exp); } catch {}
      results += (t?.linea_usuario?.replace('{username}', p.num) || `👤 @${p.num}\n`);
      results += (t?.linea_aciertos?.replace('{aciertos}', aciertos) || `🎯 Aciertos: ${aciertos}\n`);
      results += (t?.linea_gano?.replace('{premio}', comas(premio)) || `💎 Ganó: ${comas(premio)} diamantes\n`);
      results += (t?.linea_exp?.replace('{exp}', comas(exp)) || `📈 EXP: ${comas(exp)}\n\n`);
    }
  }
  if (!anyWinner) results += (t?.sin_ganadores || 'Ningún participante acertó ningún número esta vez. ¡Mejor suerte la próxima!\n\n');
  results += (t?.despedida || '🎊 ¡Gracias por participar! ¡Buena suerte para el próximo sorteo! 🍀');
  try {
    conn.sendMessage(chatId, { text: results, mentions: ganadores });
  } catch {}
  guardarJuego(chatId, estadoVacio());
}

migrarLegado();

const handler = async (m, { conn, command, usedPrefix, args }) => {
  const idioma = global.db.data.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
  const t = textos(idioma);
  const num = numeroDe(m.sender, conn);
  const jid = num ? num + '@s.whatsapp.net' : m.sender;
  const username = m.pushName || (t.usuario_default || 'Usuario');

  let st = juegoDe(m.chat);
  if (st.active && st.endTime && st.endTime <= Date.now()) {
    endQuini(conn, m.chat);
    st = juegoDe(m.chat);
  }
  programarCierre(conn, m.chat);

  switch (command) {
  case 'quini6':
    if (st.active) {
      if (args.length === 0) {
        const tiempoRestante = tiempoRestante(st, t);
        return m.reply((t.en_curso_titulo || '🎰 *Quini6 en curso!* \n\n') +
            (t.tiempo_restante?.replace('{tiempo}', tiempoRestante) || `⏰ Tiempo restante: ${tiempoRestante}\n`) +
            (t.participantes_label?.replace('{participantes}', st.participants.length) || `👥 Participantes: ${st.participants.length}\n`) +
            (t.para_participar || 'Para participar, envía:\n') +
            (t.ejemplo_cmd?.replace('{usedPrefix}', usedPrefix) || `*${usedPrefix}quini6 12 34 05 22 44 07*`));
      }
      if (st.participants.some((p) => p.num === num)) {
        return m.reply(t.ya_participas || '⚠️ Ya has participado en este Quini6!');
      }
      if (args.length !== 6) {
        return m.reply(t.seis_numeros || '❌ Debes elegir exactamente 6 números (ejemplo: /quini6 12 34 05 22 44 07)');
      }
      const numbers = args.map((a) => parseInt(a, 10));
      if (numbers.some((n) => isNaN(n) || n < 0 || n > 45)) {
        return m.reply(t.numeros_rango || '❌ Los números deben estar entre 00 y 45');
      }
      if (new Set(numbers).size !== 6) {
        return m.reply(t.numeros_distintos || '❌ Los 6 números deben ser distintos');
      }
      const userStats = getUserStats(jid);
      if (userStats.money < PRECIO) {
        return m.reply((t.sin_diamantes?.replace('{precio}', PRECIO).replace('{tienes}', userStats.money)) || `❌ No tienes suficientes diamantes! Necesitas ${PRECIO} 💎 pero solo tienes ${userStats.money} 💎`);
      }
      removeMoney(jid, PRECIO);
      st.participants.push({ num, jid, username, numbers, joinTime: Date.now() });
      guardarJuego(m.chat, st);
      return m.reply((t.numeros_registrados?.replace('{numeros}', numbers.map(fmt2).join(' '))) || `✅ ¡Números registrados!\nTus números: ${numbers.map(fmt2).join(' ')}\n¡Buena suerte! 🍀`);
    }
    st = { active: true, participants: [], startTime: Date.now(), endTime: Date.now() + DURACION, winningNumbers: [] };
    guardarJuego(m.chat, st);
    programarCierre(conn, m.chat);
    return m.reply((t.nuevo_sorteo_titulo || '🎰 *¡NUEVO SORTEO QUINI6 INICIADO!* 🎰\n\n') +
        (t.precio_entrada || '💎 *Precio de entrada:* 200 diamantes\n') +
        (t.duracion || '⏰ *Duración:* 30 minutos\n') +
        (t.elige_numeros?.replace('{usedPrefix}', usedPrefix) || `🎯 *Elige 6 números entre 00 y 45 (ejemplo: /quini6 12 34 05 22 44 07)*\n\n`) +
        (t.buena_suerte_todos || '¡Buena suerte a todos! 🍀'));

  case 'qinfo':
    if (!st.active) {
      return m.reply(t.sin_quini || '❌ No hay ningún Quini6 activo.');
    }
    let plist = st.participants
      .map((p) => (t.lista_item?.replace('{username}', p.num).replace('{numeros}', p.numbers.map(fmt2).join(' ')) || `🎫 @${p.num} - ${p.numbers.map(fmt2).join(' ')}`))
      .join('\n');
    if (plist.length > 1000) {
      plist = (t.participantes_registrados?.replace('{participantes}', st.participants.length) || `${st.participants.length} participantes registrados`);
    }
    return m.reply((t.info_titulo || '🎰 *INFORMACIÓN DEL QUINI6* 🎰\n\n') +
        (t.info_participantes?.replace('{participantes}', st.participants.length) || `👥 *Participantes:* ${st.participants.length}\n`) +
        (t.info_tiempo?.replace('{tiempo}', tiempoRestante(st, t)) || `⏰ *Tiempo restante:* ${tiempoRestante(st, t)}\n\n`) +
        (t.info_lista?.replace('{lista}', plist) || `*Participantes:*\n${plist}\n\n`) +
        (t.info_para_participar?.replace('{usedPrefix}', usedPrefix) || `• *${usedPrefix}quini6 12 34 05 22 44 07* para participar`));
  }
};

handler.help = ['quini6', 'qinfo'];
handler.tags = ['game'];
handler.command = /^(quini6|qinfo)$/i;

export default handler;
