export async function getGroupDataForPlugin(conn, chatId, senderId) {
  try {
    if (!global.groupCache) global.groupCache = new Map();
    
    const cached = global.groupCache.get(chatId);
    if (cached && (Date.now() - cached.timestamp) < 5000) {
      return cached.data;
    }

    const metadata = conn.chats?.[chatId]?.metadata || await conn.groupMetadata(chatId).catch(_ => null);
    
    if (!metadata) {
      return {
        groupMetadata: {},
        participants: [],
        isAdmin: false,
        isBotAdmin: false
      };
    }

    const participants = (metadata.participants || []).map(p => ({
      id: p.id || p.jid,
      lid: p.lid,
      admin: p.admin
    }));

    let realUserJid = senderId;
    if (senderId.includes('@lid')) {
      const participantData = participants.find(p => p.lid === senderId);
      if (participantData && participantData.id) {
        realUserJid = participantData.id;
      }
    }

    const decodedSender = conn.decodeJid(realUserJid);
    const botJid = conn.decodeJid(conn.user.jid);

    const userGroup = participants.find(u => {
      const uid = conn.decodeJid(u.id);
      return uid === decodedSender;
    }) || {};

    const botGroup = participants.find(u => {
      const uid = conn.decodeJid(u.id);
      return uid === botJid;
    }) || {};

    const groupData = {
      groupMetadata: metadata,
      participants,
      isAdmin: userGroup?.admin === 'admin' || userGroup?.admin === 'superadmin',
      isBotAdmin: botGroup?.admin === 'admin' || botGroup?.admin === 'superadmin'
    };

    global.groupCache.set(chatId, {
      data: groupData,
      timestamp: Date.now()
    });

    return groupData;
  } catch (e) {
    console.error('Error getting group data:', e.message);
    return {
      groupMetadata: {},
      participants: [],
      isAdmin: false,
      isBotAdmin: false
    };
  }
}

export function clearGroupCache(chatId) {
  if (global.groupCache) {
    global.groupCache.delete(chatId);
  }
}
