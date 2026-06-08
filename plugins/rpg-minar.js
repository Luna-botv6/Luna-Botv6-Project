import fs from 'fs';
import { getLastMiningTime, setLastMiningTime, initMiningUser } from '../lib/minar.js';
import { addExp } from '../lib/stats.js';

const handler = async (m, { conn }) => {
  const userId = m.sender;
  await initMiningUser(userId);

  const idioma = global.db?.data?.users?.[userId]?.language || global.defaultLenguaje || 'es';
  let _t = {};
  try {
    const _lang = idioma || global.defaultLenguaje || 'es';
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${_lang}.json`, 'utf8'));
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch {}
  }
  const tradutor = _t.plugins.rpg_minar;

  const cooldown = 600000;
  const lastTime = await getLastMiningTime(userId);
  const now = Date.now();

  if (now - lastTime < cooldown) {
    const remaining = cooldown - (now - lastTime);
    throw `${tradutor.texto1[0]} ${msToTime(remaining)} ${tradutor.texto1[1]}`;
  }

  const expGained = Math.floor(Math.random() * 1901) + 100;
  await setLastMiningTime(userId, now);
  addExp(userId, expGained);

  const message = `
${tradutor.texto2[0]}
${tradutor.texto2[1]}
${tradutor.texto2[2]} *${expGained}*
${tradutor.texto2[3]}
${tradutor.texto2[4]}`.trim();

  m.reply(message);
};

handler.help = ['minar'];
handler.tags = ['xp'];
handler.command = ['minar', 'mine', 'miming'];
handler.fail = null;
handler.exp = 0;

export default handler;

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  return `${minutes}m ${seconds}s`;
}
