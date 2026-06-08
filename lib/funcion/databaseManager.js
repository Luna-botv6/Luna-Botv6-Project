import { createUsersProxy, migrateFromLowdb, setUser } from './userManager.js';

let _proxyInstalled = false;

const chatDefaults = {
  isBanned: false,
  welcome: true,
  detect: false,
  detect2: false,
  sWelcome: '',
  sBye: '',
  sPromote: '',
  sDemote: '',
  antidelete: false,
  modohorny: true,
  autosticker: false,
  audios: false,
  antiLink: false,
  antiLink2: false,
  antiviewonce: false,
  antiToxic: false,
  antiTraba: false,
  antiArab: false,
  antiArab2: false,
  antiporno: false,
  modoadmin: false,
  simi: false,
  game: true,
  expired: 0,
  language: 'es'
};

function isValidJidKey(jid) {
  if (typeof jid !== 'string') return false;
  if (jid.startsWith('__')) return false;
  if (jid === 'toJSON' || jid === 'then' || jid === 'constructor') return false;
  if (!jid.includes('@')) return false;
  return true;
}

function createChatsProxy(target = {}) {
  const ensureDefaults = (chatObj) => {
    Object.keys(chatDefaults).forEach(key => {
      if (chatObj[key] === undefined) chatObj[key] = chatDefaults[key];
    });
    return chatObj;
  };

  return new Proxy(target, {
    get(_, jid) {
      if (!isValidJidKey(jid)) return undefined;
      if (!target[jid]) target[jid] = { ...chatDefaults };
      return ensureDefaults(target[jid]);
    },
    set(_, jid, value) {
      if (!isValidJidKey(jid)) return true;
      target[jid] = value;
      return true;
    },
    has(_, jid) {
      if (!isValidJidKey(jid)) return false;
      return Object.prototype.hasOwnProperty.call(target, jid);
    },
    ownKeys() {
      return Object.keys(target);
    },
    getOwnPropertyDescriptor(_, jid) {
      if (!isValidJidKey(jid)) return undefined;
      if (Object.prototype.hasOwnProperty.call(target, jid)) {
        return { configurable: true, enumerable: true, writable: true };
      }
      return undefined;
    }
  });
}

export function installUsersProxy() {
  if (_proxyInstalled) return;
  if (!global.db?.data) return;

  const existing = global.db.data.users || {};
  migrateFromLowdb(existing);
  global.db.data.users = createUsersProxy();
  const existingChats = global.db.data.chats || {};
  global.db.data.chats = createChatsProxy(existingChats);
  _proxyInstalled = true;

  const _originalWrite = global.db.write.bind(global.db);
  global.db.write = async function () {
    const usersProxy = global.db.data.users;
    const chatsProxy = global.db.data.chats;
    global.db.data.users = {};
    global.db.data.chats = existingChats;
    try {
      await _originalWrite();
    } finally {
      global.db.data.users = usersProxy;
      global.db.data.chats = chatsProxy;
    }
  };

  global.db.write().catch(e => console.error('[databaseManager] Error limpiando users de database.json:', e.message));
}

export async function ensureUserData(sender, chat) {
  try {
    if (!global.db.data.users[sender]) {
      try {
        setUser(sender, {});
      } catch (e) {}
      if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
    }
    if (!global.db.data.chats[chat]) {
      global.db.data.chats[chat] = {};
    }
    const user = global.db.data.users[sender] || {};
    const userDefaults = {
      wait: 0,
      banned: false,
      BannedReason: '',
      Banneduser: false,
      premium: false,
      premiumTime: 0,
      registered: false,
      sewa: false,
      skill: '',
      language: 'es'
    };
    Object.keys(userDefaults).forEach(key => {
      if (user[key] === undefined) user[key] = userDefaults[key];
    });
    const chatObj = global.db.data.chats[chat];
    Object.keys(chatDefaults).forEach(key => {
      if (chatObj[key] === undefined) chatObj[key] = chatDefaults[key];
    });

    if (chat.endsWith('@g.us') && chatObj.language && chatObj.language !== 'es') {
      user.language = chatObj.language;
    }
  } catch (e) {
    console.error(`Error ensuring user data: ${e.message}`);
  }
}

const _initializedBotSettings = new Set();

export async function ensureBotSettings(botJid) {
  try {
    if (_initializedBotSettings.has(botJid)) return;
    if (!global.db.data.settings) global.db.data.settings = {};
    if (!global.db.data.settings[botJid]) {
      global.db.data.settings[botJid] = {};
    }
    const settings = global.db.data.settings[botJid];
    const settingsDefaults = {
      self: false,
      autoread: false,
      autoread2: false,
      restrict: false,
      antiCall: false,
      antiPrivate: false,
      modejadibot: true,
      antispam: false,
      audios_bot: false,
      modoia: false
    };
    Object.keys(settingsDefaults).forEach(key => {
      if (settings[key] === undefined) settings[key] = settingsDefaults[key];
    });
    _initializedBotSettings.add(botJid);
  } catch (e) {
    console.error(`Error ensuring bot settings: ${e.message}`);
  }
}
