import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';
import { addWarning, resetWarnings } from '../lib/advertencias.js';

const handler = async (m, { conn, text, isOwner, usedPrefix, command }) => {
  if (!m.isGroup) return m.reply('*[◉] Este comando solo funciona en grupos.*');

  const { groupMetadata, participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin && !isOwner) {
    return m.reply('⚠️ Solo administradores pueden usar este comando.');
  }

  if (!isBotAdmin) {
    return m.reply('❌ El bot necesita ser administrador para expulsar usuarios.');
  }

  let target = m.mentionedJid?.[0] || m.quoted?.sender;
  if (!target) return m.reply(`🚫 Uso: *${usedPrefix + command} @usuario*`);
  if (target === conn.user.jid) return m.reply('❌ No puedo advertirme a mí mismo.');

  const resolveLid = (jid) => {
    if (!jid?.includes('@lid')) return jid;
    const p = participants.find(x => x.lid === jid);
    return p?.id || null;
  };

  target = resolveLid(target) || target;

  const finalCheck = participants.find(p => p.id === target);
  if (!finalCheck) return m.reply('◉ El usuario mencionado no se encuentra en este grupo.');

  const reason = text?.replace(/@\d+/g, '').trim() || 'Sin motivo especificado.';
  const warns = await addWarning(target);

  await m.reply(`⚠️ El usuario @${target.split('@')[0]} ha sido advertido.\n📄 Motivo: ${reason}\n📊 Advertencias: ${warns}/3`, null, { mentions: [target] });

  if (warns >= 3) {
    await resetWarnings(target);
    await conn.groupParticipantsUpdate(m.chat, [target], 'remove');
    
    clearGroupCache(m.chat);
    
    await m.reply(`🚷 El usuario @${target.split('@')[0]} fue expulsado por acumular 3 advertencias.`, null, { mentions: [target] });
  }
};

handler.command = /^(warn|advertir|advertencia|warning)$/i;
handler.group = true;

export default handler;