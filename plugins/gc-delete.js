const handler = async (m, { conn, participants, isOwner }) => {
  if (!m.isGroup) return m.reply('*[❗] Este comando solo puede usarse en grupos.*');

  const groupMetadata = await conn.groupMetadata(m.chat);
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);

  let realUserJid = m.sender;
  if (m.sender.includes('@lid')) {
    const pdata = groupMetadata.participants.find(p => p.lid === m.sender);
    if (pdata && pdata.id) realUserJid = pdata.id;
  }

  const isUserAdmin = groupAdmins.includes(realUserJid);
  if (!isUserAdmin && !isOwner) return m.reply('*[❗] Solo los administradores pueden usar este comando.*');

  if (!m.quoted) return m.reply('*[❗] Debes citar un mensaje para eliminarlo.*');

  const resolveLidToId = (jidOrLid) => {
    if (!jidOrLid) return null;
    if (!jidOrLid.includes('@lid')) return jidOrLid;
    const pdata = groupMetadata.participants.find(p => p.lid === jidOrLid);
    return pdata ? pdata.id : null;
  };

  const user = m.quoted.sender ? resolveLidToId(m.quoted.sender) || m.quoted.sender : null;
  const messageId = m.quoted.key?.id || m.message.extendedTextMessage?.contextInfo?.stanzaId;
  const participant = m.quoted.sender || m.message.extendedTextMessage?.contextInfo?.participant;

  if (!user || !messageId) return m.reply('*[❗] No se pudo eliminar el mensaje.*');

  try {
    await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: messageId, participant } });
  } catch (e) {
    console.error(e);
    await m.reply('*[❗] No se pudo eliminar el mensaje. Asegúrate de que el bot sea administrador.*');
  }
};

handler.help = ['del', 'delete'];
handler.tags = ['group'];
handler.command = /^del(ete)?$/i;
handler.group = true;
handler.botAdmin = true;

export default handler;
