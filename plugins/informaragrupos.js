const handler = async (m, { conn, text, isROwner }) => {
  if (!isROwner) throw 'Este comando es solo para el Owner.';

  const chats = Object.entries(conn.chats)
    .filter(([jid, chat]) => chat.isChats && !jid.endsWith('broadcast'))
    .map(([jid]) => jid);

  const mensaje = text || (m.quoted && m.quoted.text);
  if (!mensaje) throw '✍️ Escribe un mensaje o responde a uno para enviarlo.';

  const mensajeFinal = `*📣 Comunicado Oficial*\n\n${mensaje}\n\n⭐️ Gracias por estar aquí.\n\n🔗 *Canal oficial:* https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y`;

  for (const id of chats) {
    await conn.sendMessage(id, { text: mensajeFinal }, { quoted: m });
    await new Promise(resolve => setTimeout(resolve, 5000)); // Espera 5 segundo entre mensajes
  }

  m.reply(`✅ Mensaje enviado con éxito a ${chats.length} chat(s).`);
};

handler.help = ['informaragrupos <mensaje>'];
handler.tags = ['owner'];
handler.command = /^informaragrupos$/i;
handler.owner = true;

export default handler;

