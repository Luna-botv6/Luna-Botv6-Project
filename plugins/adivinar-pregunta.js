let juegosPregunta = global.juegosPregunta = global.juegosPregunta || {};

const preguntas = {
  facil: [
    { pregunta: '¿Cuál es la capital de Argentina?', respuesta: 'buenos aires', pista: 'b_ _ _ _ _ a _ _ _' },
    { pregunta: '¿De qué color es el cielo?', respuesta: 'azul', pista: 'a_ _ _' },
    { pregunta: '¿Cuánto es 2 + 2?', respuesta: '4', pista: 'Número entre 3 y 5' },
    { pregunta: '¿Qué fruto seco lleva en su interior un Ferrero Rocher?', respuesta: 'avellana', pista: 'a_ _ _ _ _ a' },
    { pregunta: '¿Cómo se llaman las crías de los conejos?', respuesta: 'gazapos', pista: 'g_ _ _ _ _ _' },
    { pregunta: '¿De qué colores es la bandera de Japón?', respuesta: 'blanca y roja', pista: 'b_ _ _ _ _ _ _ _ _ _' },
    { pregunta: '¿Qué país ha ganado más Copas del Mundo?', respuesta: 'brasil', pista: 'b_ _ _ _ _' },
    { pregunta: '¿Qué enfermedad se propagaba habitualmente en los barcos piratas?', respuesta: 'escorbuto', pista: 'e_ _ _ _ _ _ _ _' },
    { pregunta: '¿Qué país bebe más café por cabeza?', respuesta: 'finlandia', pista: 'f_ _ _ _ _ _ _ _' },
    { pregunta: '¿Qué saga de videojuegos tiene como protagonista a Kratos?', respuesta: 'god of war', pista: 'g_ _   _ _   _ _ _' },
    { pregunta: '¿Cuál es el planeta más caliente del sistema solar?', respuesta: 'venus', pista: 'v_ _ _ _' },
    { pregunta: '¿Cuántos fantasmas persiguen a Pac-Man al principio de cada partida?', respuesta: '4', pista: '4' },
    { pregunta: '¿Qué ciudad es conocida como \'La Ciudad Eterna\'?', respuesta: 'roma', pista: 'r_ _ _' }
  ],
  medio: [
    { pregunta: '¿Quién dirigió la película \'Titanic\'?', respuesta: 'james cameron', pista: 'j_ _ _ _ c_ _ _ _ _ _' },
    { pregunta: '¿En qué continente está Egipto?', respuesta: 'africa', pista: 'a_ _ _ _ _' },
    { pregunta: '¿Qué gas respiramos para vivir?', respuesta: 'oxigeno', pista: 'o_ _ _ _ _ _' },
    { pregunta: '¿En qué año murió David Delfín?', respuesta: '2017', pista: '2 _ _ 7' },
    { pregunta: '¿Cuál era el apellido de la reina Isabel II?', respuesta: 'windsor', pista: 'w_ _ _ _ _ _' },
    { pregunta: '¿Qué artista tiene más canciones en Spotify?', respuesta: 'drake', pista: 'd_ _ _ _' },
    { pregunta: '¿Cuál es el apellido más común en EE.UU.?', respuesta: 'smith', pista: 's_ _ _ _' },
    { pregunta: '¿Qué país europeo perdió más población entre 2015 y 2020?', respuesta: 'lituania', pista: 'l_ _ _ _ _ _ _' },
    { pregunta: '¿Cuántos huesos tenemos en la oreja?', respuesta: '3', pista: '3' },
    { pregunta: '¿Qué país tiene la mayor esperanza de vida?', respuesta: 'hong kong', pista: 'h_ _ _   _ _ _ _' },
    { pregunta: '¿En qué ciudad se celebró la primera Semana de la Moda?', respuesta: 'nueva york', pista: 'n_ _ _ _   _ _ _ _' },
    { pregunta: '¿Qué lengua tiene más hablantes nativos: inglés o español?', respuesta: 'español', pista: 'e_ _ _ _ _ _' },
    { pregunta: '¿Cuál es la cuarta letra del alfabeto griego?', respuesta: 'delta', pista: 'd_ _ _ _' }
  ],
  dificil: [
    { pregunta: '¿En qué año cayó el Muro de Berlín?', respuesta: '1989', pista: 'Mil novecientos ochenta y...' },
    { pregunta: '¿Quién escribió \'Cien años de soledad\'?', respuesta: 'gabriel garcía márquez', pista: 'g_ _ _ _ _ g_ _ _ _ _ m_ _ _ _ _ _' },
    { pregunta: '¿Cuál es el número atómico del oxígeno?', respuesta: '8', pista: 'Entre 7 y 9' },
    { pregunta: '¿En qué año se fundó Heinz?', respuesta: '1869', pista: '1 _ _ 9' },
    { pregunta: '¿Qué cuatro ingredientes lleva un Cosmopolitan?', respuesta: 'zumo de lima, vodka, zumo de arándanos, cointreau', pista: 'z_ _ _   _ _   l_ _ _, v_ _ _ _, z_ _ _   _ _   a_ _ _ _ _ _ _ _, c_ _ _ _ _ _ _' },
    { pregunta: '¿Cuántos elementos contiene la tabla periódica?', respuesta: '118', pista: '1 _ _' },
    { pregunta: '¿Qué empresa se llamaba originalmente \'Cadabra\'?', respuesta: 'amazon', pista: 'a_ _ _ _ _' },
    { pregunta: '¿En qué campo científico es experto Brian May?', respuesta: 'astrofísica', pista: 'a_ _ _ _ _ _ _ _ _' },
    { pregunta: '¿Quién ha ganado más premios Óscar en total?', respuesta: 'walt disney', pista: 'w_ _ _   _ _ _ _ _ _' },
    { pregunta: '¿En qué museo se exhiben los mármoles del Partenón?', respuesta: 'museo británico', pista: 'm_ _ _ _   _ _ _ _ _ _ _ _' },
    { pregunta: '¿Cómo se conoce a un grupo de pandas?', respuesta: 'una vergüenza', pista: 'u_ _   _ _ _ _ _ _ _ _ _' },
    { pregunta: '¿Quién cruzó los Alpes con elefantes para luchar contra los romanos?', respuesta: 'aníbal', pista: 'a_ _ _ _ _' },
    { pregunta: '¿Qué fabricante tuvo mayores ingresos en 2020?', respuesta: 'volkswagen', pista: 'v_ _ _ _ _ _ _ _ _' }
  ]
};

