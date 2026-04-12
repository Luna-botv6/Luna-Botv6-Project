global.veoveo = global.veoveo ? global.veoveo : {}; // Inicializar el objeto global para guardar el juego en curso.

const handler = async (m, { conn }) => {
  const objeto = 'manzana'; // El objeto a adivinar.
  const pista = 'es rojo y está en un árbol'; // Pista que el bot le dará al jugador.

  // Comando /veoveo: El bot inicia el juego y da la pista.
  if (m.text.toLowerCase() === '/veoveo') {
    conn.reply(m.chat, `Veo, veo, ${pista}`, m); // El bot da la pista
    global.veoveo[m.chat] = { objeto: objeto }; // Guardamos el objeto a adivinar en el chat
    return;
  }

  // Si hay un juego en curso, comprobar la respuesta del jugador.
  if (global.veoveo[m.chat]) {
    const respuesta = m.text.toLowerCase();

    if (respuesta === global.veoveo[m.chat].objeto) {
      conn.reply(m.chat, `¡Correcto! El objeto era: ${global.veoveo[m.chat].objeto}. ¡Bien hecho!`, m);
      delete global.veoveo[m.chat]; // El juego termina y se elimina el objeto de ese chat.
    } else {
      conn.reply(m.chat, `¡Incorrecto! Intenta de nuevo.`, m); // Si la respuesta es incorrecta
    }
  }
};

handler.command = /^(\veoveo)$/i;  // Solo responde al comando "/veoveo"
export default handler;
