const handler = async (m, { conn, text, isROwner }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.informaragrupos || {};
  if (!isROwner) throw (t.solo_owner || 'Este comando es solo para el Owner.');

  const chats = Object.entries(conn.chats)
    .filter(([jid]) => !jid.endsWith('broadcast'))
    .map(([jid]) => jid);

  const mensaje = text || m.quoted?.text;
  if (!mensaje) throw (t.sin_mensaje || '✍️ Escribe un mensaje o responde a uno para enviarlo.');

  const mensajeFinal = (t.comunicado?.replace('{mensaje}', mensaje) || `*📣 Comunicado del Administrador*\n\n${mensaje}\n\n⭐️ Gracias por estar aquí.\n\nℹ️ Nota: Este mensaje fue enviado por el administrador de este bot. No oficial del proyecto Luna-Botv6-Project.\n\n🔗 *Canal oficial:* https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y`);

  let enviados = 0;

  for (const id of chats) {
    try {
      if (id.endsWith('@g.us')) {
        const metadata = await conn.groupMetadata(id).catch(() => null);
        if (!metadata) continue;
      }
      await conn.sendMessage(id, { text: mensajeFinal }, m ? { quoted: m } : {});
      enviados++;
      await new Promise(r => setTimeout(r, 5000));
    } catch {}
  }

  m.reply((t.exito?.replace('{n}', enviados) || `✅ Mensaje enviado con éxito a ${enviados} chat(s).`));
};

handler.help = ['informaragrupos <mensaje>'];
handler.tags = ['owner'];
handler.command = /^informaragrupos$/i;
handler.owner = true;

export default handler;
