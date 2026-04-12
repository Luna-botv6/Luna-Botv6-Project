import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const handler = async (m, { conn }) => {
  if (!m.isGroup) return m.reply('Solo en grupos');
  
  const { groupMetadata, participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);
  
  const botJid = conn.decodeJid(conn.user.jid);
  const botInGroup = participants.find(p => conn.decodeJid(p.id) === botJid);
  
  let realUserJid = m.sender;
  if (m.sender.includes('@lid')) {
    const participantData = participants.find(p => p.lid === m.sender);
    if (participantData && participantData.id) {
      realUserJid = participantData.id;
    }
  }
  
  const userInGroup = participants.find(p => conn.decodeJid(p.id) === conn.decodeJid(realUserJid));
  
  let text = '🔍 DEBUG INFO\n\n';
  text += `Tu sender: ${m.sender}\n`;
  text += `Tu JID real: ${realUserJid}\n`;
  text += `Tu admin value: ${userInGroup?.admin || 'null'}\n`;
  text += `isAdmin result: ${isAdmin}\n\n`;
  text += `Bot JID: ${botJid}\n`;
  text += `Bot admin value: ${botInGroup?.admin || 'null'}\n`;
  text += `isBotAdmin result: ${isBotAdmin}\n\n`;
  text += `Total participantes: ${participants.length}\n`;
  
  m.reply(text);
};

handler.command = /^testadmin$/i;
handler.group = true;

export default handler;