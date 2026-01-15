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
import { ensureUserData, ensureBotSettings } from './lib/funcion/databaseManager.js';
import { startCacheCleanupInterval } from './lib/funcion/cacheManager.js';
import { limitCache } from './lib/funcion/cacheLimit.js';
import { handleParticipantsUpdate } from './lib/funcion/groupMetadata.js';

EventEmitter.defaultMaxListeners = 20;

const groupCache = new Map();
const recentMessages = new Map();
const recentParticipantEvents = new Map();
const translationsCache = new Map();
const customCommandsCache = new Map();
const processedVoiceMessages = new Set();

const CACHE_TTL = 2 * 60 * 1000;
const DUPLICATE_TIMEOUT = 3000;
const MAX_CACHE_SIZE = 50;
const MAX_VOICE_CACHE = 200;

global.groupCache = groupCache;

const isNumber = (x) => typeof x === 'number' && !isNaN(x);
const delay = (ms) => isNumber(ms) && new Promise((resolve) => setTimeout(() => resolve(), ms));

async function loadTranslation(idioma) {
  const cached = translationsCache.get(idioma);
  if (cached) return cached;
  try {
    const data = await readFile(`./src/languages/${idioma}.json`, 'utf8');
    const parsed = JSON.parse(data);
    translationsCache.set(idioma, parsed);
    return parsed;
  } catch (e) {
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
        console.log(`Error al cargar comando personalizado ${file}: ${e.message}`);
      }
    }
  } catch (e) {}
}

function logError(e, plugin = 'general') {
  console.log(chalk.red(`\n💥 Error en: ${chalk.yellow(plugin)}`));
  console.log(chalk.red(`📝 ${chalk.white(e?.message || e?.toString() || 'Error desconocido')}`));
}

let mconn;
const { proto } = (await import("@whiskeysockets/baileys")).default;

startCacheCleanupInterval(groupCache, recentMessages, recentParticipantEvents, translationsCache, customCommandsCache, processedVoiceMessages, CACHE_TTL, DUPLICATE_TIMEOUT);

setInterval(() => {
  try {
    limitCache(groupCache, 30);
    limitCache(recentMessages, 50);
    limitCache(recentParticipantEvents, 30);
    limitCache(translationsCache, 5);
    
    if (processedVoiceMessages.size > MAX_VOICE_CACHE) {
      const toDelete = Array.from(processedVoiceMessages).slice(0, 100);
      toDelete.forEach(id => processedVoiceMessages.delete(id));
    }
    
    if (global.gc) global.gc();
  } catch (e) {}
}, 60000);

