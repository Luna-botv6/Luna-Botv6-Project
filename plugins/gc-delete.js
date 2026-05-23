import { readFileSync } from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const normalizeJid = (jid = '') => jid.replace(/:\d+@/, '@').trim();

const handler = async (m, { conn, isOwner }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const langData = JSON.parse(readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf-8'));
  const txt = langData?.plugins?.gc_delete || langData?.plugins?.gc_delete;

  if (!txt) return m.reply('❌ Error: traducciones no encontradas para gc_delete');
  if (!m.isGroup) return m.reply(txt.solo_grupos);

  const { groupMetadata, isAdmin, isBotAdmin } =
    await getGroupDataForPlugin(conn, m.chat, m.sender);

  const participants = groupMetadata?.participants || [];
  const botJid = normalizeJid(conn.user?.id || '');
  const isBotAdminReal =
    isBotAdmin ||
    participants.some(
      (p) => normalizeJid(p.id) === botJid &&
        (p.admin === 'admin' || p.admin === 'superadmin')
    );

  if (!isAdmin && !isOwner) return m.reply(txt.no_admin);
  if (!isBotAdminReal) return m.reply(txt.no_bot_admin);
  if (!m.quoted) return m.reply(txt.no_quoted);

  const resolveLid = (jidOrLid) => {
    if (!jidOrLid) return null;
    if (!jidOrLid.includes('@lid')) return jidOrLid;
    const match = participants.find((p) => p.lid === jidOrLid);
    return match ? match.id : null;
  };

  const quotedSender = m.quoted.sender
    ? resolveLid(m.quoted.sender) || m.quoted.sender
    : null;

  const messageId =
    m.quoted.key?.id ||
    m.message?.extendedTextMessage?.contextInfo?.stanzaId;

  const participant =
    quotedSender ||
    m.message?.extendedTextMessage?.contextInfo?.participant;

  if (!messageId || !participant) return m.reply(txt.error);

  try {
    await conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id: messageId,
        participant,
      },
    });
    await m.reply(txt.success);
  } catch {
    await m.reply(txt.error);
  }
};

handler.help = ['del', 'delete'];
handler.tags = ['group'];
handler.command = /^del(ete)?$/i;
handler.group = true;

export default handler;