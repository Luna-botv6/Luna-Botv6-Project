import { addExp, addMoney } from '../lib/stats.js';

const cooldown = 5 * 60 * 1000; // 5 minutos
const tiempos = {};

const handler = async (m, { conn, usedPrefix, args }) => {
  const id = m.sender;

  // Si no envía argumento, mostrar botones y controlar cooldown
  if (args.length === 0) {
    if (tiempos[id] && (Date.now() - tiempos[id]) < cooldown) {
      const tiempoRestante = Math.ceil((cooldown - (Date.now() - tiempos[id])) / 1000);
      return m.reply(`⏳ Espera *${tiempoRestante} segundos* antes de volver a jugar.`);
    }

    const emojis = ['🐢', '🐇'];
    const carrera = emojis.sort(() => Math.random() - 0.5).join('');

    await conn.sendButton(
      m.chat,
      `🏁 ¡Carrera iniciada! Mira los competidores:\n${carrera}\n\n¿Quién ganará? Toca un botón para apostar.`,
      'LunaBot V6',
      null,
      [
        ['🐢 Tortuga', `${usedPrefix}carrera 🐢`],
        ['🐇 Liebre', `${usedPrefix}carrera 🐇`]
      ],
      null,
      null,
      m
    );

    tiempos[id] = Date.now();
    return;
  }

  // Si envía argumento (elección), resolvemos la apuesta
  const eleccion = args[0];
  if (!['🐢', '🐇'].includes(eleccion)) {
    return m.reply('❌ Debes apostar por 🐢 o 🐇. Ejemplo: /carrera 🐢');
  }

  const ganador = ['🐢', '🐇'][Math.floor(Math.random() * 2)];

  if (eleccion === ganador) {
    addExp(id, 150);
    addMoney(id, 100);
    return m.reply(`🎉 ¡Ganaste!\nEl ganador fue: *${ganador}*\n+150 EXP\n+100 Diamantes`);
  } else {
    return m.reply(`😢 Perdiste...\nEl ganador fue: *${ganador}*\n¡Suerte la próxima!`);
  }
};

handler.command = /^carrera$/i;
export default handler;