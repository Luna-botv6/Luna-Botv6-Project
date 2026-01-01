import { updateLastCommand } from './logBans.js';
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import { smsg } from './src/libraries/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import { EventEmitter } from 'events';
import { unwatchFile, watchFile } from 'fs';
import fs from 'fs';
import chalk from 'chalk';
import ws from 'ws';
import { getGroupMetadata, handleParticipantsUpdate } from './lib/groupMetadata.js';
import mentionListener from './plugins/game-ialuna.js';
import { isVoiceMessage, handleVoiceMessage } from './plugins/voice-handler.js';
import { getConfig, setConfig } from './lib/funcConfig.js';
import { readFile } from 'fs/promises';
import mddd5 from 'md5';
import { setOwnerFunction } from './lib/owner-funciones.js';
import { addExp, getUserStats, setUserStats } from './lib/stats.js';
import { getSinPrefijo, setSinPrefijo, loadSinPrefijoData, saveSinPrefijoData, getAllSinPrefijo } from './lib/sinPrefijo.js';

EventEmitter.defaultMaxListeners = 50;
process.setMaxListeners(50);


const groupCache = new Map();
const recentMessages = new Map();
const recentParticipantEvents = new Map();
const translationsCache = new Map();
const customCommandsCache = new Map();

const CACHE_TTL = 2 * 60 * 1000;
const DUPLICATE_TIMEOUT = 3000;
const MAX_CACHE_SIZE = 150;



const groupMetadataRequestCache = new Map();
const processedVoiceMessages = new Set();

const botMetadataCache = {
  name: null,
  number: null,
  jid: null,
  lastUpdate: 0
};

global.groupCache = groupCache;
global.recentMessages = recentMessages;
global.recentParticipantEvents = recentParticipantEvents;
global.translationsCache = translationsCache;
global.customCommandsCache = customCommandsCache;
global.getCachedGroupData = (chatId) => null;
global.setCachedGroupData = (chatId, data) => {};
const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
const isNumber = (x) => typeof x === 'number' && !isNaN(x);
const delay = (ms) => isNumber(ms) && new Promise((resolve) => setTimeout(() => resolve(), ms));

function safeAsync(asyncFn, defaultValue = null) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (e) {
      console.error(`Error in async operation: ${e.message}`);
      return defaultValue;
    }
  };
}



function getBotMetadata(conn) {
  const now = Date.now();
  if (botMetadataCache.lastUpdate && (now - botMetadataCache.lastUpdate) < BOT_METADATA_TTL) {
    return {
      name: botMetadataCache.name || 'Luna-Bot',
      number: botMetadataCache.number || 'Sin número',
      jid: botMetadataCache.jid
    };
  }
  try {
    botMetadataCache.jid = conn?.user?.jid || conn?.user?.id;
    botMetadataCache.number = conn?.user?.jid?.split('@')[0] || 'Sin número';
    botMetadataCache.name = conn?.user?.name || conn?.user?.verifiedName || 'Luna-Bot';
    botMetadataCache.lastUpdate = now;
  } catch (e) {
    console.error(`Error getting bot metadata: ${e.message}`);
  }
  return {
    name: botMetadataCache.name || 'Luna-Bot',
    number: botMetadataCache.number || 'Sin número',
    jid: botMetadataCache.jid
  };
}

function isDuplicate(messageId, sender, text) {
  if (!messageId) return false;
  
  const uniqueKey = `${messageId}_${sender}_${text?.substring(0, 50) || ''}`;
  
  if (recentMessages.has(uniqueKey)) {
    const timestamp = recentMessages.get(uniqueKey);
    if (Date.now() - timestamp < DUPLICATE_TIMEOUT) {
      return true; 
    }
  }
  
  if (recentMessages.size >= MAX_CACHE_SIZE) {
    const firstKey = recentMessages.keys().next().value;
    recentMessages.delete(firstKey);
  }
  
  recentMessages.set(uniqueKey, Date.now());
  return false;
}

