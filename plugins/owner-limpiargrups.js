const handler = async (m, { conn }) => {
  try {
    await m.reply('🔍 Buscando grupos con el bot solo o con 1 integrante...');

    const botJid = conn.decodeJid(conn.user.jid);
    const groupsObj = await conn.groupFetchAllParticipating();
    const allGroups = Object.entries(groupsObj);

    const solos = [];

    for (const [jid] of allGroups) {
      const meta = await conn.groupMetadata(jid).catch(() => null);
      if (!meta || !meta.participants?.length) continue;
      const botEsta = meta.participants.some(u => conn.decodeJid(u.id) === botJid);
      if (!botEsta) continue;
      if (meta.participants.length <= 2) solos.push({ jid, nombre: meta.subject || jid, total: meta.participants.length });
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (solos.length === 0) {
      return m.reply('✅ No hay grupos para limpiar.');
    }

    const listaAntes = solos.map(g => `• ${g.nombre} (${g.total} participante${g.total > 1 ? 's' : ''})`).join('\n');
    await m.reply(`🗑️ Encontré ${solos.length} grupo(s):\n${listaAntes}\n\nIntentando salir...`);

    const exitados = [];
    const fallidos = [];

    for (const { jid, nombre } of solos) {
      try {
        await conn.groupLeave(jid);
        exitados.push(`✅ ${nombre}`);
      } catch (err) {
        fallidos.push(`❌ ${nombre}: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    let resumen = `📋 Resultado:\n\n`;
    if (exitados.length) resumen += `*Salió de:*\n${exitados.join('\n')}\n\n`;
    if (fallidos.length) resumen += `*Errores:*\n${fallidos.join('\n')}`;

    await m.reply(resumen.trim());

  } catch (err) {
    await m.reply(`❌ Error crítico:\n${err.message}`);
  }
};

handler.help = ['limpiargrupos', 'cleangroups', 'salirsolos'];
handler.tags = ['tools'];
handler.command = /^(limpiargrupos|cleangroups|salirsolos)$/i;
handler.rowner = true;
handler.private = true;

export default handler;