import { updateLastCommand } from './logBans.js';
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import { smsg } from './src/libraries/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import { unwatchFile, watchFile } from 'fs';
import fs from 'fs';
import chalk from 'chalk';
import ws from 'ws';
import { EventEmitter } from 'events';
import { isVoiceMessage, handleVoiceMessage } from './plugins/voice-handler.js';
import { getConfig } from './lib/funcConfig.js';
import { readFile } from 'fs/promises';
import { addExp, getUserStats, setUserStats } from './lib/stats.js';
import { getSinPrefijo } from './lib/sinPrefijo.js';
import { isValidMessage, isDuplicate, extractMessageText, extractSenderAndChat, normalizeMessageText } from './lib/funcion/messageValidation.js';
import { checkUserPermissions } from './lib/funcion/userPermissions.js';
import { matchPrefix, parseCommandWithPrefix, checkCommandAcceptance, parseCommandText } from './lib/funcion/commandParser.js';
import { ensureBotSettings } from './lib/funcion/databaseManager.js';
import { startCacheCleanupInterval } from './lib/funcion/cacheManager.js';
import { limitCache } from './lib/funcion/cacheLimit.js';
import { handleParticipantsUpdate } from './lib/funcion/groupMetadata.js';
import { invalidateGroupCount } from './src/libraries/print.js';
import { getGroupDataForPlugin } from './lib/funcion/pluginHelper.js';
import { registerLidToJid } from './lib/funcion/userManager.js';
import { gcIfNeeded } from './lib/gcHelper.js';
import { isProtectedOwner, resolveTargetForOwnerCheck } from './lib/funcion/ownerGuard.js';

EventEmitter.defaultMaxListeners = 30;

const groupCache = new Map();
const recentMessages = new Map();
const recentParticipantEvents = new Map();
const translationsCache = new Map();
const customCommandsCache = new Map();
const processedVoiceMessages = new Set();

const CACHE_TTL = 5 * 60 * 1000;
const DUPLICATE_TIMEOUT = 8000;
const MAX_CACHE_SIZE = 200;
const MAX_VOICE_CACHE = 200;

global.groupCache = groupCache;
global.translationsCache = translationsCache;
Object.defineProperty(global, 'BotName', {
  get: () => global.db?.data?.config?.botName || 'Luna-Botv6',
  set: (v) => { if (global.db?.data?.config) global.db.data.config.botName = v; },
  configurable: true
});

const isNumber = (x) => typeof x === 'number' && !isNaN(x);
const delay = (ms) => isNumber(ms) && new Promise((resolve) => setTimeout(() => resolve(), ms));

async function loadTranslation(idioma) {
  const cached = translationsCache.get(idioma);
  if (cached) return cached;
  try {
    const raw = await readFile(`./src/lunaidiomas/${idioma}.json`, 'utf8');
    const botName = global.BotName || 'Luna-Botv6';
    let patched = raw;
    if (botName !== 'Luna-Botv6') {
      const upper = botName.toUpperCase();
      patched = raw
        .replace(/Luna-Botv6-Project/g, botName)
        .replace(/Luna-Botv6/g, botName)
        .replace(/LUNA IA/g, `${upper} IA`)
        .replace(/Luna IA/g, `${botName} IA`);
    }
    const parsed = JSON.parse(patched);
    translationsCache.set(idioma, parsed);
    return parsed;
  } catch (e) {
    return {};
  }
}

global.loadTranslation = loadTranslation;
global.getIdioma = (m) => {
  if (m?.isGroup) return global.db?.data?.chats?.[m.chat]?.language || global.defaultLenguaje || 'es';
  return global.db?.data?.users?.[m?.sender]?.language || global.defaultLenguaje || 'es';
};

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
        console.log(`Error al cargar comando personalizado ${file}: ${e.message}`);
      }
    }
  } catch (e) {}
}

function logError(e, plugin = 'general') {
  console.log(chalk.red(`\n💥 Error en: ${chalk.yellow(plugin)}`));
  console.log(chalk.red(`📄 ${chalk.white(e?.message || e?.toString() || 'Error desconocido')}`));
}

let mconn;
let currentConn;