async function loadTranslation(idioma) {
  const cached = translationsCache.get(idioma);
  if (cached) return cached;
  try {
    const data = await readFile(`./src/languages/${idioma}.json`, 'utf8');
    const parsed = JSON.parse(data);
    translationsCache.set(idioma, parsed);
    return parsed;
  } catch (e) {
    console.error(`Error loading language ${idioma}: ${e.message}`);
    return {};
  }
}

async function loadCustomCommandsOnce(customCommandsDir) {
  if (!fs.existsSync(customCommandsDir)) return;
  if (customCommandsCache.size > 0) return; 
  
  try {
    const files = await fs.promises.readdir(customCommandsDir);
    for (const file of files.filter(f => f.endsWith('.js'))) {
      const filePath = path.join(customCommandsDir, file);
      try {
        const mod = await import(`file://${filePath}?t=${Date.now()}`);
        customCommandsCache.set(file, mod.default || mod); 
      } catch (e) {
        console.log(`Error loading custom command ${file}: ${e.message}`);
      }
    }
  } catch (e) {
    console.error(`Error loading custom commands directory: ${e.message}`);
  }
}

function isRecentParticipantEvent(groupId, participant, action) {
  const key = `${groupId}-${participant}-${action}`;
  const now = Date.now();
  
  if (recentParticipantEvents.has(key)) {
    const lastTime = recentParticipantEvents.get(key);
    if (now - lastTime < 5000) {
      return true;
    }
  }
  
  if (recentParticipantEvents.size >= MAX_CACHE_SIZE) {
    const firstKey = recentParticipantEvents.keys().next().value;
    recentParticipantEvents.delete(firstKey);
  }
  
  recentParticipantEvents.set(key, now);
  return false;
}

function logError(e, plugin = 'general') {
  console.log(chalk.red(`\n💥 Error in: ${chalk.yellow(plugin)}`));
  console.log(chalk.red(`📍 ${chalk.white(e?.message || e?.toString() || 'Unknown error')}`));
}

let mconn;
const { proto } = (await import("@whiskeysockets/baileys")).default;

function cleanupCache(cache, ttl, name = 'cache') {
  const now = Date.now();
  let cleaned = 0;
  const maxSize = MAX_CACHE_SIZE;
  
  if (cache.size > maxSize) {
    const deleteCount = cache.size - maxSize;
    const keys = Array.from(cache.keys()).slice(0, deleteCount);
    keys.forEach(key => cache.delete(key));
    cleaned += deleteCount;
  }
  
  for (const [key, value] of cache.entries()) {
    const timestamp = value?.timestamp || value;
    if ((now - timestamp) > ttl) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(chalk.gray(`⚡ Limpieza de ${name}: ${cleaned} entradas eliminadas`));
  }
}

setInterval(() => {
  cleanupCache(groupCache, CACHE_TTL, 'groupCache');
  cleanupCache(recentMessages, DUPLICATE_TIMEOUT, 'recentMessages');
  cleanupCache(recentParticipantEvents, 3000, 'participantEvents');
  cleanupCache(translationsCache, 20 * 60 * 1000, 'translationsCache');
  cleanupCache(customCommandsCache, 30 * 60 * 1000, 'customCommandsCache');
  
  if (processedVoiceMessages.size > MAX_CACHE_SIZE / 2) {
    processedVoiceMessages.clear();
  }
}, 30000);

function matchPrefix(text, prefix) {
  if (!text) return null;
  
  const prefixes = prefix instanceof RegExp
    ? [[prefix.exec(text), prefix]]
    : Array.isArray(prefix)
      ? prefix.map((p) => {
          const re = p instanceof RegExp ? p : new RegExp(str2Regex(p));
          return [re.exec(text), re];
        })
      : typeof prefix === 'string'
        ? [[new RegExp(str2Regex(prefix)).exec(text), new RegExp(str2Regex(prefix))]]
        : [[[], new RegExp]];

  return prefixes.find((p) => p[1])?.[0]?.[0] || null;
}

