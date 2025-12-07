const groupMetadataCache = new Map();
const CACHE_DURATION = 45000;

export const all = async (m, { conn }) => {
  if (!m.isGroup || m.fromMe) return;
  if (!global.muted) return;

  let sender = m.sender;
  
  if (sender.includes('@lid')) {
    try {
      let groupMetadata = groupMetadataCache.get(m.chat);
      
      if (!groupMetadata) {
        groupMetadata = await conn.groupMetadata(m.chat);
        groupMetadataCache.set(m.chat, groupMetadata);
        
        setTimeout(() => groupMetadataCache.delete(m.chat), CACHE_DURATION);
      }
      
      const participant = groupMetadata.participants.find(p => p.lid === sender);
      if (participant && participant.id) {
        sender = participant.id;
      }
    } catch (e) {
      console.log('Error al obtener metadatos:', e.message);
      return;
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