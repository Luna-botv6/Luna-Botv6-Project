import * as slot from '../lib/slot.js'
import fs from 'fs'

const handler = async (m, { args, usedPrefix, command }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.game_slot;

  const mensajeUso = `
${tradutor.texto1}

${tradutor.texto2}
*${usedPrefix + command} 100*`.trim();

  if (!args[0] || isNaN(args[0])) throw mensajeUso;

  const apuesta = parseInt(args[0]);
  if (apuesta < 100) throw tradutor.texto4;

  const puedeJugar = await slot.canPlay(m.sender);
  if (!puedeJugar) {
    const timeRestante = await tiempoRestante(m.sender);
    throw `${tradutor.texto3[0]} ${timeRestante} ${tradutor.texto3[1]}`;
  }

  const expActual = await slot.getExp(m.sender);
  if (expActual < apuesta) throw tradutor.texto5;

  const emojis = ['', '', ''];
  let a = Math.floor(Math.random() * emojis.length);
  let b = Math.floor(Math.random() * emojis.length);
  let c = Math.floor(Math.random() * emojis.length);

  const x = [], y = [], z = [];
  for (let i = 0; i < 3; i++) {
    x[i] = emojis[a]; a = (a + 1) % emojis.length;
    y[i] = emojis[b]; b = (b + 1) % emojis.length;
    z[i] = emojis[c]; c = (c + 1) % emojis.length;
  }

  let resultado;
  if (a === b && b === c) {
    await slot.addExp(m.sender, apuesta);
    resultado = `${tradutor.texto6} +${apuesta} XP`;
  } else if (a === b || a === c || b === c) {
    await slot.addExp(m.sender, 10);
    resultado = tradutor.texto7;
  } else {
    await slot.removeExp(m.sender, apuesta);
    resultado = `${tradutor.texto8} -${apuesta} XP`;
  }

  await slot.setCooldown(m.sender);

  await m.reply(
    ` | *SLOTS*\n\n${x[0]} : ${y[0]} : ${z[0]}\n${x[1]} : ${y[1]} : ${z[1]}\n${x[2]} : ${y[2]} : ${z[2]}\n\n | ${resultado}`
  );
};

handler.help = ['slot <apuesta>'];
handler.tags = ['game'];
handler.command = ['slot'];

export default handler;

async function tiempoRestante(user) {
  const db = JSON.parse(await fs.promises.readFile('./database/slot.json', 'utf8'));
  const last = db[user]?.lastPlay || 0;
  const ms = 10000 - (Date.now() - last);
  return msToTime(ms);
}

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  return `${minutes} m ${seconds} s`;
}