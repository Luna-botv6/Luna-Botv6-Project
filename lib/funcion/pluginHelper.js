import fs from 'fs';
import path from 'path';

const ADMIN_CACHE_PATH = './database/group_admins.json';
const ADMIN_CACHE_TTL = 30 * 60 * 1000;

function ensureAdminCacheDir() {
  const dir = path.dirname(ADMIN_CACHE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadAdminCache() {
  try {
    ensureAdminCacheDir();
    if (fs.existsSync(ADMIN_CACHE_PATH)) {
      const data = JSON.parse(fs.readFileSync(ADMIN_CACHE_PATH, 'utf8'));
      return data || {};
    }
  } catch (e) {
    console.error('Error loading admin cache:', e.message);
  }
  return {};
}

function saveAdminCache(cache) {
  try {
    ensureAdminCacheDir();
    fs.writeFileSync(ADMIN_CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error('Error saving admin cache:', e.message);
  }
}

function isAdminCacheValid(timestamp) {
  return timestamp && (Date.now() - timestamp) < ADMIN_CACHE_TTL;
}

export async function updateGroupAdmins(chatId, participants, conn) {
  try {
    const cache = loadAdminCache();
    
    if (!cache[chatId]) {
      cache[chatId] = {};
    }

    const admins = {};
    for (const p of participants) {
      const userId = conn.decodeJid(p.id || p.jid).replace('@s.whatsapp.net', '');
      if (p.admin === 'admin' || p.admin === 'superadmin') {
        admins[userId] = true;
      }
    }

    cache[chatId].admins = admins;
    cache[chatId].timestamp = Date.now();
    
    saveAdminCache(cache);
  } catch (e) {
    console.error('Error updating group admins:', e.message);
  }
}

export function addAdminToCache(chatId, userId) {
  try {
    const cache = loadAdminCache();
    
    if (!cache[chatId]) {
      cache[chatId] = { admins: {}, timestamp: Date.now() };
    }
    
    cache[chatId].admins[userId] = true;
    cache[chatId].timestamp = Date.now();
    
    saveAdminCache(cache);
  } catch (e) {
    console.error('Error adding admin to cache:', e.message);
  }
}

export function removeAdminFromCache(chatId, userId) {
  try {
    const cache = loadAdminCache();
    
    if (cache[chatId] && cache[chatId].admins) {
      delete cache[chatId].admins[userId];
      cache[chatId].timestamp = Date.now();
      saveAdminCache(cache);
    }
  } catch (e) {
    console.error('Error removing admin from cache:', e.message);
  }
}

export function isUserAdminInCache(chatId, userId) {
  try {
    const cache = loadAdminCache();
    const groupCache = cache[chatId];
    
    if (!groupCache || !isAdminCacheValid(groupCache.timestamp)) {
      return false;
    }
    
    return groupCache.admins && groupCache.admins[userId] === true;
  } catch (e) {
    console.error('Error checking admin in cache:', e.message);
    return false;
  }
}

export function clearGroupAdminCache(chatId) {
  try {
    const cache = loadAdminCache();
    if (cache[chatId]) {
      delete cache[chatId];
      saveAdminCache(cache);
    }
  } catch (e) {
    console.error('Error clearing group admin cache:', e.message);
  }
}

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

    await updateGroupAdmins(chatId, participants, conn);

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