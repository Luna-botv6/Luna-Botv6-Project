const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.pista4 || {};
  conn.tebaklagu = conn.tebaklagu || {};
  const id = m.chat;
  if (!(id in conn.tebaklagu)) return m.reply(t.sin_cancion || '❗ No hay ninguna canción activa. Usa /cancion para comenzar.');

  const juego = conn.tebaklagu[id][1];
  const respuesta = juego.jawaban.trim();

  const pista = respuesta.replace(/[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ]/g, (letra, i) => i % 2 === 0 ? letra : '_');
  return m.reply((t.pista || '🕵️ *Pista:* {pista}').replace('{pista}', pista));
};

handler.command = /^pista4$/i;
export default handler;