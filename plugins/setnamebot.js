const handler = async (m, { conn, args, text, isROwner }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
  const _translate = await global.loadTranslation(idioma);
  const t = _translate?.plugins?.setnamebot || {};

  if (!isROwner) return m.reply(t.solo_rowner || '❌ Solo el owner real del bot puede cambiar el nombre.');

  if (!text?.trim()) {
    return m.reply(t.uso || '');
  }

  const nuevoNombre = text.trim();

  if (nuevoNombre.length > 40) {
    return m.reply(t.muy_largo || '');
  }

  const esSub = !!conn?.isSubBot;

  if (esSub) {
    const jid = conn?.user?.jid;
    if (!jid) return m.reply(t.error || '❌ No se pudo identificar el SubBot.');
    if (!global.db.data.settings) global.db.data.settings = {};
    if (!global.db.data.settings[jid]) global.db.data.settings[jid] = {};
    global.db.data.settings[jid].botName = nuevoNombre;
  } else {
    if (!global.db.data.config) global.db.data.config = {};
    global.db.data.config.botName = nuevoNombre;
  }

  try {
    await global.db.write();
  } catch (e) {
    console.error('[setnamebot] Error guardando nombre en DB:', e.message);
  }

  const respuesta = esSub
    ? (t.subbot_renombrado || '✅ SubBot renombrado a *{nombre}*.').replace('{nombre}', nuevoNombre)
    : (t.ok || '✅ Nombre del bot actualizado a *{nombre}*.').replace('{nombre}', nuevoNombre);
  m.reply(respuesta);
};

handler.command = /^setnamebot$/i;
handler.rowner = true;
handler.tags = ['owner'];
handler.help = ['setnamebot <nombre>'];

export default handler;