export async function handler(chatUpdate) {
  try {
    this.msgqueque = this.msgqueque || [];
    this.uptime = this.uptime || Date.now();
    
    if (!chatUpdate?.messages?.length) return;

    this.pushMessage(chatUpdate.messages).catch(console.error);

    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!isValidMessage(m)) return;
    if (m.key?.id && isDuplicate(m.key.id, m.key.participant || m.key.remoteJid, extractMessageText(m), recentMessages, DUPLICATE_TIMEOUT, MAX_CACHE_SIZE)) return;

    const { sender, chat } = extractSenderAndChat(m, this);
    if (!sender || !chat) return;

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
        } catch (e) {}
      }

      const { isROwner, isOwner, isMods, isPrems } = checkUserPermissions(m, this);

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
              const messageText = `${tradutor.texto1?.[0] || 'Estás baneado'}\n${tradutor.texto1?.[1] || 'Mensaje'} ${messageNumber}/3\n${user.bannedReason ? `${tradutor.texto1?.[2] || 'Razón'}: ${user.bannedReason}` : `${tradutor.texto1?.[3] || 'Sin razón especificada'}`}\n${tradutor.texto1?.[4] || 'Contacta al soporte'}`.trim();
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
                m.reply(`*[⏱️] Espera* _${remainingTime} segundos_ *antes de usar otro comando.*`);
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
          if (adminMode && !isOwner && !isROwner && m.isGroup && (plugin.admin || plugin.botAdmin || plugin.group)) {
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
          if (plugin.botAdmin && m.isGroup) {
            fail('botAdmin', m, this);
            continue;
          }
          if (plugin.admin && m.isGroup) {
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
            m.reply('Haciendo trampa -_-');
          } else {
            m.exp += xp;
          }

          if (!isPrems && plugin.limit && global.db.data.users[m.sender]?.limit < plugin.limit) {
            m.reply(`${tradutor.texto2 || 'Límite excedido'} _${this.prefix}buyall_`);
            continue;
          }
          if (plugin.level > user?.level) {
            m.reply(`${tradutor.texto3?.[0] || 'Nivel'} ${plugin.level} ${tradutor.texto3?.[1] || 'requerido'} ${user?.level || 0}, ${tradutor.texto3?.[2] || 'Usa'} ${this.prefix}lvl ${tradutor.texto3?.[3] || 'para subir de nivel'}`);
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
            participants: [],
            groupMetadata: {},
            user,
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
              m.reply(`${tradutor.texto4?.[0] || 'Límite usado'} ${m.limit} ${tradutor.texto4?.[1] || 'veces'}`);
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
      } catch (e) {}

      

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
  } catch (e) {}
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
        if (desc) text = (chats?.sDesc || tradutor.texto5 || 'Descripción cambiada').replace('@desc', desc);
        else if (subject) text = (chats?.sSubject || tradutor.texto6 || 'Nombre cambiado').replace('@subject', subject);
        else if (icon) text = (chats?.sIcon || tradutor.texto7 || 'Ícono cambiado').replace('@icon', icon);
        else if (revoke) text = (chats?.sRevoke || tradutor.texto8 || 'Enlace revocado').replace('@revoke', revoke);

        if (text) {
          await mconn?.conn?.sendMessage(id, { text, mentions: mconn?.conn?.parseMention(text) }).catch(() => {});
        }
      } catch (e) {}
    }
  } catch (e) {}
}

export async function callUpdate(callUpdate) {
  try {
    const isAnticall = global?.db?.data?.settings[mconn?.conn?.user?.jid]?.antiCall;
    if (!isAnticall || !mconn?.conn) return;

    for (const nk of callUpdate) {
      try {
        if (!nk.isGroup && nk.status === 'offer') {
          const msg = `Hola *@${nk.from.split('@')[0]}*, ${nk.isVideo ? 'las videollamadas' : 'las llamadas'} no están permitidas. Serás bloqueado.\nContacta a mi creador para ser desbloqueado.`;
          await mconn?.conn?.reply(nk.from, msg, false, { mentions: [nk.from] });
          await mconn.conn.updateBlockStatus(nk.from, 'block');
        }
      } catch (e) {}
    }
  } catch (e) {}
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

    const antideleteMessage = `${tradutor.texto1?.[0] || '🔄 Mensaje eliminado'}\n${tradutor.texto1?.[1] || 'Por'}: @${participant.split('@')[0]}\n${tradutor.texto1?.[2] || 'Hora'}: ${time}\n${tradutor.texto1?.[3] || 'Fecha'}: ${date}`.trim();

    await mconn.conn.sendMessage(msg.chat, { text: antideleteMessage, mentions: [mconn.conn.decodeJid(participant)] }, { quoted: msg }).catch(() => {});
    await mconn.conn.copyNForward(msg.chat, msg).catch(() => {});
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

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || reason?.toString() || 'Error desconocido';
  
  if (msg.includes('Unsupported state') || msg.includes('unable to authenticate')) {
    return;
  }
  
  if (msg.includes('presence') || msg.includes('sending presence') || msg.includes('enviando presencia')) {
    console.log(chalk.yellow('\n⚠️ ============================================'));
    console.log(chalk.yellow('❌ BOT BANEADO - NO SE VOLVERÁ A CONECTAR'));
    console.log(chalk.yellow('============================================'));
    console.log(chalk.white('📋 Solución:'));
    console.log(chalk.white('1. Elimina la carpeta "MysticSession"'));
    console.log(chalk.white('2. Vuelve a vincular el bot escaneando el QR'));
    console.log(chalk.yellow('============================================\n'));
    return;
  }
  
  if (msg.includes('Connection') || msg.includes('Conexión') || msg.includes('WebSocket')) {
    console.log(chalk.yellow('\n⚠️ ============================================'));
    console.log(chalk.yellow('🔌 ERROR DE CONEXIÓN'));
    console.log(chalk.yellow('============================================'));
    console.log(chalk.white('📋 Posibles soluciones:'));
    console.log(chalk.white('1. Verifica tu conexión a internet'));
    console.log(chalk.white('2. Reinicia el servidor: npm start'));
    console.log(chalk.white('3. Si persiste, vuelve a vincular el bot'));
    console.log(chalk.yellow('============================================\n'));
    return;
  }
  
  console.log(chalk.red('\n🛠️ ============================================'));
  console.log(chalk.red('ERROR NO MANEJADO'));
  console.log(chalk.red('============================================'));
  console.log(chalk.white(`📝 Mensaje: ${msg}`));
  console.log(chalk.white('📋 Acción recomendada:'));
  console.log(chalk.white('1. Reinicia el servidor con: npm start'));
  console.log(chalk.white('2. Si el error persiste, revisa los logs'));
  console.log(chalk.red('============================================\n'));
});

