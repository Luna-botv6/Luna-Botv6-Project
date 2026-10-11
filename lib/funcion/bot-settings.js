export function getBotSettingsKey(conn) {
  const c = conn || global.conn;
  return c?.user?.jid || null;
}

export function isBotFunctionEnabled(settingsKey, conn) {
  const botJid = getBotSettingsKey(conn);
  if (!botJid || !settingsKey) return false;
  return global.db?.data?.settings?.[botJid]?.[settingsKey] === true;
}

export function setBotFunctionEnabled(settingsKey, enabled, conn) {
  const botJid = getBotSettingsKey(conn);
  if (!botJid || !settingsKey || !global.db?.data) return false;
  if (!global.db.data.settings) global.db.data.settings = {};
  if (!global.db.data.settings[botJid]) global.db.data.settings[botJid] = {};
  global.db.data.settings[botJid][settingsKey] = !!enabled;
  return true;
}
