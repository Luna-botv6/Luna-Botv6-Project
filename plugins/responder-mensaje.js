const handler = async (m, { conn }) => {
  conn.tebaklagu = conn.tebaklagu || {};
  const id = m.chat;

  if (!(id in conn.tebaklagu)) return;

  const juego = conn.tebaklagu[id][1];
  const correcta = juego.jawaban.toLowerCase();
  const texto = m.text?.trim().toLowerCase();

  const esRespuesta = m.quoted?.id === conn.tebaklagu[id][0]?.id;
  if (!texto || !esRespuesta) return;

  if (texto === correcta) {
    m.reply(`🎉 ¡Correcto! Era: *${juego.jawaban}*
Ganaste ${conn.tebaklagu[id][2]} XP.`);
    clearTimeout(conn.tebaklagu[id][3]);
    delete conn.tebaklagu[id];
  } else {
    m.reply('❌ Respuesta incorrecta. Intenta otra vez.');
  }
};

export default handler;