async function ensureUserData(sender, chat) {
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

async function ensureBotSettings(botJid) {
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

function extractMessageText(m) {
  return (
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    m.message?.buttonsResponseMessage?.selectedButtonId ||
    m.message?.templateButtonReplyMessage?.selectedId ||
    m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
}

export async function handler(chatUpdate) {
  try {
    if (this.setMaxListeners) this.setMaxListeners(25);
    this.msgqueque = this.msgqueque || [];
    this.uptime = this.uptime || Date.now();
    
    if (!chatUpdate?.messages?.length) return;

    this.pushMessage(chatUpdate.messages).catch(console.error);

    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!m?.message || typeof m !== 'object') return;
    if (m.key?.remoteJid?.endsWith('broadcast')) return;
    if (m.key?.id && isDuplicate(m.key.id, m.key.participant || m.key.remoteJid, extractMessageText(m))) return;
    if (m.isBaileys && !m.message?.audioMessage) return;

    const sender = m.key?.fromMe ? this.user.jid : (m.key?.participant || m.participant || m.key?.remoteJid || '');
    const chat = m.key?.remoteJid || '';

    if (!sender || !chat) return;

    m.text = extractMessageText(m);
    if (typeof m.text !== 'string') m.text = '';

    if (isVoiceMessage(m)) {
      const jid = m.key.remoteJid;
      const settings = global.db?.data?.settings?.[this?.user?.jid];
      if (settings?.iaLunaActive !== false) {
        await handleVoiceMessage(this, m, jid, processedVoiceMessages).catch(e => 
          console.error(`Voice message error: ${e.message}`)
        );
        return;
      }
    }

    if (!global.db.data) await global.loadDatabase?.();
    if (!global.chatgpt.data) await global.loadChatgptDB?.();

    for (const name in global.plugins) {
      const plugin = global.plugins[name];
      if (!plugin?.before || typeof plugin.before !== 'function') continue;
      try {
        if (!m?.sender) continue;
        const isOwner = Array.isArray(global.owner) ? global.owner.some(([num]) => m.sender?.includes(num)) : false;
        const stop = await plugin.before.call(this, m, {
          conn: this,
          isOwner,
          isROwner: isOwner,
          chatUpdate
        });
        if (stop) return;
      } catch (e) {
        console.error(`Error in before hook (${name}): ${e.message}`);
      }
    }

    try {
      m = smsg(this, m) || m;
      if (!m) return;

      global.mconn = m;
      mconn = m;
      m.exp = 0;
      m.money = false;
      m.limit = false;

      await ensureUserData(sender, chat);
      await ensureBotSettings(this.user.jid);

      if (!global.chatgpt.data.users[sender]) {
        global.chatgpt.data.users[sender] = [];
      }

      const idioma = global.db.data.users[sender]?.language || global.defaultLenguaje;
      const _translate = await loadTranslation(idioma);
      const tradutor = _translate.handler?.handler || {};

      if (opts['nyimak'] || (!m.fromMe && opts['self']) || (opts['pconly'] && m.chat.endsWith('g.us')) || (opts['gconly'] && !m.chat.endsWith('g.us')) || (opts['swonly'] && m.chat !== 'status@broadcast')) return;


      if (m.message?.buttonsResponseMessage?.selectedButtonId) {
        m.text = m.message.buttonsResponseMessage.selectedButtonId;
      } else if (m.message?.templateButtonReplyMessage?.selectedId) {
        m.text = m.message.templateButtonReplyMessage.selectedId;
      } else if (m.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        m.text = m.message.listResponseMessage.singleSelectReply.selectedRowId;
      } else if (m.message?.interactiveResponseMessage?.nativeFlowResponseMessage) {
        try {
          const id = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id;
          if (id) m.text = id;
        } catch (e) {
          console.error(`Error parsing interactive response: ${e.message}`);
        }
      }

      const senderJid = this.decodeJid(m.sender || '');
      const senderNum = senderJid.replace(/[^0-9]/g, '');
      const ownerNums = global.owner.map(([num]) => num);
      const lidNums = global.lidOwners || [];

      const isROwner = ownerNums.includes(senderNum) || lidNums.includes(senderNum);
      const isOwner = isROwner || m.fromMe;
      const isMods = isOwner || global.mods?.map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')?.includes(m.sender);
      const isPrems = isROwner || isOwner || isMods || global.db.data.users[m.sender]?.premiumTime > 0;

      if (opts['queque'] && m.text && !(isMods || isPrems)) {
        const queque = this.msgqueque;
        const time = 1000 * 5;
        const previousID = queque[queque.length - 1];
        queque.push(m.id || m.key.id);
        setInterval(async function () {
          if (queque.indexOf(previousID) === -1) clearInterval(this);
          await delay(time);
        }, time);
      }

      if (m.isBaileys && !m.message?.audioMessage) return;
      m.exp += Math.ceil(Math.random() * 10);

     const globalPrefix = this.prefix || global.prefix;
const usedPrefix = matchPrefix(m.text, globalPrefix);
const sinPrefijoActivo = getSinPrefijo(m.chat);
const isCommandText = usedPrefix || (sinPrefijoActivo && m.text?.length > 0);

const isStickerMessage = m.message?.stickerMessage || (m.quoted && m.quoted.mtype === 'stickerMessage');
const hasCommandSticker = isStickerMessage && global.db.data.sticker && Object.keys(global.db.data.sticker).length > 0;

if (m.isGroup && !isCommandText && !hasCommandSticker) {
  return;
}

let groupMetadata = {};
let participants = [];
let isAdmin = false;
let isRAdmin = false;
let isBotAdmin = false;
let userGroup = {};
let botGroup = {};

if (m.isGroup) {
  const groupData = await getGroupMetadata(this, m.chat, groupCache, m.sender);
  groupMetadata = groupData.groupMetadata;
  participants = groupData.participants;
  userGroup = groupData.userGroup;
  botGroup = groupData.botGroup;
  isAdmin = groupData.isAdmin;
  isRAdmin = groupData.isRAdmin;
  isBotAdmin = groupData.isBotAdmin;
}

      const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');
      const customCommandsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), './custom-commands');

      const allPlugins = { ...global.plugins };
await loadCustomCommandsOnce(customCommandsDir);

for (const [file, plugin] of customCommandsCache.entries()) {
  allPlugins[`custom-${file}`] = plugin;
}

      for (const name in allPlugins) {
        const plugin = allPlugins[name];
        if (!plugin || plugin.disabled) continue;

        if (global.__modogruposBlock?.has?.(m.chat)) {
          const senderNum = (m.sender || '').split('@')[0].replace(/\D/g, '');
          const owners = (global.owner || []).map(o => {
            const num = Array.isArray(o) ? o[0] : o;
            return String(num || '').replace(/\D/g, '');
          }).filter(Boolean);
          const lidOwners = (global.lidOwners || []).map(x => String(x || '').replace(/\D/g, '')).filter(Boolean);
          const allOwnersNum = [...owners, ...lidOwners];
          if (!allOwnersNum.includes(senderNum)) continue;
        }

        const __filename = name.startsWith('custom-') 
          ? join(customCommandsDir, name.replace('custom-', '')) 
          : join(___dirname, name);

        if (typeof plugin.all === 'function') {
          try {
            await plugin.all.call(this, m, {
              conn: this,
              chatUpdate,
              __dirname: name.startsWith('custom-') ? customCommandsDir : ___dirname,
              __filename
            });
          } catch (e) {
            logError(e, name);
          }
        }

        if (!opts['restrict'] && plugin.tags?.includes('admin')) continue;

        const _prefix = plugin.customPrefix || this.prefix || global.prefix;
        const prefixUsed = matchPrefix(m.text, _prefix);

        if (typeof plugin.before === 'function') {
          try {
            if (await plugin.before.call(this, m, {
              match: [prefixUsed],
              conn: this,
              participants,
              groupMetadata,
              user: {},
              bot: {},
              isROwner,
              isOwner,
              isRAdmin,
              isAdmin,
              isBotAdmin,
              isPrems,
              chatUpdate,
              __dirname: name.startsWith('custom-') ? customCommandsDir : ___dirname,
              __filename
            })) continue;
          } catch (e) {
            console.error(`Error in before hook: ${e.message}`);
          }
        }

        if (typeof plugin !== 'function') continue;

        if (sinPrefijoActivo && m.commandSinPrefijo) {
          const cmdSin = m.commandSinPrefijo;
          const matchSin = (
            plugin.command instanceof RegExp
              ? plugin.command.test(cmdSin)
              : Array.isArray(plugin.command)
                ? plugin.command.includes(cmdSin)
                : typeof plugin.command === 'string'
                  ? plugin.command === cmdSin
                  : false
          );

          if (matchSin) {
            m.plugin = name;
            const extra = {
              match: null,
              usedPrefix: '',
              noPrefix: m.text,
              args: m.argsSinPrefijo,
              command: cmdSin,
              text: m.textoSinPrefijo,
              conn: this,
              participants,
              groupMetadata,
              isROwner,
              isOwner,
              isAdmin,
              isBotAdmin,
              isPrems,
              chatUpdate,
              __dirname: name.startsWith('custom-') ? customCommandsDir : ___dirname,
              __filename
            };

            try {
              await plugin.call(this, m, extra);
            } catch (e) {
              m.error = e;
              logError(e, name);
            }
            break;
          }
        }

        if (prefixUsed) {
          const noPrefix = m.text.replace(prefixUsed, '');
          let [command, ...args] = noPrefix.trim().split` `.filter((v) => v);
          args = args || [];
          const _args = noPrefix.trim().split` `.slice(1);
          const text = _args.join` `;
          command = (command || '').toLowerCase();

          const fail = plugin.fail || global.dfail;
          const isAccept = plugin.command instanceof RegExp
            ? plugin.command.test(command)
            : Array.isArray(plugin.command)
              ? plugin.command.some((cmd) => cmd instanceof RegExp ? cmd.test(command) : cmd === command)
              : typeof plugin.command === 'string'
                ? plugin.command === command
                : false;

          if (!isAccept) continue;

          m.plugin = name;
          updateLastCommand({ text: m.text, plugin: m.plugin, sender: m.sender });

          if (this.user?.jid) {
            this.sendPresenceUpdate('composing', m.chat).catch(() => {});
          }

          const chat = global.db.data.chats[m.chat] || getConfig(m.chat);
          const user = global.db.data.users[m.sender] || {};
          const botSpam = global.db.data.settings[this.user.jid] || {};

          if (chat?.isBanned && !isROwner && !['owner-unbanchat.js', 'info-creator.js'].includes(name)) {
            continue;
          }

          if (user?.banned && !isROwner) {
            user.bannedMessageCount = user.bannedMessageCount || 0;
            if (user.bannedMessageCount < 3) {
              const messageNumber = user.bannedMessageCount + 1;
              const messageText = `${tradutor.texto1?.[0] || 'You are banned'}\n${tradutor.texto1?.[1] || 'Message'} ${messageNumber}/3\n${user.bannedReason ? `${tradutor.texto1?.[2] || 'Reason'}: ${user.bannedReason}` : `${tradutor.texto1?.[3] || 'No reason'}`}\n${tradutor.texto1?.[4] || 'Contact support'}`.trim();
              m.reply(messageText);
              user.bannedMessageCount++;
            } else if (user.bannedMessageCount === 3) {
              user.bannedMessageSent = true;
            } else {
              continue;
            }
            continue;
          }

          if (botSpam?.antispam && user?.lastCommandTime && (Date.now() - user.lastCommandTime) < 5000 && !isROwner) {
            user.commandCount = (user.commandCount || 0) + 1;
            if (user.commandCount >= 2) {
              const remainingTime = Math.ceil((user.lastCommandTime + 5000 - Date.now()) / 1000);
              if (remainingTime > 0) {
                const messageText = `*[⏱️] Wait* _${remainingTime} seconds_ *before using another command.*`;
                m.reply(messageText);
                continue;
              } else {
                user.commandCount = 0;
              }
            }
          } else {
            user.lastCommandTime = Date.now();
            user.commandCount = 1;
          }

          const adminMode = chat?.modoadmin;
          if (adminMode && !isOwner && !isROwner && m.isGroup && !isAdmin && (plugin.admin || plugin.botAdmin || plugin.group)) {
            continue;
          }

          if (plugin.rowner && !isROwner) {
            fail('rowner', m, this);
            continue;
          }
          if (plugin.owner && !isOwner) {
            fail('owner', m, this);
            continue;
          }
          if (plugin.mods && !isMods) {
            fail('mods', m, this);
            continue;
          }
          if (plugin.premium && !isPrems) {
            fail('premium', m, this);
            continue;
          }
          if (plugin.group && !m.isGroup) {
            fail('group', m, this);
            continue;
          }
          if (plugin.botAdmin && !isBotAdmin) {
            fail('botAdmin', m, this);
            continue;
          }
          if (plugin.admin && !isAdmin) {
            fail('admin', m, this);
            continue;
          }
          if (plugin.private && m.isGroup) {
            fail('private', m, this);
            continue;
          }
          if (plugin.register && !user?.registered) {
            fail('unreg', m, this);
            continue;
          }

          m.isCommand = true;
          const xp = 'exp' in plugin ? parseInt(plugin.exp) : 17;
          if (xp > 200) {
            m.reply('Ngecit -_-');
          } else {
            m.exp += xp;
          }

          if (!isPrems && plugin.limit && global.db.data.users[m.sender]?.limit < plugin.limit) {
            m.reply(`${tradutor.texto2 || 'Limit exceeded'} _${this.prefix}buyall_`);
            continue;
          }
          if (plugin.level > user?.level) {
            m.reply(`${tradutor.texto3?.[0] || 'Level'} ${plugin.level} ${tradutor.texto3?.[1] || 'required'} ${user?.level || 0}, ${tradutor.texto3?.[2] || 'Use'} ${this.prefix}lvl ${tradutor.texto3?.[3] || 'to upgrade'}`);
            continue;
          }

          const extra = {
            match: [prefixUsed],
            usedPrefix: prefixUsed,
            noPrefix,
            _args,
            args,
            command,
            text,
            conn: this,
            participants,
            groupMetadata,
            user,
            bot: {},
            isROwner,
            isOwner,
            isRAdmin,
            isAdmin,
            isBotAdmin,
            isPrems,
            chatUpdate,
            __dirname: name.startsWith('custom-') ? customCommandsDir : ___dirname,
            __filename
          };

          try {
            await plugin.call(this, m, extra);
            if (!isPrems) {
              m.limit = m.limit || plugin.limit || false;
            }
          } catch (e) {
            m.error = e;
            logError(e, m?.plugin || 'handler');
            if (e) {
              let text = format(e);
              for (const key of Object.values(global.APIKeys || {})) {
                text = text.replace(new RegExp(key, 'g'), '#HIDDEN#');
              }
              await m.reply(text).catch(() => {});
            }
          } finally {
            if (typeof plugin.after === 'function') {
              try {
                await plugin.after.call(this, m, extra);
              } catch (e) {
                logError(e, m?.plugin || 'handler');
              }
            }
            if (m.limit) {
              m.reply(`${tradutor.texto4?.[0] || 'Limit used'} ${m.limit} ${tradutor.texto4?.[1] || 'times'}`);
            }
          }
          break;
        }
      }
    } catch (e) {
      logError(e, m?.plugin || 'handler');
    } finally {
      if (opts['queque'] && m.text) {
        const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id);
        if (quequeIndex !== -1) {
          this.msgqueque.splice(quequeIndex, 1);
        }
      }

      try {
        if (m?.sender) {
          const user = getUserStats(m.sender);
          if (m.exp) addExp(m.sender, m.exp);
          if (typeof m.limit === 'number') {
            user.limit = (user.limit ?? 10) - m.limit;
            setUserStats(m.sender, user);
          }
        }

        if (m?.plugin) {
          const stats = global.db.data.stats ?? {};
          const now = Date.now();
          if (!(m.plugin in stats)) {
            stats[m.plugin] = { total: 0, success: 0, last: 0, lastSuccess: 0 };
          }
          const stat = stats[m.plugin];
          stat.total = (stat.total ?? 0) + 1;
          stat.last = now;
          if (m.error == null) {
            stat.success = (stat.success ?? 0) + 1;
            stat.lastSuccess = now;
          }
          global.db.data.stats = stats;
        }
      } catch (e) {
        console.error(`Error updating stats: ${e.message}`);
      }

      try {
        if (!opts['noprint']) {
          const printModule = await import('./src/libraries/print.js');
          await printModule.default?.(m, this);
        }
      } catch (e) {
        console.log(`Print error:`, e.message);
      }

      const settingsREAD = global.db.data.settings[this.user.jid] || {};
      if (opts['autoread'] || settingsREAD?.autoread2) {
        this.readMessages([m.key]).catch(() => {});
      }
    }
  } catch (e) {
    logError(e, 'main_handler');
  }
}