startCacheCleanupInterval(groupCache, recentMessages, recentParticipantEvents, translationsCache, customCommandsCache, processedVoiceMessages, CACHE_TTL, DUPLICATE_TIMEOUT);

setInterval(() => {
  try {
    limitCache(groupCache, 100);
    limitCache(recentMessages, 200);
    limitCache(recentParticipantEvents, 30);
    limitCache(translationsCache, 5);
    if (processedVoiceMessages.size > MAX_VOICE_CACHE) {
      const toDelete = Array.from(processedVoiceMessages).slice(0, 100);
      toDelete.forEach(id => processedVoiceMessages.delete(id));
    }
    gcIfNeeded('intervalo-60s');
  } catch (e) {}
}, 60000);

export async function handler(chatUpdate) {
  try {
    if (!this?.user?.jid) return;
    currentConn = this;
    if (!this._sendMessagePatched) {
      const _origSend = this.sendMessage.bind(this);
      this.sendMessage = async (jid, content, options) => {
        const name = global.BotName;
        if (name && name !== 'Luna-Botv6') {
          const _applyName = (str) => str
            .replace(/Luna-Botv6-Project/gi, name)
            .replace(/LUNA BOT MENU/gi, `${name.toUpperCase()} MENU`)
            .replace(/LUNA BOT/gi, name.toUpperCase())
            .replace(/Luna-Botv6/gi, name)
            .replace(/LunaBot/gi, name.replace(/[^a-zA-Z0-9]/g, ''));
          if (typeof content?.text === 'string') content = { ...content, text: _applyName(content.text) };
          if (typeof content?.caption === 'string') content = { ...content, caption: _applyName(content.caption) };
          if (typeof content?.buttonText === 'string') content = { ...content, buttonText: _applyName(content.buttonText) };
          if (Array.isArray(content?.sections)) content = { ...content, sections: JSON.parse(_applyName(JSON.stringify(content.sections))) };
        }
        return _origSend(jid, content, options);
      };
      this._sendMessagePatched = true;
    }
    this.msgqueque = this.msgqueque || [];
    this.uptime = this.uptime || Date.now();

    if (!chatUpdate?.messages?.length) return;

    const connectionTime = Math.min(global.timestamp?.connect?.getTime() || Date.now(), Date.now());
    const TIMESTAMP_TOLERANCE_MS = 30000;
    const validMessages = chatUpdate.messages.filter(msg => {
      const msgTimestamp = (msg.messageTimestamp || 0) * 1000;
      return msgTimestamp >= (connectionTime - TIMESTAMP_TOLERANCE_MS);
    });
    if (validMessages.length === 0) return;
    chatUpdate.messages = validMessages;

    this.pushMessage(chatUpdate.messages).catch(console.error);

    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!isValidMessage(m)) return;
    if (m.key?.id && isDuplicate(m.key.id, m.key.participant || m.key.remoteJid, extractMessageText(m), recentMessages, DUPLICATE_TIMEOUT, MAX_CACHE_SIZE)) return;

    let { sender, chat } = extractSenderAndChat(m, this);
    if (!sender || !chat) return;

    const _muteDB = global.db?.data?.mutes || {};
    const _senderNum = sender.replace(/[^0-9]/g, '');
    const _muteEntry = Object.entries(_muteDB).find(([k, v]) => {
      if (!k.startsWith(chat + '_')) return false;
      if (!k.replace(/[^0-9]/g, '').includes(_senderNum)) return false;
      if (v?.until && Date.now() > v.until) return false;
      return true;
    });
    if (_muteEntry) {
      const _ownerNums = (global.owner || []).map(o => String(Array.isArray(o) ? o[0] : o));
      const _lidOwners = (global.lidOwners || []).map(x => String(x));
      const _isOwner = _ownerNums.some(n => sender.includes(n)) || _lidOwners.some(n => sender.includes(n));
      if (!_isOwner) {
        const _cachedForDel = global.groupCache?.get(chat);
        const _botJid = this.user?.jid ? this.decodeJid(this.user.jid) : '';
        const _botIsAdmin = _cachedForDel?.data?.participants?.some(p => p.id === _botJid && p.admin) ?? false;
        if (_botIsAdmin) this.sendMessage(chat, { delete: m.key }).catch(() => {});
        if (!global._muteWarnings) global._muteWarnings = new Map();
        const _warnKey = chat + '_' + _senderNum;
        const _now = Date.now();
        const _RESET = 60 * 1000;
        const _SILENT = 3;
        const _MAX = 3;
        let _warnEntry = null;
        for (const [k, v] of global._muteWarnings.entries()) {
          if (k.startsWith(chat + '_') && k.replace(/[^0-9]/g, '') === (chat + _senderNum).replace(/[^0-9]/g, '')) {
            _warnEntry = { key: k, val: v };
            break;
          }
        }
        if (!_warnEntry || _now - _warnEntry.val.lastMsg > _RESET) {
          global._muteWarnings.set(_warnKey, { count: 1, lastMsg: _now });
        } else {
          _warnEntry.val.count++;
          _warnEntry.val.lastMsg = _now;
        }
        const _count = _warnEntry ? _warnEntry.val.count : 1;
        if (_count > _SILENT) {
          const _warnNum = _count - _SILENT;
          const _phone = sender.split('@')[0];
          const _lang = global.db?.data?.chats?.[chat]?.language || global.defaultLenguaje || 'es';
          let _tAnti = {};
          try { _tAnti = JSON.parse(fs.readFileSync('./src/lunaidiomas/' + _lang + '.json', 'utf8'))?.plugins?.anti_mute || {}; } catch {}
          const _w1 = _tAnti.warn1 || '\u{1F507} *@{user} est\u00e1s silenciado en este grupo.*\n\n\u26a0\ufe0f *Primera advertencia* \u2014 Tu mensaje fue eliminado.\n\u{1F4A1} Espera *1 minuto* sin escribir y la advertencia se cancela autom\u00e1ticamente.\nSi segu\u00eds escribiendo recibir\u00e1s m\u00e1s advertencias y ser\u00e1s expulsado.';
          const _w2 = _tAnti.warn2 || '\u{1F507} *@{user} segunda advertencia.*\n\n\u26a0\ufe0f Seguiste escribiendo estando silenciado. Tu mensaje fue eliminado.\n\u2757 *Una advertencia m\u00e1s y ser\u00e1s expulsado del grupo.*';
          const _wk = _tAnti.kick_msg || '\u{1F6AB} *@{user} fue expulsado del grupo.*\n\n\u{1F4CB} *Motivo:* Acumul\u00f3 3 advertencias por enviar mensajes estando silenciado.';
          if (_warnNum === 1) {
            this.sendMessage(chat, { text: _w1.replace('{user}', _phone), mentions: [sender] }).catch(() => {});
          } else if (_warnNum === 2) {
            this.sendMessage(chat, { text: _w2.replace('{user}', _phone), mentions: [sender] }).catch(() => {});
          } else if (_warnNum >= _MAX) {
            for (const [k] of global._muteWarnings.entries()) {
              if (k.startsWith(chat + '_') && k.replace(/[^0-9]/g, '') === (chat + _senderNum).replace(/[^0-9]/g, '')) {
                global._muteWarnings.delete(k); break;
              }
            }
            this.sendMessage(chat, { text: _wk.replace('{user}', _phone), mentions: [sender] }).catch(() => {});
            this.groupParticipantsUpdate(chat, [sender], 'remove').catch(() => {});
          }
        }
        return;
      }
    }

    m = normalizeMessageText(m);

    const globalPrefix = this.prefix || global.prefix;

    if (isVoiceMessage(m)) {
      const jid = m.key.remoteJid;
      const settings = global.db?.data?.settings?.[this?.user?.jid];
      if (settings?.iaLunaActive !== false) {
        await handleVoiceMessage(this, m, jid, processedVoiceMessages).catch(e =>
          console.error(`Error en mensaje de voz: ${e.message}`)
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
        const { isOwner } = checkUserPermissions(m, this);
        const stop = await plugin.before.call(this, m, {
          conn: this,
          isOwner,
          isROwner: isOwner,
          chatUpdate
        });
        if (stop) return;
      } catch (e) {}
    }

    try {
      m = smsg(this, m) || m;
      if (!m) return;

      global.mconn = m;
      mconn = m;
      m.exp = 0;
      m.money = false;
      m.limit = false;

      if (m.isGroup && sender.includes('@lid')) {
        const _cachedGrp = global.groupCache?.get(chat);
        if (_cachedGrp?.data?.participants) {
          const _lidNum = sender.replace(/[^0-9]/g, '');
          const _match = _cachedGrp.data.participants.find(p => p.lid && p.lid.replace(/[^0-9]/g, '') === _lidNum);
          if (_match?.id) {
            registerLidToJid(sender, _match.id);
            sender = _match.id;
          }
        }
      }

      await ensureBotSettings(this.user.jid);

      if (!global.chatgpt.data.users[sender]) {
        global.chatgpt.data.users[sender] = [];
      }

      const idioma = (m.isGroup ? global.db.data.chats?.[chat]?.language : global.db.data.users[sender]?.language) || global.defaultLenguaje;
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
        } catch (e) {}
      } else {
        const isMentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(this.user.jid);
        const isQuotedMention = m.message?.extendedTextMessage?.contextInfo?.participant === this.user.jid;
        if (isMentioned || isQuotedMention) {
          m.isMentionedBot = true;
        }
      }

      if (typeof m.text !== 'string') m.text = '';

      const { isROwner, isOwner, isMods, isPrems } = checkUserPermissions(m, this);

      if (opts['queque'] && m.text && !(isMods || isPrems)) {
        const queque = this.msgqueque;
        const time = 1000 * 5;
        const previousID = queque[queque.length - 1];
        queque.push(m.id || m.key.id);
        const _interval = setInterval(function () {
          if (queque.indexOf(previousID) === -1) clearInterval(_interval);
        }, time);
      }

      if (m.isBaileys && !m.message?.audioMessage) return;
      m.exp += Math.ceil(Math.random() * 10);

      const { usedPrefix, sinPrefijoActivo } = parseCommandText(m, globalPrefix, getSinPrefijo);

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
              participants: [],
              groupMetadata: {},
              user: {},
              bot: {},
              isROwner,
              isOwner,
              isRAdmin: false,
              isAdmin: false,
              isBotAdmin: false,
              isPrems,
              chatUpdate,
              __dirname: name.startsWith('custom-') ? customCommandsDir : ___dirname,
              __filename
            })) continue;
          } catch (e) {}
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
            updateLastCommand({ text: m.text, plugin: m.plugin, sender: m.sender, chat: m.chat });
            const extra = {
              match: null,
              usedPrefix: '',
              noPrefix: m.text,
              args: m.argsSinPrefijo,
              command: cmdSin,
              text: m.textoSinPrefijo,
              conn: this,
              participants: [],
              groupMetadata: {},
              isROwner,
              isOwner,
              isAdmin: false,
              isBotAdmin: false,
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
          const { command, args, _args, text, noPrefix } = parseCommandWithPrefix(m.text, prefixUsed);

          const fail = plugin.fail || global.dfail;
          const isAccept = checkCommandAcceptance(plugin, command);

          if (!isAccept) continue;

          m.plugin = name;
          updateLastCommand({ text: m.text, plugin: m.plugin, sender: m.sender, chat: m.chat });
          global._lastCmd = command;
          if (this.user?.jid) {
            if (!global._presenceCooldown) global._presenceCooldown = new Map();
            const _lastPresence = global._presenceCooldown.get(m.chat) || 0;
            if (Date.now() - _lastPresence > 8000) {
              global._presenceCooldown.set(m.chat, Date.now());
              this.sendPresenceUpdate('composing', m.chat).catch(() => {});
            }
          }
          const chat = getConfig(m.chat);
          const user = global.db.data.users[m.sender] || {};
          const botSpam = global.db.data.settings[this.user.jid] || {};

          if (chat?.isBanned && !isROwner && !['owner-unbanchat.js', 'info-creator.js'].includes(name)) {
            continue;
          }

          if (user?.banned && !isROwner) {
            user.bannedMessageCount = user.bannedMessageCount || 0;
            if (user.bannedMessageCount < 3) {
              const messageNumber = user.bannedMessageCount + 1;
              const messageText = `${tradutor.texto1?.[0]}\n${tradutor.texto1?.[1]} ${messageNumber}/3\n${user.bannedReason ? `${tradutor.texto1?.[2]}: ${user.bannedReason}` : `${tradutor.texto1?.[3]}`}\n${tradutor.texto1?.[4]}`.trim();
              m.reply(messageText);
              user.bannedMessageCount++;
            } else if (user.bannedMessageCount === 3) {
              user.bannedMessageSent = true;
            }
            continue;
          }

          if (botSpam?.antispam && user?.lastCommandTime && (Date.now() - user.lastCommandTime) < 5000 && !isROwner) {
            user.commandCount = (user.commandCount || 0) + 1;
            if (user.commandCount >= 2) {
              const remainingTime = Math.ceil((user.lastCommandTime + 5000 - Date.now()) / 1000);
              if (remainingTime > 0) {
                m.reply(`*[⏱️]* _${remainingTime}s_ ${tradutor.antispam || ''}`);
                continue;
              } else {
                user.commandCount = 0;
              }
            }
          } else {
            user.lastCommandTime = Date.now();
            user.commandCount = 1;
          }

          let _isAdmin = false, _isBotAdmin = false, _isRAdmin = false, _groupDataResolved = false;

          if (m.isGroup && chat?.modoadmin && !isOwner && !isROwner) {
            let userIsAdmin = false;
            try {
              const groupData = await getGroupDataForPlugin(this, m.chat, m.sender);
              userIsAdmin        = groupData.isAdmin;
              _isAdmin           = groupData.isAdmin;
              _isBotAdmin        = groupData.isBotAdmin;
              _isRAdmin          = groupData.groupMetadata?.participants?.find(p => this.decodeJid(p.id) === this.decodeJid(m.sender))?.admin === 'superadmin';
              _groupDataResolved = true;
            } catch (e) {}
            if (!userIsAdmin) continue;
          }

          if (plugin.rowner && !isROwner) { fail('rowner', m, this); continue; }
          if (plugin.owner && !isOwner) { fail('owner', m, this); continue; }
          if (plugin.mods && !isMods) { fail('mods', m, this); continue; }
          if (plugin.premium && !isPrems) { fail('premium', m, this); continue; }
          if (plugin.group && !m.isGroup) { fail('group', m, this); continue; }
          if (plugin.private && m.isGroup) { fail('private', m, this); continue; }
          if (plugin.register && !user?.registered) { fail('unreg', m, this); continue; }

          if ((plugin.botAdmin || plugin.admin) && m.isGroup && !_groupDataResolved) {
            try {
              const _gd = await getGroupDataForPlugin(this, m.chat, m.sender);
              _isAdmin           = _gd.isAdmin;
              _isBotAdmin        = _gd.isBotAdmin;
              _groupDataResolved = true;
            } catch (e) {}
          }
          if (plugin.botAdmin && m.isGroup && !_isBotAdmin) { fail('botAdmin', m, this); continue; }
          if (plugin.admin && m.isGroup && !_isAdmin) { fail('admin', m, this); continue; }

          if (plugin.ownerProtect) {
            const _shouldProtect = typeof plugin.ownerProtect === 'function'
              ? plugin.ownerProtect(command)
              : true;
            if (_shouldProtect) {
              const _guardTarget = m.mentionedJid?.[0] || m.quoted?.sender || null;
              if (_guardTarget) {
                let _guardParticipants = [];
                if (m.isGroup) {
                  _guardParticipants = global.groupCache?.get(m.chat)?.data?.participants || [];
                  if (!_guardParticipants.length) {
                    try {
                      const _gd = await getGroupDataForPlugin(this, m.chat, m.sender);
                      _guardParticipants = _gd?.participants || [];
                    } catch (e) {}
                  }
                }
                const { jid: _gJid, phoneNumber: _gPhone } = resolveTargetForOwnerCheck(_guardTarget, _guardParticipants);
                if (isProtectedOwner(_gJid, _gPhone)) {
                  m.reply('🛡️ Ese es el owner, no puedo hacer eso 😅');
                  continue;
                }
              }
            }
          }

          m.isCommand = true;
          const xp = 'exp' in plugin ? parseInt(plugin.exp) : 17;
          if (xp > 200) {
            m.reply(tradutor.trampa || '');
          } else {
            m.exp += xp;
          }

          if (!isPrems && plugin.limit && global.db.data.users[m.sender]?.limit < plugin.limit) {
            m.reply(`${tradutor.texto2} _${this.prefix}buyall_`);
            continue;
          }
          if (plugin.level > user?.level) {
            m.reply(`${tradutor.texto3?.[0]} ${plugin.level} ${tradutor.texto3?.[1]} ${user?.level || 0}, ${tradutor.texto3?.[2]} ${this.prefix}lvl ${tradutor.texto3?.[3]}`);
            continue;
          }

          if (m.isGroup && !_groupDataResolved) {
            try {
              const _gd = await getGroupDataForPlugin(this, m.chat, m.sender);
              _isAdmin    = _gd.isAdmin;
              _isBotAdmin = _gd.isBotAdmin;
              _isRAdmin   = _gd.groupMetadata?.participants?.find(p => this.decodeJid(p.id) === this.decodeJid(m.sender))?.admin === 'superadmin';
            } catch (e) {}
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
            participants: [],
            groupMetadata: {},
            user,
            bot: {},
            isROwner,
            isOwner,
            isRAdmin: _isRAdmin,
            isAdmin: _isAdmin,
            isBotAdmin: _isBotAdmin,
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
                text = text.replace(new RegExp(key, 'g'), '#OCULTO#');
              }
              if (text && text.trim()) await m.reply(text).catch(() => {});
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
              m.reply(`${tradutor.texto4?.[0]} ${m.limit} ${tradutor.texto4?.[1]}`);
            }
            gcIfNeeded(m?.plugin || 'plugin');
          }
          break;
        }
      }
    } catch (e) {
      logError(e, m?.plugin || 'handler');
    } finally {
      if (opts['queque'] && m?.text) {
        const quequeIndex = this.msgqueque.indexOf(m.id || m.key?.id);
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
      } catch (e) {}

      try {
        const settingsREAD = global.db.data?.settings?.[this.user?.jid] || {};
        if (opts['autoread'] || settingsREAD?.autoread2) {
          if (m?.key) this.readMessages([m.key]).catch(() => {});
        }
      } catch (e) {}

      m = null;
    }
  } catch (e) {
    logError(e, 'main_handler');
  }
}

