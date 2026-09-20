const handler = async (m, { conn, usedPrefix, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_setppbot || {};
  try {
    if (!m.quoted) throw (t.sin_imagen?.replace('{comando}', usedPrefix + command) || `*[❗INFO❗] NO SE ENCONTRO LA IMAGEN, POR FAVOR RESPONDE A UNA IMAGEN USANDO EL COMANDO ${usedPrefix + command}*`);

    const media = await m.quoted.download();

    await conn.updateProfilePicture(conn.user.jid, media);

    m.reply((t.exito || '*[❗INFO❗] SE CAMBIO CON EXITO LA FOTO DE PERFIL DEL NUMERO DEL BOT*'));
  } catch {
    throw (t.sin_imagen?.replace('{comando}', usedPrefix + command) || `*[❗INFO❗] NO SE ENCONTRO LA IMAGEN, POR FAVOR RESPONDE A UNA IMAGEN USANDO EL COMANDO ${usedPrefix + command}*`);
  }
};

handler.command = /^setppbot$/i;
handler.rowner = true;

export default handler;