export async function participantsUpdate({ id, participants, action }) {
  try {
    const idioma = global?.db?.data?.chats[id]?.language || global.defaultLenguaje;
    const _translate = await loadTranslation(idioma);
    const tradutor = _translate.handler.participantsUpdate;

    await handleParticipantsUpdate(
      mconn,
      id,
      participants,
      action,
      global.loadDatabase,
      getConfig,
      global.db,
      idioma,
      tradutor,
      opts,
      groupCache
    );
  } catch (e) {
    console.error('participantsUpdate:', e.message);
  }
}
export async function groupsUpdate(groupsUpdate) {
  try {
    if (opts['self'] || !global.db.data || !mconn?.conn) return;

    const idioma = global.db.data.chats[groupsUpdate[0]?.id]?.language || global.defaultLenguaje;
    const _translate = await loadTranslation(idioma);
    const tradutor = _translate.handler?.participantsUpdate || {};

    for (const groupUpdate of groupsUpdate) {
      try {
        const { id, desc, subject, icon, revoke } = groupUpdate;
        if (!id) continue;

        groupCache.delete(id);
        const chats = global.db.data.chats[id];
        if (!chats?.detect) continue;

        let text = '';
        if (desc) text = (chats?.sDesc || tradutor.texto5 || 'Description changed').replace('@desc', desc);
        else if (subject) text = (chats?.sSubject || tradutor.texto6 || 'Subject changed').replace('@subject', subject);
        else if (icon) text = (chats?.sIcon || tradutor.texto7 || 'Icon changed').replace('@icon', icon);
        else if (revoke) text = (chats?.sRevoke || tradutor.texto8 || 'Link revoked').replace('@revoke', revoke);

        if (text) {
          await mconn?.conn?.sendMessage(id, { text, mentions: mconn?.conn?.parseMention(text) }).catch(e => 
            console.error(`Error sending group update: ${e.message}`)
          );
        }
      } catch (e) {
        console.error(`Error processing group update: ${e.message}`);
      }
    }
  } catch (e) {
    console.error(`Groups update error: ${e.message}`);
  }
}

