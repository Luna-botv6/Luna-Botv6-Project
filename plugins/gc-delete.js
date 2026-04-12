import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const handler = async (m, { conn, isOwner }) => {
  if (!m.isGroup) {
    return m.reply('*[◉] Este comando solo puede usarse en grupos.*');
  }

  const { groupMetadata, isAdmin, isBotAdmin } =
    await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin && !isOwner) {
    return m.reply('*[◉] Solo los administradores pueden usar este comando.*');
  }

  if (!isBotAdmin) {
    return m.reply('*[◉] El bot necesita ser administrador para eliminar mensajes.*');
  }

  if (!m.quoted) {
    return m.reply('*[◉] Debes citar un mensaje para eliminarlo.*');
  }

  const resolveLidToId = (jidOrLid) => {
    if (!jidOrLid) return null;
    if (!jidOrLid.includes('@lid')) return jidOrLid;
    const pdata = groupMetadata.participants.find(p => p.lid === jidOrLid);
    return pdata ? pdata.id : null;
  };

  const quotedSender = m.quoted.sender
    ? resolveLidToId(m.quoted.sender) || m.quoted.sender
    : null;

  const messageId =
    m.quoted.key?.id ||
    m.message?.extendedTextMessage?.contextInfo?.stanzaId;

  const participant =
    quotedSender ||
    m.message?.extendedTextMessage?.contextInfo?.participant;

  if (!messageId || !participant) {
    return m.reply('*[◉] No se pudo eliminar el mensaje.*');
  }

  try {
    await conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id: messageId,
        participant
      }
    });
  } catch (e) {
    console.error(e);
    await m.reply(
      '*[◉] No se pudo eliminar el mensaje. Asegúrate de que el bot sea administrador.*'
    );
  }
};

handler.help = ['del', 'delete'];
handler.tags = ['group'];
handler.command = /^del(ete)?$/i;
handler.group = true;

export default handler;