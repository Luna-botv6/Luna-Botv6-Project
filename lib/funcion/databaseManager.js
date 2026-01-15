export async function ensureUserData(sender, chat) {
  try {
    if (!global.db.data.users[sender]) {
      global.db.data.users[sender] = {};
    }
    if (!global.db.data.chats[chat]) {
      global.db.data.chats[chat] = {};
    }

    const user = global.db.data.users[sender];
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
    const chatDefaults = {
      isBanned: false,
      welcome: true,
      detect: true,
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

    Object.keys(chatDefaults).forEach(key => {
      if (chatObj[key] === undefined) chatObj[key] = chatDefaults[key];
    });
  } catch (e) {
    console.error(`Error ensuring user data: ${e.message}`);
  }
}

export async function ensureBotSettings(botJid) {
  try {
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
  } catch (e) {
    console.error(`Error ensuring bot settings: ${e.message}`);
  }
}