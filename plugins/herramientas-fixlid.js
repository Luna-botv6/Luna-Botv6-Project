const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.herramientas_fixlid || {};
  const senderLid = m.sender;
  const chatJid = m.chat;
  const pushName = m.pushName || 'SinNombre';

  if (!senderLid.includes('@lid')) {
    return m.reply(t.solo_lid || '❌ Este comando solo se puede usar si apareces como LID.');
  }

  // Inicializar cachés globales si no existen
  global.lidToJidCache = global.lidToJidCache || new Map();
  global.lidToNameCache = global.lidToNameCache || new Map();

  try {
    // Buscar participante real en el grupo
    const groupMetadata = await conn.groupMetadata(chatJid);
    const participantes = groupMetadata.participants;

    for (const p of participantes) {
      const pName = await conn.getName(p.id);
      const cleanPush = pushName.toLowerCase().trim();
      const cleanName = (pName || '').toLowerCase().trim();
      const notify = (p.notify || '').toLowerCase().trim();

      if (cleanName === cleanPush || notify === cleanPush) {
        global.lidToJidCache.set(senderLid, p.id);
        global.lidToNameCache.set(senderLid, pName);
        return m.reply(t.corregido?.replace('{nombre}', pName).replace('{id}', p.id) || `✅ LID corregido: ahora aparecerás como ${pName} (${p.id})`);
      }
    }

    return m.reply(t.no_encontrado || '⚠️ No se pudo encontrar tu número real en el grupo.');
  } catch (e) {
    console.log(e);
    return m.reply(t.error || '❌ Ocurrió un error al intentar corregir el LID.');
  }
};

handler.command = /^fixlid$/i;
handler.tags = ['herramientas'];
handler.help = ['fixlid'];
handler.register = true;

export default handler;
