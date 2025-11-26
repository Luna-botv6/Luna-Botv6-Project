export const all = async (m, { conn }) => {
  if (!m.isGroup || m.fromMe) return;
  if (!global.muted) return;

  let sender = m.sender;
  
  if (sender.includes('@lid')) {
    const groupMetadata = await conn.groupMetadata(m.chat);
    const participant = groupMetadata.participants.find(p => p.lid === sender);
    if (participant && participant.id) {
      sender = participant.id;
    }
  }

  const muteKey = `${m.chat}_${sender}`;
  
  if (global.muted.includes(muteKey)) {
    try {
      await conn.sendMessage(m.chat, { delete: m.key });
    } catch (e) {
      console.log('Error al borrar mensaje muteado:', e.message);
    }
  }
};