const tiempos = { facil: 30, medio: 45, dificil: 60 };
const premios = { facil: 500, medio: 1000, dificil: 2500 };

const handler = async (m, { command, args, usedPrefix }) => {
  const id = m.chat;

  if (command === 'adivinar') {
    if (juegosPregunta[id]) return m.reply('❗ Ya hay una pregunta activa. Usa /respuesta <texto> para responder.');

    const dificultad = (args[0] || '').toLowerCase();
    if (!['facil', 'medio', 'dificil'].includes(dificultad)) {
      return m.reply(`✨ ¿Qué dificultad prefieres?\n\n🟢 *${usedPrefix}adivinar facil*\n🟡 *${usedPrefix}adivinar medio*\n🔴 *${usedPrefix}adivinar dificil*\n\n✍️ Responde con: *${usedPrefix}respuesta <tu respuesta>*`);
    }

    const lista = preguntas[dificultad];
    const seleccion = lista[Math.floor(Math.random() * lista.length)];
    const tiempo = tiempos[dificultad];

    juegosPregunta[id] = {
      respuesta: seleccion.respuesta.toLowerCase(),
      pista: seleccion.pista,
      dificultad,
      user: m.sender,
      inicio: Date.now(),
      limite: tiempo * 1000,
      mensaje10s: false
    };

    m.reply(`❓ *Pregunta (${dificultad.toUpperCase()})*\n\n${seleccion.pregunta}\n\n⏳ Tienes *${tiempo} segundos*.\n✍️ Usa *${usedPrefix}respuesta <tu respuesta>*\n🧠 Puedes pedir una pista con *${usedPrefix}pista2*`);

    // Notificación de 10 segundos restantes
    setTimeout(() => {
      if (juegosPregunta[id]) m.reply('⚠️ ¡Te quedan *10 segundos*!');
    }, (tiempo - 10) * 1000);

    // Fin de tiempo
    setTimeout(() => {
      if (juegosPregunta[id]) {
        m.reply(`⏱️ Tiempo agotado. La respuesta correcta era: *${juegosPregunta[id].respuesta}*.`);
        delete juegosPregunta[id];
      }
    }, tiempo * 1000);
  }

  if (command === 'respuesta') {
    const juego = juegosPregunta[id];
    if (!juego) return m.reply('❌ No hay ninguna pregunta activa. Usa /adivinar para empezar.');

    const texto = args.join(' ').toLowerCase().trim();
    if (!texto) return m.reply('✍️ Escribe tu respuesta después de /respuesta');

    const ahora = Date.now();
    if (ahora - juego.inicio > juego.limite) {
      delete juegosPregunta[id];
      return m.reply(`⌛ Se acabó el tiempo. La respuesta era *${juego.respuesta}*.`);
    }

    if (texto === juego.respuesta) {
      global.db.data.users[m.sender].exp += premios[juego.dificultad];
      delete juegosPregunta[id];
      return m.reply(`✅ ¡Correcto! Has ganado *${premios[juego.dificultad]} XP*`);
    } else {
      return m.reply('❌ Respuesta incorrecta. Intenta otra vez antes de que se acabe el tiempo.');
    }
  }

  if (command === 'pista2') {
    const juego = juegosPregunta[id];
    if (!juego) return m.reply('❌ No hay ningún juego activo.');
    return m.reply(`🧩 *Pista:* ${juego.pista}`);
  }
};

handler.command = /^adivinar|respuesta|pista2$/i;
export default handler;
