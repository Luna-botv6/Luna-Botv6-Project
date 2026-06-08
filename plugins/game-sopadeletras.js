import path from 'path';
import { addExp, addMoney } from '../lib/stats.js';

// Lista de imágenes con sus palabras correspondientes
const juegos = [
  {
    ruta: path.resolve('./src/sopa/SOPA2.jpg'),
    palabras: [
      { palabra: 'lunes', fila: 4, columna: 8 },
      { palabra: 'martes', fila: 3, columna: 5 },
      { palabra: 'miercoles', fila: 4, columna: 4 },
      { palabra: 'jueves', fila: 5, columna: 5 },
      { palabra: 'viernes', fila: 10, columna: 10 },
      { palabra: 'sabado', fila: 9, columna: 9 },
      { palabra: 'domingo', fila: 9, columna: 7 },
    ]
  },
  {
    ruta: path.resolve('./src/sopa/SOPA4.jpg'),
    palabras: [
      { palabra: 'gato', fila: 2, columna: 4 },
      { palabra: 'arboles', fila: 7, columna: 8 },
      { palabra: 'pato', fila: 3, columna: 8 },
      { palabra: 'casa', fila: 4, columna: 10 },
      { palabra: 'leon', fila: 9, columna: 4 },
    ]
  },
  {
    ruta: path.resolve('./src/sopa/SOPA5.jpg'),
    palabras: [
      { palabra: 'raton', fila: 1, columna: 6 },
      { palabra: 'lechuza', fila: 10, columna: 7 },
      { palabra: 'elefante', fila: 8, columna: 10 },
      { palabra: 'jirafa', fila: 4, columna: 1 },
      { palabra: 'alcon', fila: 7, columna: 3 },
    ]
  },
  {
    ruta: path.resolve('./src/sopa/SOPA6.jpg'),
    palabras: [
      { palabra: 'azul', fila: 3, columna: 5 },
      { palabra: 'rojo', fila: 8, columna: 4 },
      { palabra: 'amarillo', fila: 4, columna: 9 },
      { palabra: 'negro', fila: 5, columna: 5 },
      { palabra: 'verde', fila: 4, columna: 6 },
    ]
  },
  {
    ruta: path.resolve('./src/sopa/SOPA7.jpg'),
    palabras: [
      { palabra: 'manzana', fila: 4, columna: 8 },
      { palabra: 'banana', fila: 8, columna: 10 },
      { palabra: 'pera', fila: 10, columna: 4 },
      { palabra: 'naranja', fila: 3, columna: 3 },
      { palabra: 'uva', fila: 3, columna: 4 },
    ]
  }
];

async function handler(m, { conn, args, usedPrefix, command }) {
  conn.sopadeletras = conn.sopadeletras || {};
  const id = m.chat;

  if (!args.length) {
    const juegoSeleccionado = juegos[Math.floor(Math.random() * juegos.length)];
    const partida = juegoSeleccionado.palabras[Math.floor(Math.random() * juegoSeleccionado.palabras.length)];

    const timeout = setTimeout(() => {
      if (conn.sopadeletras[id]) {
        conn.reply(id, `⏰ *Se acabó el tiempo.* La palabra era *${conn.sopadeletras[id].palabra}*.\n¡Intenta nuevamente con *${usedPrefix + command}*!`, m);
        delete conn.sopadeletras[id];
      }
    }, 90000);

    conn.sopadeletras[id] = {
      rutaImagen: juegoSeleccionado.ruta,
      palabra: partida.palabra,
      fila: partida.fila,
      columna: partida.columna,
      timeout
    };

    // Mensaje a los 30 segundos (quedan 15)
    setTimeout(() => {
      if (conn.sopadeletras[id]) {
        conn.reply(id, '⏳ *¡Te quedan 15 segundos!* ¡Tu Puedes! 🫂', m);
      }
    }, 75000);

    await conn.sendMessage(id, {
      image: { url: juegoSeleccionado.ruta },
      caption: `🧩 *Sopa de Letras: Encuentra la Palabra*\n\n🔤 Palabra a buscar: *${partida.palabra}*\n📌 Responde con: *${usedPrefix + command} fila columna*\n📝 Ejemplo: *${usedPrefix + command} 3 10*\n\n📖 *¿Cómo se juega?*\n1️⃣ Busca la palabra en la imagen.\n2️⃣ Cuando encuentres la primera letra (ej: la "N" de "naranja"), anota la fila donde empieza.\n3️⃣ Luego sigue la palabra horizontalmente y encuentra la letra donde termina (ej: la "A").\n4️⃣ Cuenta la columna donde termina.\n✅ Usa esos números para responder: fila donde comienza, columna donde termina.\n\n⏱️ *Tienes 45 segundos para responder.*\n🎯 ¡Mucha suerte!`
    });
    return;
  }

  if (args.length === 2) {
    const fila = parseInt(args[0]);
    const columna = parseInt(args[1]);

    if (isNaN(fila) || isNaN(columna)) {
      return m.reply(`❌ Las coordenadas deben ser números válidos.\nUso correcto:\n${usedPrefix + command} fila columna`);
    }

    const partida = conn.sopadeletras[id];
    if (!partida) return m.reply(`⚠️ No tienes una partida activa. Usa:\n${usedPrefix + command}`);

    clearTimeout(partida.timeout); // Detener el conteo si responde

    if (fila === partida.fila && columna === partida.columna) {
      const expGanada = 2500;
      const diamantesGanados = 250;

      await addExp(m.sender, expGanada);
      await addMoney(m.sender, diamantesGanados);

      delete conn.sopadeletras[id];

      return m.reply(
        `🎉 ¡Correcto! La palabra *${partida.palabra}* estaba en fila ${fila}, columna ${columna}.\n` +
        `Has ganado +${expGanada} EXP y +${diamantesGanados} diamantes 💎.`
      );
    } else {
      return m.reply('❌ Incorrecto. La palabra no está en esa posición. Intenta de nuevo.');
    }
  }

  return m.reply(`❗ Uso correcto:\n- Iniciar juego: *${usedPrefix + command}*\n- Responder: *${usedPrefix + command} fila columna*`);
}

handler.command = /^sopadeletras$/i;
export default handler;