process.on('uncaughtException', (err) => {
  const msg = err?.message || err?.toString() || 'Error desconocido';
  
  if (msg.includes('Unsupported state') || msg.includes('unable to authenticate')) {
    return;
  }
  
  if (msg.includes('authenticate') || msg.includes('autenticación') || msg.includes('QR')) {
    console.log(chalk.yellow('\n⚠️ ============================================'));
    console.log(chalk.yellow('❌ ERROR DE AUTENTICACIÓN'));
    console.log(chalk.yellow('============================================'));
    console.log(chalk.white('📋 La vinculación no se completó correctamente'));
    console.log(chalk.white('Solución:'));
    console.log(chalk.white('1. Detén el servidor (Ctrl + C)'));
    console.log(chalk.white('2. Elimina la carpeta "MysticSession"'));
    console.log(chalk.white('3. Reinicia: npm start'));
    console.log(chalk.white('4. Escanea el código QR nuevamente'));
    console.log(chalk.yellow('============================================\n'));
    return;
  }
  
  if (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
    console.log(chalk.yellow('\n⚠️ ============================================'));
    console.log(chalk.yellow('🌐 ERROR DE RED'));
    console.log(chalk.yellow('============================================'));
    console.log(chalk.white('📋 Problema de conexión a internet detectado'));
    console.log(chalk.white('Solución:'));
    console.log(chalk.white('1. Verifica tu conexión a internet'));
    console.log(chalk.white('2. Espera unos segundos y reinicia el bot'));
    console.log(chalk.white('3. El bot se reconectará automáticamente'));
    console.log(chalk.yellow('============================================\n'));
    return;
  }
  
  console.log(chalk.red('\n⚠️ ============================================'));
  console.log(chalk.red('EXCEPCIÓN CRÍTICA NO CAPTURADA'));
  console.log(chalk.red('============================================'));
  console.log(chalk.white(`📝 Mensaje: ${msg}`));
  console.log(chalk.white(`📍 Stack: ${err?.stack?.split('\n')[1]?.trim() || 'No disponible'}`));
  console.log(chalk.white('📋 Acción URGENTE:'));
  console.log(chalk.white('1. REINICIA el servidor inmediatamente'));
  console.log(chalk.white('2. Si el error se repite, revisa el código'));
  console.log(chalk.white('3. Considera restaurar desde un backup'));
  console.log(chalk.red('============================================\n'));
});
