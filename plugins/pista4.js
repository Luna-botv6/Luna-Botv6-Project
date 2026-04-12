const handler = async (m, { conn }) => {
  conn.tebaklagu = conn.tebaklagu || {};
  const id = m.chat;
  if (!(id in conn.tebaklagu)) return m.reply('❗ No hay ninguna canción activa. Usa /cancion para comenzar.');

  const juego = conn.tebaklagu[id][1];
  const respuesta = juego.jawaban.trim();

  const pista = respuesta.replace(/[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ]/g, (letra, i) => i % 2 === 0 ? letra : '_');
  return m.reply(`🕵️ *Pista:* ${pista}`);
};

handler.command = /^pista4$/i;
export default handler;