export async function callUpdate(callUpdate) {
  try {
    const isAnticall = global?.db?.data?.settings[mconn?.conn?.user?.jid]?.antiCall;
    if (!isAnticall || !mconn?.conn) return;

    for (const nk of callUpdate) {
      try {
        if (!nk.isGroup && nk.status === 'offer') {
          const msg = `Hello *@${nk.from.split('@')[0]}*, ${nk.isVideo ? 'video calls' : 'calls'} are not allowed. You will be blocked.\nContact my creator for unblock.`;
          const callmsg = await mconn?.conn?.reply(nk.from, msg, false, { mentions: [nk.from] });

          await mconn.conn.updateBlockStatus(nk.from, 'block');
        }
      } catch (e) {
        console.error(`Error handling call: ${e.message}`);
      }
    }
  } catch (e) {
    console.error(`Call update error: ${e.message}`);
  }
}

export async function deleteUpdate(message) {
  try {
    const { fromMe, id, participant } = message;
    if (fromMe || !mconn?.conn || !global.db) return;

    const idioma = global.db.data.users[participant]?.language || global.defaultLenguaje || 'es';
    const _translate = await loadTranslation(idioma);
    const tradutor = _translate.handler?.deleteUpdate || {};

    let d = new Date(Date.now() + 3600000);
    let date = d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
    let time = d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

    let msg = mconn.conn.serializeM(mconn.conn.loadMessage(id));
    if (!msg?.chat || !msg?.isGroup) return;

    let chat = global.db.data.chats[msg.chat] || {};
    if (!chat?.antidelete) return;

    const antideleteMessage = `${tradutor.texto1?.[0] || '📄 Message deleted'}\n${tradutor.texto1?.[1] || 'By'}: @${participant.split('@')[0]}\n${tradutor.texto1?.[2] || 'Time'}: ${time}\n${tradutor.texto1?.[3] || 'Date'}: ${date}`.trim();

    await mconn.conn.sendMessage(msg.chat, { text: antideleteMessage, mentions: [mconn.conn.decodeJid(participant)] }, { quoted: msg }).catch(e => 
      console.error(`Error sending antidelete message: ${e.message}`)
    );

    await mconn.conn.copyNForward(msg.chat, msg).catch(e => 
      console.error(`Error forwarding message: ${e.message}`)
    );
  } catch (e) {
    console.error(`Delete update error: ${e.message}`);
  }
}

