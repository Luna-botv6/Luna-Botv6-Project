import * as slot from '../lib/slot.js'
import * as stats from '../lib/stats.js' // Importar stats.js
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

  // CAMBIO: Usar stats.js en lugar de slot.js para manejar EXP
  const expActual = stats.getExp(m.sender);
  if (expActual < apuesta) throw tradutor.texto5;

  // Emojis para el slot
  const emojis = ['🍎', '🍌', '🍇', '🍊', '🍓', '💎'];
  
  // Generar posiciones aleatorias para cada columna
  let a = Math.floor(Math.random() * emojis.length);
  let b = Math.floor(Math.random() * emojis.length);
  let c = Math.floor(Math.random() * emojis.length);

  // Crear las tres filas del slot
  const x = [], y = [], z = [];
  for (let i = 0; i < 3; i++) {
    x[i] = emojis[a];
    y[i] = emojis[b];
    z[i] = emojis[c];
    a = (a + 1) % emojis.length;
    b = (b + 1) % emojis.length;
    c = (c + 1) % emojis.length;
  }

  // Verificar el resultado basado en la fila del medio (índice 1)
  let resultado;
  const centerA = x[1];
  const centerB = y[1];
  const centerC = z[1];

  if (centerA === centerB && centerB === centerC) {
    // Tres iguales - Gran premio
    const premio = apuesta * 2;
    stats.addExp(m.sender, premio); // CAMBIO: usar stats.addExp
    resultado = `🎉 ${tradutor.texto6} +${premio} XP`;
  } else if (centerA === centerB || centerA === centerC || centerB === centerC) {
    // Dos iguales - Premio menor
    const premio = Math.floor(apuesta * 0.5);
    stats.addExp(m.sender, premio); // CAMBIO: usar stats.addExp
    resultado = `🎊 ${tradutor.texto7} +${premio} XP`;
  } else {
    // Sin coincidencias - Pierde
    stats.removeExp(m.sender, apuesta); // CAMBIO: usar stats.removeExp
    resultado = `😞 ${tradutor.texto8} -${apuesta} XP`;
  }

  await slot.setCooldown(m.sender);

  // Mostrar el resultado con mejor formato
  const slotDisplay = `
┌─────────────┐
│ ${x[0]} │ ${y[0]} │ ${z[0]} │
│ ${x[1]} │ ${y[1]} │ ${z[1]} │ ←
│ ${x[2]} │ ${y[2]} │ ${z[2]} │
└─────────────┘`;

  await m.reply(
    `🎰 *SLOT MACHINE* 🎰\n${slotDisplay}\n\n${resultado}`
  );
};

handler.help = ['slot <apuesta>'];
handler.tags = ['game'];
handler.command = ['slot'];

export default handler;

async function tiempoRestante(user) {
  try {
    const db = JSON.parse(await fs.promises.readFile('./database/slot.json', 'utf8'));
    const last = db[user]?.lastPlay || 0;
    const ms = 10000 - (Date.now() - last);
    return msToTime(ms > 0 ? ms : 0);
  } catch (error) {
    // Si no existe el archivo o hay error, retornar 0
    return msToTime(0);
  }
}

function msToTime(duration) {
  if (duration <= 0) return "0 s";
  
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}