export async function participantsUpdate({ id, participants, action }) {
  try {
    const conn = currentConn || mconn?.conn || mconn;
    if (!conn?.user?.jid) return;
    try { invalidateGroupCount(); } catch {}

    if (global.groupCache?.has(id)) {
      const cached = global.groupCache.get(id);
      if (cached?.data?.participants) {
        const normalizedParticipants = Array.isArray(participants)
          ? participants.map(p => (typeof p === 'string' ? p : p.id || p.phoneNumber || '')).filter(Boolean)
          : [participants].filter(Boolean);

        let updatedParticipants = [...cached.data.participants];

        if (action === 'add') {
          for (const jid of normalizedParticipants) {
            if (!updatedParticipants.find(p => p.id === jid)) {
              updatedParticipants.push({ id: jid, lid: null, admin: null });
            }
          }
        } else if (action === 'remove' || action === 'leave') {
          updatedParticipants = updatedParticipants.filter(p => !normalizedParticipants.includes(p.id));
        } else if (action === 'promote') {
          updatedParticipants = updatedParticipants.map(p =>
            normalizedParticipants.includes(p.id) ? { ...p, admin: 'admin' } : p
          );
        } else if (action === 'demote') {
          updatedParticipants = updatedParticipants.map(p =>
            normalizedParticipants.includes(p.id) ? { ...p, admin: null } : p
          );
        }

        global.groupCache.set(id, {
          data: { ...cached.data, participants: updatedParticipants },
          timestamp: Date.now()
        });
      }
    }

    const idioma = global?.db?.data?.chats[id]?.language || global.defaultLenguaje;
    const _translate = await loadTranslation(idioma);
    const tradutor = _translate?.handler?.participantsUpdate ?? {};

    await handleParticipantsUpdate(
      conn,
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
  } catch (e) {}
}

export async function callUpdate(callUpdate) {
  try {
    const conn = currentConn || mconn?.conn;
    const isAnticall = global?.db?.data?.settings[conn?.user?.jid]?.antiCall;
    if (!isAnticall || !conn) return;

    for (const nk of callUpdate) {
      try {
        if (!nk.isGroup && nk.status === 'offer') {
          const idioma = global?.db?.data?.users[nk.from]?.language || global.defaultLenguaje;
          const _translate = await loadTranslation(idioma);
          const tradutor = _translate?.handler?.callUpdate || {};
          const tipoLlamada = nk.isVideo ? tradutor.video : tradutor.voz;
          const msg = `Hola *@${nk.from.split('@')[0]}*, ${tipoLlamada} ${tradutor.texto1}`;
          await conn.reply(nk.from, msg, false, { mentions: [nk.from] });
          await conn.updateBlockStatus(nk.from, 'block');
        }
      } catch (e) {}
    }
  } catch (e) {}
}

export async function deleteUpdate(message) {
  try {
    const { fromMe, id, participant } = message;
    const conn = currentConn || mconn?.conn;
    if (fromMe || !conn || !global.db) return;

    const idioma = global.db.data.users[participant]?.language || global.defaultLenguaje || 'es';
    const _translate = await loadTranslation(idioma);
    const tradutor = _translate.handler?.deleteUpdate || {};

    let d = new Date(Date.now() + 3600000);
    let date = d.toLocaleDateString(idioma, { day: 'numeric', month: 'long', year: 'numeric' });
    let time = d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });

    let msg = conn.serializeM(conn.loadMessage(id));
    if (!msg?.chat || !msg?.isGroup) return;

    let chat = global.db.data.chats[msg.chat] || {};
    if (!chat?.antidelete) return;

    const antideleteMessage = `${tradutor.texto1?.[0]}\n${tradutor.texto1?.[1]}: @${participant.split('@')[0]}\n${tradutor.texto1?.[2]}: ${time}\n${tradutor.texto1?.[3]}: ${date}`.trim();

    await conn.sendMessage(msg.chat, { text: antideleteMessage, mentions: [conn.decodeJid(participant)] }, { quoted: msg }).catch(() => {});
    await conn.copyNForward(msg.chat, msg).catch(() => {});
  } catch (e) {}
}

