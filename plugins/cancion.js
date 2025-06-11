const timeout = 60000;
const poin = 1000;

const handler = async (m, { conn }) => {
  conn.tebaklagu = conn.tebaklagu || {};
  const id = m.chat;
  if (id in conn.tebaklagu) {
    return conn.reply(m.chat, '🎵 Ya hay una canción activa. Usa /pista4 o responde al mensaje.', conn.tebaklagu[id][0]);
  }

  const cancionesPopulares = [
    { link_song: "https://files.catbox.moe/y4kflr.mp3", jawaban: "Ella Baila Sola - Peso Pluma" },
    { link_song: "https://files.catbox.moe/kwt80n.mp3", jawaban: "Quién como tú - Ana Gabriel" },
    { link_song: "https://files.catbox.moe/02ztlq.mp3", jawaban: "Mujeres Divinas - Vicente Fernández" },
    { link_song: "https://files.catbox.moe/6wzivn.mp3", jawaban: "Rata de Dos Patas - Paquita la del Barrio" },
    { link_song: "https://files.catbox.moe/2e4kqk.mp3", jawaban: "Tití Me Preguntó - Bad Bunny" },
    { link_song: "https://files.catbox.moe/n1q7o2.mp3", jawaban: "BZRP Music Sessions #50 - Duki" },
    { link_song: "https://files.catbox.moe/uq8pco.mp3", jawaban: "Muchachos - La Mosca" }
  ];

  const seleccion = cancionesPopulares[Math.floor(Math.random() * cancionesPopulares.length)];
  const caption = `
🎧 *¡Adivina la canción!*

⏳ Tienes ${(timeout / 1000).toFixed(0)} segundos.
🔁 Responde a este mensaje o usa: */rpcancion tu_respuesta*
💡 Pista: */pista4*
🏆 Premio: ${poin} XP
`.trim();

  const pregunta = await m.reply(caption);
  conn.tebaklagu[id] = [
    pregunta,
    seleccion,
    poin,
    setTimeout(() => {
      if (conn.tebaklagu[id]) {
        conn.reply(m.chat, `⏱️ Tiempo agotado. La respuesta era: *${seleccion.jawaban}*`, conn.tebaklagu[id][0]);
        delete conn.tebaklagu[id];
      }
    }, timeout)
  ];

  await conn.sendMessage(m.chat, {
    audio: { url: seleccion.link_song },
    fileName: `cancion.mp3`,
    mimetype: 'audio/mpeg'
  }, { quoted: pregunta });
};

handler.command = /^cancion|canción$/i;
export default handler;