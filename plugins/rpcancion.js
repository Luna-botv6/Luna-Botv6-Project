const handler = async (m, { conn, text }) => {
  conn.tebaklagu = conn.tebaklagu || {};
  const id = m.chat;

  if (!(id in conn.tebaklagu)) return m.reply('🎵 No hay una canción activa. Usa /cancion para empezar.');
  if (!text) return m.reply('✏️ Escribe tu respuesta: * /rpcancion tu_respuesta*');

  const juego = conn.tebaklagu[id][1];
  const correcta = juego.jawaban.toLowerCase();
  const respuesta = text.trim().toLowerCase();

  if (respuesta === correcta) {
    m.reply(`✅ ¡Correcto! Era: *${juego.jawaban}*
Ganaste ${conn.tebaklagu[id][2]} XP.`);
    clearTimeout(conn.tebaklagu[id][3]);
    delete conn.tebaklagu[id];
  } else {
    m.reply('❌ Respuesta incorrecta. Intenta otra vez.');
  }
};

handler.command = /^rpcancion$/i;
export default handler;