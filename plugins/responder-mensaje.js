const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.responder_mensaje || {};
  conn.tebaklagu = conn.tebaklagu || {};
  const id = m.chat;

  if (!(id in conn.tebaklagu)) return;

  const juego = conn.tebaklagu[id][1];
  const correcta = juego.jawaban.toLowerCase();
  const texto = m.text?.trim().toLowerCase();

  const esRespuesta = m.quoted?.id === conn.tebaklagu[id][0]?.id;
  if (!texto || !esRespuesta) return;

  if (texto === correcta) {
    m.reply(t.correcto?.replace('{respuesta}', juego.jawaban).replace('{xp}', conn.tebaklagu[id][2]) || `🎉 ¡Correcto! Era: *${juego.jawaban}*
Ganaste ${conn.tebaklagu[id][2]} XP.`);
    clearTimeout(conn.tebaklagu[id][3]);
    delete conn.tebaklagu[id];
  } else {
    m.reply(t.incorrecta || '❌ Respuesta incorrecta. Intenta otra vez.');
  }
};

export default handler;