import fs from 'fs';
import { setConfig, getConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const configLocks = new Map();

async function safeSetConfig(chatId, config) {
  if (configLocks.has(chatId)) await configLocks.get(chatId);
  const promise = setConfig(chatId, config);
  configLocks.set(chatId, promise);
  try { await promise; } 
  finally { configLocks.delete(chatId); }
}

const CONFIG_MAP = {
  welcome: { key: 'welcome', group: true, admin: true },
  detect: { key: 'detect', group: true, admin: true },
  detect2: { key: 'detect2', group: true, admin: true },
  antidelete: { key: 'antidelete', group: true, admin: true },
  antilink: { key: 'antiLink', group: true, admin: true },
  antilink2: { key: 'antiLink2', group: true, admin: true },
  modoadmin: { key: 'modoadmin', group: true, admin: true },
  autosticker: { key: 'autosticker', group: true, admin: true },
  audios: { key: 'audios', group: true, admin: true },
  antitoxic: { key: 'antiToxic', group: true, admin: true },
  afk: { key: 'afkAllowed', group: true, admin: true },
  restrict: { key: 'restrict', bot: true, owner: true },
  audios_bot: { key: 'audios_bot', bot: true, owner: true },
  autoread: { key: 'autoread2', bot: true, owner: true },
  anticall: { key: 'antiCall', bot: true, owner: true },
  antispam: { key: 'antispam', bot: true, owner: true },
  antiprivado: { key: 'antiprivado', file: true, owner: true },
  modopublico: { key: 'modopublico', file: true, owner: true },
  vierwimage: { key: 'vierwimage', file: true, owner: true },
  modogrupos: { key: 'modogrupos', file: true, owner: true }
};

const HELP_TEXT = (prefix, cmd) => `*====[ ⚙️ CONFIGURACIÓN ⚙️ ]====*

🎉 *WELCOME* - ${prefix}${cmd} welcome
🚫 *ANTILINK* - ${prefix}${cmd} antilink
🚫 *ANTILINK2* - ${prefix}${cmd} antilink2
🔐 *RESTRICT* - ${prefix}${cmd} restrict (Owner)
📖 *AUTOREAD* - ${prefix}${cmd} autoread (Owner)
🎵 *AUDIOS* - ${prefix}${cmd} audios
🏷️ *AUTOSTICKER* - ${prefix}${cmd} autosticker
📞 *ANTICALL* - ${prefix}${cmd} anticall (Owner)
☢️ *ANTITOXIC* - ${prefix}${cmd} antitoxic
👑 *MODOADMIN* - ${prefix}${cmd} modoadmin
⏰ *AFK* - ${prefix}${cmd} afk
🗑️ *ANTIDELETE* - ${prefix}${cmd} antidelete
📊 *AUDIOS_BOT* - ${prefix}${cmd} audios_bot (Owner)
🎯 *ANTISPAM* - ${prefix}${cmd} antispam (Owner)
📝 *ANTIPRIVADO* - ${prefix}${cmd} antiprivado (Owner)
🌐 *MODOPUBLICO* - ${prefix}${cmd} modopublico (Owner)
👀 *VIERWIMAGE* - ${prefix}${cmd} vierwimage (Owner)
🢀 *MODOGRUPOS* - ${prefix}${cmd} modogrupos (Owner)

*================================*`;

async function getOwnerNumbers(conn) {
  const nums = [];
  const clean = (n) => n.toString().replace(/[^0-9]/g, '');
  
  if (global.owner?.length) {
    for (const o of global.owner) {
      const n = clean(Array.isArray(o) ? o[0] : o);
      if (n && !nums.includes(n)) nums.push(n);
    }
  }
  if (global.lidOwners?.length) {
    for (const o of global.lidOwners) {
      const n = clean(o);
      if (n && !nums.includes(n)) nums.push(n);
    }
  }
  return nums;
}

const handler = async (m, {conn, usedPrefix, command, args}) => {
  if (!conn?.user?.jid) return m.reply('⚠️ Sesión no válida. El bot no está conectado correctamente.');

  const realNum = m.sender.replace(/[^0-9]/g, '');
  const ownerNumbers = await getOwnerNumbers(conn);
  const isROwner = ownerNumbers.includes(realNum);
  const isOwner = isROwner || m.sender === conn?.user?.jid;
  const isAdmin = m.isGroup ? (await getGroupDataForPlugin(conn, m.chat, m.sender)).isAdmin : false;
  
  const isEnable = /true|enable|(turn)?on|1/i.test(command);
  const type = (args[0] || '').toLowerCase();
  
  if (!CONFIG_MAP[type]) {
    if (!/[01]/.test(command)) await conn.sendMessage(m.chat, {text: HELP_TEXT(usedPrefix, command)}, {quoted: m});
    return;
  }

  const config = CONFIG_MAP[type];
  
  if (config.group && !m.isGroup) return m.reply('❌ Este comando solo funciona en grupos');
  if (config.admin && !isAdmin && !isOwner) return m.reply('❌ Solo admins pueden usar este comando');
  if (config.owner && !isOwner && !isROwner) return m.reply('❌ Solo el owner puede usar este comando');

  if (config.file) {
    let ownerConfig = {};
    try {
      ownerConfig = JSON.parse(await fs.promises.readFile('./database/funciones-owner.json', 'utf8'));
    } catch (e) {
      ownerConfig = { antiprivado: false, modopublico: false, vierwimage: false, modogrupos: false };
    }
    ownerConfig[type] = isEnable;
    try {
      await fs.promises.writeFile('./database/funciones-owner.json', JSON.stringify(ownerConfig, null, 2), 'utf8');
    } catch (e) {
      console.error('Error guardando funciones-owner.json:', e.message);
      return m.reply('❌ Error al guardar la configuración.');
    }
  } else if (config.bot) {
    global.db.data.settings[conn.user.jid][config.key] = isEnable;
  } else {
    const chat = getConfig(m.chat) || {};
    chat[config.key] = isEnable;
    await safeSetConfig(m.chat, chat);
  }

  const scopeText = config.bot || config.file ? 'TODO EL BOT' : 'ESTE CHAT';
  const msg = `*====[ ⚙️ CONFIGURACIÓN ACTUALIZADA ⚙️ ]====*\n\n${isEnable ? '✅' : '❌'} *Función:* _${type}_\n*Estado:* _${isEnable ? 'ACTIVADA' : 'DESACTIVADA'}_\n*Alcance:* _${scopeText}_\n\n*================================*`;
  
  conn.sendMessage(m.chat, {text: msg}, {quoted: m});
};

handler.command = /^((en|dis)able|(tru|fals)e|(turn)?[01])$/i;
export default handler;