global.dfail = async (type, m, conn) => {
  try {
    const datas = global;
    const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
    const _translate = await loadTranslation(idioma);
    const tradutor = _translate.handler?.dfail || {};

    const msg = {
      rowner: tradutor.texto1,
      owner: tradutor.texto2,
      mods: tradutor.texto3,
      premium: tradutor.texto4,
      group: tradutor.texto5,
      private: tradutor.texto6,
      admin: tradutor.texto7,
      botAdmin: tradutor.texto8,
      unreg: tradutor.texto9,
      restrict: tradutor.texto10
    }[type];

    if (msg) {
      const aa = { quoted: m, userJid: conn.user.jid };
      const prep = generateWAMessageFromContent(m.chat, { extendedTextMessage: { text: msg, contextInfo: { externalAdReply: { title: tradutor.texto11?.[0], body: tradutor.texto11?.[1], thumbnail: global.imagen1, sourceUrl: tradutor.texto11?.[2] } } } }, aa);
      await conn.relayMessage(m.chat, prep.message, { messageId: prep.key.id }).catch(e => 
        console.error(`Error sending fail message: ${e.message}`)
      );
    }
  } catch (e) {
    console.error(`Dfail error: ${e.message}`);
  }
};

const file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
  unwatchFile(file);
  console.log(chalk.redBright('Update handler.js'));
  if (global.reloadHandler) {
    const result = await global.reloadHandler().catch(e => console.error(`Reload error: ${e.message}`));
    if (result) console.log(result);
  }

  if (global.conns?.length > 0) {
    const users = [...new Set(global.conns.filter((conn) => conn?.user && conn?.ws?.socket?.readyState !== ws.CLOSED))];
    for (const userr of users) {
      userr.subreloadHandler?.(false).catch(e => console.error(`Subreload error: ${e.message}`));
    }
  }
});

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || reason?.toString() || 'Unknown error';
  if (msg.includes('Unsupported state') || msg.includes('unable to authenticate')) {
    console.log('🛑 Critical Baileys error: Restart bot or scan QR again.');
  } else {
    console.error('🛠️ Unhandled rejection:', msg);
  }
});

process.on('uncaughtException', (err) => {
  const msg = err?.message || err?.toString() || 'Unknown error';
  if (msg.includes('Unsupported state') || msg.includes('unable to authenticate')) {
    console.log('🔱 Critical Baileys error: Restart bot or scan QR again.');
  } else {
    console.error('⚠️ Uncaught exception:', msg);
  }
});