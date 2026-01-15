import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

export const all = async (m, { conn }) => {
  try {
    if (!m.isGroup) return;
    if (m.fromMe) return;
    if (!global.muted || global.muted.length === 0) return;

    let sender = m.sender;

    if (sender.includes('@lid')) {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, sender);
      const p = participants.find(u => u.lid === sender);
      if (p?.id) sender = p.id;
    }

    const muteKey = `${m.chat}_${sender}`;

    if (global.muted.includes(muteKey)) {
      await conn.sendMessage(m.chat, { delete: m.key });
    }
  } catch (e) {}
};