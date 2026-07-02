import fs from 'fs';
import { getUserStats, addExp, addMoney, setUserStats, getPlayerState, isCapturedByHunter } from '../lib/stats.js';
import { checkHunterTrigger, checkHunterCapture } from '../lib/hunterSystem.js';
import { checkMerchantTrigger, checkGambler, checkUndeadTrigger, checkVagrantTrigger } from '../lib/npcSystem.js';

const handler = async (m, { conn }) => {
  if (handler.enviando) return;
  handler.enviando = true;

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let _t = {};
  try {
    const _lang = idioma || global.defaultLenguaje || 'es';
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${_lang}.json`, 'utf8'));
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch {}
  }
  const tradutor = _t.plugins.rpg_work;

  const userId = m.sender;

  const _capture = checkHunterCapture(userId)
  if (_capture) return m.reply(_capture.message)

  const _u = getPlayerState(userId)
  if (_u.isCaptured) {
    handler.enviando = false
    const _reason = isCapturedByHunter(userId)
      ? '⛓️ Estás capturado por el Cazador. Solo un rescate puede liberarte.\n📣 Usa: *rescate pedir*'
      : '⛓️ Estás capturado. Paga tu multa o pide rescate.\n📣 Usa: *rescate pedir*'
    return m.reply(_reason)
  }

  const now = Date.now();
  const cooldown = 10 * 60 * 1000;

  const userStats = getUserStats(userId);

  if (userStats.lastwork && now - userStats.lastwork < cooldown) {
    const timeLeft = msToTime(cooldown - (now - userStats.lastwork), tradutor);
    handler.enviando = false;
    return conn.sendMessage(m.chat, { text: `⏳ *${tradutor.texto1}*\n\n🏃‍♂️ ${tradutor.texto2}: *${timeLeft}*` }, { quoted: m });
  }

  const expGanada = Math.floor(Math.random() * 5000) + 500;
  const moneyGanado = Math.floor(Math.random() * 1000) + 100;

  addExp(userId, expGanada);
  addMoney(userId, moneyGanado);

  setUserStats(userId, { lastwork: now });

  const statsActualizados = getUserStats(userId);

  const mensajesTrabajo = tradutor.mensajes;

  const msg = `
⚔️ *${tradutor.texto3}*

🌟 ${tradutor.texto4} *${expGanada}* ${tradutor.texto5}.
💰 ${tradutor.texto4} *${moneyGanado}* ${tradutor.texto6}.

🎖️ ${tradutor.texto7}: *${statsActualizados.level}*
🏅 Rol: *${statsActualizados.role}*

${pickRandom(mensajesTrabajo)}
`.trim();

  const _hunt     = checkHunterTrigger(userId, expGanada, moneyGanado)
  const _merchant = checkMerchantTrigger(userId)
  const _gambler  = checkGambler(userId)
  const _undead   = checkUndeadTrigger(userId)

  await conn.sendMessage(m.chat, { text: msg }, { quoted: m });

  const _npcMsgs = [
    _hunt?.message, _merchant?.message, _gambler?.message, _undead?.message, checkVagrantTrigger(userId)?.message
  ].filter(Boolean)

  if (_npcMsgs.length > 0) {
    setTimeout(() => {
      for (const npcMsg of _npcMsgs) {
        conn.sendMessage(m.chat, { text: npcMsg.trim() }, { quoted: m })
      }
    }, 3000)
  }

  handler.enviando = false;
};

handler.help = ['work'];
handler.tags = ['xp'];
handler.command = /^(work|trabajar|chambear)$/i;

export default handler;

function msToTime(duration, tradutor) {
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  minutes = (minutes < 10) ? '0' + minutes : minutes;
  seconds = (seconds < 10) ? '0' + seconds : seconds;
  return `${minutes} ${tradutor.tiempo[0]} ${seconds} ${tradutor.tiempo[1]}`;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