global.dfail = async (type, m, conn) => {
  try {
    const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
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
      await conn.relayMessage(m.chat, prep.message, { messageId: prep.key.id }).catch(() => {});
    }
  } catch (e) {}
};

const file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
  unwatchFile(file);
  console.log(chalk.redBright('Actualización en handler.js'));
  if (global.reloadHandler) {
    const result = await global.reloadHandler().catch(() => {});
    if (result) console.log(result);
  }

  if (global.conns?.length > 0) {
    const users = [...new Set(global.conns.filter((conn) => conn?.user && conn?.ws?.socket?.readyState !== ws.CLOSED))];
    for (const userr of users) {
      userr.subreloadHandler?.(false).catch(() => {});
    }
  }
});

if (!global._errorHandlersRegistered) {
  global._errorHandlersRegistered = true;

  process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || reason?.toString() || 'Error desconocido';
    if (msg.includes('Unsupported state') || msg.includes('unable to authenticate')) return;
    if (msg.includes('presence') || msg.includes('sending presence') || msg.includes('enviando presencia')) {
      console.log(chalk.yellow('⚠️ BOT BANEADO - Elimina "MysticSession" y vuelve a vincular'));
      return;
    }
    if (msg.includes('Connection') || msg.includes('Conexión') || msg.includes('WebSocket')) {
      console.log(chalk.yellow('⚠️ Error de conexión - Verifica tu internet'));
      return;
    }
    console.log(chalk.red(`🛠️ ERROR: ${msg}`));
  });

  process.on('uncaughtException', (err) => {
    const msg = err?.message || err?.toString() || 'Error desconocido';
    if (msg.includes('Unsupported state') || msg.includes('unable to authenticate')) return;
    if (msg.includes('authenticate') || msg.includes('autenticación') || msg.includes('QR')) {
      console.log(chalk.yellow('⚠️ Error de autenticación - Elimina "MysticSession" y reinicia'));
      return;
    }
    if (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
      console.log(chalk.yellow('⚠️ Error de red - Verifica tu conexión'));
      return;
    }
    console.log(chalk.red(`⚠️ EXCEPCIÓN CRÍTICA: ${msg}`));
  });
}
