const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_deletechat || {};
  try {
    const chatId = m.chat;

    const allChats = Object.entries(conn.chats).filter(([jid, chat]) => chat.isChats);

    if (allChats.length === 0) {
      return m.reply((t.sin_chats || '⚠️ No se encontraron chats para borrar.'));
    }

    await m.reply((t.borrando?.replace('{cantidad}', allChats.length) || `🗑️ Borrando ${allChats.length} chats...`));

    let borrados = 0;
    let errores = 0;

    for (const [jid, chat] of allChats) {
      try {
        const messages = chat.messages ? Object.values(chat.messages) : [];
        if (messages.length === 0) continue;

        const lastMsg = messages[messages.length - 1];
        const lastKey = lastMsg.key;

        let realJid = jid;
        if (jid.endsWith('@lid')) {
          const found = Object.keys(conn.chats).find(j => {
            const c = conn.chats[j];
            if (!c.messages) return false;
            return Object.values(c.messages).some(msg => msg.key?.participant === jid);
          });
          if (found) realJid = found;
          else continue;
        }

        await conn.chatModify(
          {
            delete: true,
            lastMessages: [
              {
                key: {
                  ...lastKey,
                  remoteJid: realJid
                },
                messageTimestamp: lastMsg.messageTimestamp || Math.floor(Date.now() / 1000)
              }
            ]
          },
          realJid
        );

        borrados++;
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (err) {
        errores++;
      }
    }

    await conn.sendMessage(chatId, {
      text: (t.resumen ? t.resumen
        .replace('{borrados}', borrados)
        .replace('{errores}', errores) : null) ||
        `✅ Proceso completado\n📊 Chats borrados: ${borrados}\n❌ Errores: ${errores}`
    });

  } catch (err) {
    console.error('Error al borrar chats:', err);
    await m.reply((t.error_critico || '❌ Error crítico al borrar chats.'));
  }
};

handler.help = ['borrarchats', 'clearchats', 'deletechats'];
handler.tags = ['tools'];
handler.command = /^(borrarchats|clearchats|deletechats)$/i;
handler.rowner = true;
handler.private = true;

export default handler;