import { updateLastCommand } from './logBans.js';
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import { smsg } from './src/libraries/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 50;
process.setMaxListeners(50);
import { unwatchFile, watchFile } from 'fs';
import fs from 'fs';
import chalk from 'chalk';
import mentionListener from './plugins/game-ialuna.js';
import { getConfig } from './lib/funcConfig.js';
import { readFile } from 'fs/promises';
const translationsCache = new Map();
const customCommandsCache = new Map();

async function loadTranslation(idioma) {
  if (translationsCache.has(idioma)) return translationsCache.get(idioma);
  try {
    const data = await readFile(`./src/languages/${idioma}.json`, 'utf8');
    const parsed = JSON.parse(data);
    translationsCache.set(idioma, parsed);
    return parsed;
  } catch (e) {
    console.error('Error cargando idioma', idioma, e?.message || e);
    return {};
  }
}

async function loadCustomCommandsOnce(customCommandsDir) {
  if (!fs.existsSync(customCommandsDir)) return;
  if (customCommandsCache.size > 0) return; 
  const files = await fs.promises.readdir(customCommandsDir);
  for (const file of files.filter(f => f.endsWith('.js'))) {
    const filePath = path.join(customCommandsDir, file);
    try {
      const mod = await import(`file://${filePath}?t=${Date.now()}`);
      customCommandsCache.set(file, mod.default || mod);
    } catch (e) {
      console.log(`Error cargando comando personalizado ${file}:`, e.message);
    }
  }
}

function withTimeout(promise, ms, fallback = null) {
  let timer;
  return Promise.race([
  Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((resolve) => timer = setTimeout(() => resolve(fallback), ms))
  ]);
}


import mddd5 from 'md5';
import ws from 'ws';
import { setConfig } from './lib/funcConfig.js'
import { setOwnerFunction } from './lib/owner-funciones.js'
import { addExp, getUserStats, setUserStats } from './lib/stats.js'

const lidToJidCache = global.lidToJidCache || (global.lidToJidCache = new Map());
const lidToNameCache = global.lidToNameCache || (global.lidToNameCache = new Map());

const recentMessages = new Set()
const recentParticipantEvents = new Map();

function isRecentParticipantEvent(groupId, participant, action) {
  const key = `${groupId}-${participant}-${action}`;
  const now = Date.now();
  
  if (recentParticipantEvents.has(key)) {
    const lastTime = recentParticipantEvents.get(key);
    if (now - lastTime < 5000) {
      return true;
    }
  }
  
  recentParticipantEvents.set(key, now);
  
  setTimeout(() => {
    recentParticipantEvents.delete(key);
  }, 5000);
  
  return false;
}
function isDuplicate(id) {
  if (recentMessages.has(id)) return true
  recentMessages.add(id)
  setTimeout(() => recentMessages.delete(id), 3000)
  return false
}

function logError(e, plugin = 'general') {
  const emoji = '💥';
  const archivo = plugin || 'desconocido';
  const mensaje = e?.message || e?.toString() || 'Error desconocido';

  console.log(chalk.red(`\n${emoji} Error en el plugin: ${chalk.yellow(archivo)}`));
  console.log(chalk.red(`🧩 Mensaje: ${chalk.white(mensaje)}`));
  console.log(chalk.gray('⚠️ Para más detalles, revisa el archivo de logs si está activado.\n'));
}


let mconn;


const { proto } = (await import("@whiskeysockets/baileys")).default;
const isNumber = (x) => typeof x === 'number' && !isNaN(x);
const delay = (ms) => isNumber(ms) && new Promise((resolve) => setTimeout(function () {
  clearTimeout(this);
  resolve();
}, ms));


export async function handler(chatUpdate) {
  if (this.setMaxListeners) this.setMaxListeners(25);
  this.msgqueque = this.msgqueque || [];
  this.uptime = this.uptime || Date.now();
  if (!chatUpdate) return;

  this.pushMessage(chatUpdate.messages).catch(console.error);

  let m = chatUpdate.messages[chatUpdate.messages.length - 1];
if (!m || typeof m !== 'object' || !m.message) return;
if (m.key?.remoteJid?.endsWith('broadcast')) return;
if (m.key?.id && isDuplicate(m.key.id)) return;
if (m.isBaileys) return;

  const sender = m.key?.fromMe ? this.user.jid : (m.key?.participant || m.participant || m.key?.remoteJid || '');
  const chat = m.key?.remoteJid || '';

  m.text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    m.message?.buttonsResponseMessage?.selectedButtonId ||
    m.message?.templateButtonReplyMessage?.selectedId ||
    m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '';

  if (!m.text) m.text = '';



  if (!m) {
    return;
  }
  if (global.db.data == null) await global.loadDatabase();

  if (global.chatgpt.data === null) await global.loadChatgptDB();

  try {
    m = smsg(this, m) || m;
    if (!m) {
      return;
    }
    global.mconn = m
    mconn = m
    m.exp = 0;
    m.money = false;
    m.limit = false;
    try {
     
      const user = global.db.data.users[m.sender];
    

      const chatgptUser = global.chatgpt.data.users[m.sender];
      if (typeof chatgptUser !== 'object') {
        global.chatgpt.data.users[m.sender] = [];
      }

      if (typeof user !== 'object') {
        global.db.data.users[m.sender] = {};
      }
      if (user) {
        
        const dick = {
          wait: 0,
          banned: false,
          BannedReason: '',
          Banneduser: false,
          premium: false,
          premiumTime: 0,
          registered: false,
          sewa: false,
          skill: '',
          language: 'es',
        }
      for (const dicks in dick) {
        if (user[dicks] === undefined || !user.hasOwnProperty(dicks)) {
        }
      }}
      
      

const chat = global.db.data.chats[m.chat];
if (typeof chat !== 'object') {
  global.db.data.chats[m.chat] = {};
}
if (chat) {
  const defaultChatConfig = {
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
    audios: true,
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
    language: 'es',
  }
  
  for (const configKey in defaultChatConfig) {
    if (chat[configKey] === undefined) {
      chat[configKey] = defaultChatConfig[configKey];
    }
  }
}
      const settings = global.db.data.settings[this.user.jid];
if (typeof settings !== 'object') global.db.data.settings[this.user.jid] = {};
if (settings) {
  const defaultBotSettings = {
    self: false,
    autoread: false,
    autoread2: false,
    restrict: false,
    antiCall: false,
    antiPrivate: false,
    modejadibot: true,
    antispam: false,
    audios_bot: true,
    modoia: false
  };
  
  for (const settingKey in defaultBotSettings) {
    if (settings[settingKey] === undefined) {
      settings[settingKey] = defaultBotSettings[settingKey];
    }
  }
}
    } catch (e) {
      logError(e, m?.plugin || 'handler');
    }

const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
const _translate = await loadTranslation(idioma);
const tradutor = _translate.handler?.handler || {};


    if (opts['nyimak']) {
      return;
    }
    if (!m.fromMe && opts['self']) {
      return;
    }
    if (opts['pconly'] && m.chat.endsWith('g.us')) {
      return;
    }
    if (opts['gconly'] && !m.chat.endsWith('g.us')) {
      return;
    }
    if (opts['swonly'] && m.chat !== 'status@broadcast') {
      return;
    }
    if (typeof m.text !== 'string') {
      m.text = '';
    }

if (m.message?.buttonsResponseMessage?.selectedButtonId) {
  m.text = m.message.buttonsResponseMessage.selectedButtonId;
}
if (m.message?.templateButtonReplyMessage?.selectedId) {
  m.text = m.message.templateButtonReplyMessage.selectedId;
}
if (m.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
  m.text = m.message.listResponseMessage.singleSelectReply.selectedRowId;
}
if (m.message?.interactiveResponseMessage?.nativeFlowResponseMessage) {
  try {
    const id = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id;
    if (id) m.text = id;  
  } catch (e) {
    console.error("Error parseando interactiveResponse:", e);
  }
}
const senderJid = conn.decodeJid(m.sender || '');
const senderNum = senderJid.replace(/[^0-9]/g, '');

const ownerNums = global.owner.map(([num]) => num);
const lidNums = global.lidOwners || [];

const isROwner = ownerNums.includes(senderNum) || lidNums.includes(senderNum);
const isOwner = isROwner || m.fromMe;

const isMods = isOwner || global.mods.map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
const isPrems = isROwner || isOwner || isMods || global.db.data.users[m.sender].premiumTime > 0;


    if (opts['queque'] && m.text && !(isMods || isPrems)) {
      const queque = this.msgqueque; const time = 1000 * 5;
      const previousID = queque[queque.length - 1];
      queque.push(m.id || m.key.id);
      setInterval(async function () {
        if (queque.indexOf(previousID) === -1) clearInterval(this);
        await delay(time);
      }, time);
    }

    if (m.isBaileys || isBaileysFail && m?.sender === mconn?.conn?.user?.jid) {
      return;
    }

    m.exp += Math.ceil(Math.random() * 10);

    if ((m.id.startsWith('NJX-') || (m.id.startsWith('BAE5') && m.id.length === 16) || (m.id.startsWith('B24E') && m.id.length === 20))) return

    let usedPrefix;
    const _user = global.db.data && global.db.data.users && global.db.data.users[m.sender];

    const groupMetadata = (m.isGroup ? ((conn.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch((_) => null)) : {}) || {};
    const participants = (m.isGroup ? groupMetadata.participants : []) || [];
    const user = (m.isGroup ? participants.find((u) => conn.decodeJid(u.id) === m.sender) : {}) || {};
    const bot = (m.isGroup ? participants.find((u) => conn.decodeJid(u.id) == this.user.jid) : {}) || {};
    const isRAdmin = user?.admin == 'superadmin' || false;
    const isAdmin = isRAdmin || user?.admin == 'admin' || false;
    const isBotAdmin = bot?.admin || false;

    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');
    const customCommandsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), './custom-commands');
    
    const allPlugins = { ...global.plugins };
    
await loadCustomCommandsOnce(customCommandsDir);
for (const [file, plugin] of customCommandsCache.entries()) {
  allPlugins[`custom-${file}`] = plugin;
}

    
    for (const name in allPlugins) {
      const plugin = allPlugins[name];
      if (!plugin) {
        continue;
      }
      if (plugin.disabled) {
        continue;
      }
      const __filename = name.startsWith('custom-') ? 
        join(customCommandsDir, name.replace('custom-', '')) : 
        join(___dirname, name);

if (typeof plugin.all === 'function') {
  try {
    await plugin.all.call(this, m, {
      conn: this,
      chatUpdate,
      __dirname: name.startsWith('custom-') ? customCommandsDir : ___dirname,
      __filename,
    });
  } catch (e) {
  }
}


if (!opts['restrict']) {
  if (plugin.tags && plugin.tags.includes('admin')) {
    continue;
  }
}

      const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
      const _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix;
      const match = (_prefix instanceof RegExp ?
        [[_prefix.exec(m.text), _prefix]] :
        Array.isArray(_prefix) ?
          _prefix.map((p) => {
            const re = p instanceof RegExp ?
              p :
              new RegExp(str2Regex(p));
            return [re.exec(m.text), re];
          }) :
          typeof _prefix === 'string' ?
            [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] :
            [[[], new RegExp]]
      ).find((p) => p[1]);
      if (typeof plugin.before === 'function') {
        if (await plugin.before.call(this, m, {
          match,
          conn: this,
          participants,
          groupMetadata,
          user,
          bot,
          isROwner,
          isOwner,
          isRAdmin,
          isAdmin,
          isBotAdmin,
          isPrems,
          chatUpdate,
          __dirname: name.startsWith('custom-') ? customCommandsDir : ___dirname,
          __filename,
        })) {
          continue;
        }
      }
      if (typeof plugin !== 'function') {
        continue;
      }
      if ((usedPrefix = (match[0] || '')[0])) {
        const noPrefix = m.text.replace(usedPrefix, '');
        let [command, ...args] = noPrefix.trim().split` `.filter((v) => v);
        args = args || [];
        const _args = noPrefix.trim().split` `.slice(1);
        const text = _args.join` `;
        command = (command || '').toLowerCase();
         
        const fail = plugin.fail || global.dfail;
        const isAccept = plugin.command instanceof RegExp ?
          plugin.command.test(command) :
          Array.isArray(plugin.command) ?
            plugin.command.some((cmd) => cmd instanceof RegExp ?
              cmd.test(command) :
              cmd === command,
            ) :
            typeof plugin.command === 'string' ?
              plugin.command === command :
              false;

        if (!isAccept) {
          continue;
        }
        m.plugin = name;
        updateLastCommand({ text: m.text, plugin: m.plugin, sender: m.sender });
        
        if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
          const chat = global.db.data.chats[m.chat];
          const user = global.db.data.users[m.sender];
          const botSpam = global.db.data.settings[mconn.conn.user.jid];

          if (!['owner-unbanchat.js', 'info-creator.js'].includes(name) && chat && chat?.isBanned && !isROwner) return;
          if (name != 'owner-unbanchat.js' && name != 'owner-exec.js' && name != 'owner-exec2.js' && chat?.isBanned && !isROwner) return;
                    
          if (m.text && user.banned && !isROwner) {
            if (typeof user.bannedMessageCount === 'undefined') {
              user.bannedMessageCount = 0;
            }

            if (user.bannedMessageCount < 3) {
              const messageNumber = user.bannedMessageCount + 1;
              const messageText = `${tradutor.texto1[0]}
${tradutor.texto1[1]} ${messageNumber}/3
 ${user.bannedReason ? `${tradutor.texto1[2]} ${user.bannedReason}` : `${tradutor.texto1[3]}`}
 ${tradutor.texto1[4]}`.trim();
              m.reply(messageText);
              user.bannedMessageCount++;
            } else if (user.bannedMessageCount === 3) {
              user.bannedMessageSent = true;
            } else {
              return;
            }
            return;
          }

          if (botSpam.antispam && m.text && user && user.lastCommandTime && (Date.now() - user.lastCommandTime) < 10000 && !isROwner) {
  if (user.commandCount >= 2) {
    const remainingTime = Math.ceil((user.lastCommandTime + 10000 - Date.now()) / 1000);
              if (remainingTime > 0) {
                const messageText = `*[ ℹ️ ] Espera* _${remainingTime} segundos_ *antes de utilizar otro comando.*`;
                m.reply(messageText);
                return;
              } else {
                user.commandCount = 0;
              }
            } else {
              user.commandCount += 1;
            }
          } else {
            user.lastCommandTime = Date.now();
            user.commandCount = 1;
          }
        }
        const hl = _prefix;
        const chat = global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || getConfig(m.chat);
        const adminMode = chat.modoadmin;
        if (
  adminMode &&
  !isOwner &&
  !isROwner &&
  m.isGroup &&
  !isAdmin &&
  (plugin.admin || plugin.botAdmin || plugin.group || plugin.command)
) return;


        if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) {
          fail('owner', m, this);
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
        } else if (plugin.botAdmin && !isBotAdmin) {
          fail('botAdmin', m, this);
          continue;
        } else if (plugin.admin && !isAdmin) {
          fail('admin', m, this);
          continue;
        }
        if (plugin.private && m.isGroup) {
          fail('private', m, this);
          continue;
        }
        if (plugin.register == true && _user.registered == false) {
          fail('unreg', m, this);
          continue;
        }
        m.isCommand = true;
        const xp = 'exp' in plugin ? parseInt(plugin.exp) : 17;
        if (xp > 200) {
          m.reply('Ngecit -_-');
        }
        else {
          m.exp += xp;
        }
        if (!isPrems && plugin.limit && global.db.data.users[m.sender].limit < plugin.limit * 1) {
          mconn.conn.reply(m.chat, `${tradutor.texto2} _${usedPrefix}buyall_`, m);
          continue;
        }
        if (plugin.level > _user.level) {
          mconn.conn.reply(m.chat, `${tradutor.texto3[0]} ${plugin.level} ${tradutor.texto3[1]} ${_user.level}, ${tradutor.texto3[2]} ${usedPrefix}lvl ${tradutor.texto3[3]}`, m);
          continue;
        }
        const extra = {
          match,
          usedPrefix,
          noPrefix,
          _args,
          args,
          command,
          text,
          conn: this,
          participants,
          groupMetadata,
          user,
          bot,
          isROwner,
          isOwner,
          isRAdmin,
          isAdmin,
          isBotAdmin,
          isPrems,
          chatUpdate,
          __dirname: name.startsWith('custom-') ? customCommandsDir : ___dirname,
          __filename,
        };
        try {
  await plugin.call(this, m, extra);
  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 3000));
          if (!isPrems) {
            m.limit = m.limit || plugin.limit || false;
          }
        } catch (e) {
          m.error = e;
          logError(e, m?.plugin || 'handler');
          if (e) {
            let text = format(e);
            for (const key of Object.values(global.APIKeys)) {
              text = text.replace(new RegExp(key, 'g'), '#HIDDEN#');
            }
          if (e.name) {
}
await m.reply(text);
}
} finally {
    // Inicializar listener de IA si es necesario

if (!global.mentionListenerInitialized) {

  try {

    mentionListener(this);

    global.mentionListenerInitialized = true;

  } catch (e) {

    console.error('Error inicializando mentionListener:', e);

  }

}

          if (typeof plugin.after === 'function') {
            try {
              await plugin.after.call(this, m, extra);
            } catch (e) {
              logError(e, m?.plugin || 'handler');
            }
          }
          if (m.limit) {
            m.reply(`${tradutor.texto4[0]} ` + +m.limit + ` ${tradutor.texto4[1]}`);
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
 let user;
const stats = global.db.data.stats ?? {}

if (m) {
  if (m.sender) {
    user = getUserStats(m.sender)

    if (m.exp) {
      addExp(m.sender, m.exp)
    }

    if (typeof m.limit === 'number') {
      user.limit = (user.limit ?? 10) - m.limit
      setUserStats(m.sender, user)
    }
  }

  if (m.plugin) {
    const now = Date.now()
    if (!(m.plugin in stats)) {
      stats[m.plugin] = {
        total: 0,
        success: 0,
        last: 0,
        lastSuccess: 0,
      }
    }
    const stat = stats[m.plugin]

    if (typeof stat.total !== 'number') stat.total = 0
    if (typeof stat.success !== 'number') stat.success = 0
    if (typeof stat.last !== 'number') stat.last = 0
    if (typeof stat.lastSuccess !== 'number') stat.lastSuccess = 0

    stat.total += 1
    stat.last = now
    if (m.error == null) {
      stat.success += 1
      stat.lastSuccess = now
    }

    global.db.data.stats = stats
  }
}

try {
      if (!opts['noprint']) await (await import(`./src/libraries/print.js`)).default(m, this);
    } catch (e) {
      console.log(m, m.quoted, e);
    }
    const settingsREAD = global.db.data.settings[mconn.conn.user.jid] || {};
    if (opts['autoread']) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  await mconn.conn.readMessages([m.key]);
}
if (settingsREAD.autoread || settingsREAD.autoread2) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  await mconn.conn.readMessages([m.key]);
}

  }
}


export async function participantsUpdate({ id, participants, action }) {
  const idioma = global?.db?.data?.chats[id]?.language || global.defaultLenguaje;
  const _translate = await loadTranslation(idioma);
  const tradutor = _translate.handler.participantsUpdate

  const m = mconn
  if (opts['self']) return;
  if (global.db.data == null) await loadDatabase();
  const chat = global.db.data.chats[id] = getConfig(id);
  const botTt = global.db.data.settings[mconn?.conn?.user?.jid] || {};
  let text = '';
  
  switch (action) {
    case 'add':
    case 'remove':
      if (chat.welcome && !chat?.isBanned) {
        const groupMetadata = await m?.conn?.groupMetadata(id) || (conn?.chats[id] || {}).metadata;
        for (const user of participants) {
  if (isRecentParticipantEvent(id, user, action)) {
    console.log(`🔄 Evento duplicado ignorado: ${action} para ${user.split('@')[0]} en grupo`);
    continue;
  }
  
  let pp;
  let apii;
  
  try {
    const defaultPP = 'https://raw.githubusercontent.com/Luna-botv6/Luna-botv6/main/IMG-DEFAULT.jpg';
    pp = await withTimeout(m?.conn?.profilePictureUrl(user, 'image'), 3000, defaultPP);
    apii = await withTimeout(mconn?.conn?.getFile(pp), 5000, null);
    
    if (!apii) {
      pp = defaultPP;
      apii = await withTimeout(mconn?.conn?.getFile(pp), 5000, null);
      if (!apii) continue;
    }

    const antiArab = JSON.parse(fs.readFileSync('./src/antiArab.json'));
    const userPrefix = antiArab.some((prefix) => user.startsWith(prefix));
    const botTt2 = groupMetadata?.participants?.find((u) => m?.conn?.decodeJid(u.id) == m?.conn?.user?.jid) || {};
    const isBotAdminNn = botTt2?.admin === 'admin' || false;
    
    if (action === 'add') {
      if (chat.sWelcome && chat.sWelcome.trim() !== '') {
        text = chat.sWelcome
          .replace('@user', '@' + user.split('@')[0])
          .replace('@group', groupMetadata?.subject || 'Grupo')
          .replace('@desc', groupMetadata?.desc?.toString() || '*SIN DESCRIPCIÓN*');
      } else {
        text = (tradutor.texto1 || conn.welcome || '¡Bienvenido/a @user!')
          .replace('@user', '@' + user.split('@')[0])
          .replace('@group', groupMetadata?.subject || 'Grupo')
          .replace('@desc', groupMetadata?.desc?.toString() || '*SIN DESCRIPCIÓN*');
      }
    } else {
      if (chat.sBye && chat.sBye.trim() !== '') {
        text = chat.sBye.replace('@user', '@' + user.split('@')[0]);
      } else {
        text = (tradutor.texto2 || conn.bye || 'Adiós @user')
          .replace('@user', '@' + user.split('@')[0]);
      }
    }

    if (userPrefix && chat.antiArab && botTt.restrict && isBotAdminNn && action === 'add') {
      const responseb = await m.conn.groupParticipantsUpdate(id, [user], 'remove');
      if (responseb[0].status === '404') return;
      const fkontak2 = { 'key': { 'participants': '0@s.whatsapp.net', 'remoteJid': 'status@broadcast', 'fromMe': false, 'id': 'Halo' }, 'message': { 'contactMessage': { 'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${user.split('@')[0]}:${user.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` } }, 'participant': '0@s.whatsapp.net' };
      await m?.conn?.sendMessage(id, { text: `*[◉] @${conn.decodeJid(user).split('@')[0]} ᴇɴ ᴇsᴛᴇ ɢʀᴜᴘᴏ ɴᴏ sᴇ ᴘᴇʀᴍɪᴛᴇɴ ɴᴜᴍᴇʀᴏs ᴀʀᴀʙᴇs ʏ ʀᴀʀᴏs, ᴘᴏʀ ʟᴏ Φ ᴜᴇ sᴇ ᴛᴇ sᴀᴄᴀʀᴀ ᴅᴇʟ ɢʀᴜᴘᴏ*`, mentions: [conn.decodeJid(user)] }, { quoted: fkontak2 });
      return;
    }
    
    await m?.conn?.sendFile(id, apii.data, 'pp.jpg', text, null, false, { mentions: [conn.decodeJid(user)] });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (e) {
    console.error('Error procesando usuario:', e?.message || e);
    continue;
  }
}
      }
      break;
    case 'promote':
    case 'daradmin':
    case 'darpoder':
      if (isRecentParticipantEvent(id, participants[0], action)) {
        console.log(`🔄 Evento duplicado ignorado: ${action} para ${participants[0].split('@')[0]} en grupo`);
        return;
      }
      text = (chat.sPromote || tradutor.texto3 || conn?.spromote || '@user ```is now Admin```');
    case 'demote':
    case 'quitarpoder':
    case 'quitaradmin':
      if (!text) {
        if (isRecentParticipantEvent(id, participants[0], action)) {
          console.log(`🔄 Evento duplicado ignorado: ${action} para ${participants[0].split('@')[0]} en grupo`);
          return;
        }
        text = (chat?.sDemote || tradutor.texto4 || conn?.sdemote || '@user ```is no longer Admin```');
      }
     let userId = m?.conn?.decodeJid(participants[0]) || participants[0]
let tag = '@' + userId.split('@')[0]

text = text.replace(/@user/g, tag)

if (chat.detect && !chat?.isBanned) {
  mconn?.conn?.sendMessage(id, { text, mentions: [userId] });
}


      break;
  }
}

export async function groupsUpdate(groupsUpdate) {
  const idioma = global.db.data.chats[groupsUpdate[0].id]?.language || global.defaultLenguaje;
  const _translate = await loadTranslation(idioma);
  const tradutor = _translate.handler.participantsUpdate

  if (opts['self']) {
    return;
  }
  for (const groupUpdate of groupsUpdate) {
    const id = groupUpdate.id;
    if (!id) continue;
    if (groupUpdate.size == NaN) continue;
    if (groupUpdate.subjectTime) continue;
    const chats = global.db.data.chats[id]; 
    let text = '';
    if (!chats?.detect) continue;
    if (groupUpdate?.desc) text = (chats?.sDesc || tradutor.texto5 || conn?.sDesc || '```Description has been changed to```\n@desc').replace('@desc', groupUpdate.desc);
    if (groupUpdate?.subject) text = (chats?.sSubject || tradutor.texto6 || conn?.sSubject || '```Subject has been changed to```\n@subject').replace('@subject', groupUpdate.subject);
    if (groupUpdate?.icon) text = (chats?.sIcon || tradutor.texto7 || conn?.sIcon || '```Icon has been changed to```').replace('@icon', groupUpdate.icon);
    if (groupUpdate?.revoke) text = (chats?.sRevoke || tradutor.texto8 || conn?.sRevoke || '```Group link has been changed to```\n@revoke').replace('@revoke', groupUpdate.revoke);
    if (!text) continue;
    await mconn?.conn?.sendMessage(id, { text, mentions: mconn?.conn?.parseMention(text) });
  }
}

export async function callUpdate(callUpdate) {
  const isAnticall = global?.db?.data?.settings[mconn?.conn?.user?.jid].antiCall;
  if (!isAnticall) return;
  for (const nk of callUpdate) {
    if (nk.isGroup == false) {
      if (nk.status == 'offer') {
        const callmsg = await mconn?.conn?.reply(nk.from, `Hola *@${nk.from.split('@')[0]}*, las ${nk.isVideo ? 'videollamadas' : 'llamadas'} no están permitidas, serás bloqueado.\n-\nSi accidentalmente llamaste póngase en contacto con mi creador para que te desbloquee!`, false, { mentions: [nk.from] });
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nN:;ehl villano 💎;;;\nFN:ehl villano💎\nORG:ehl villano 💎\nTITLE:\nitem1.TEL;waid=5493483466763:+549 348 346 6763\nitem1.X-ABLabel:ehl villano 💎\nX-WA-BIZ-DESCRIPTION:[◉] ᴄᴏɴᴛᴀᴄᴛᴀ ᴀ ᴇsᴛᴇ ɴᴜᴍ ᴘᴀʀᴀ ᴄᴏsᴀs ɪᴍᴘᴏʀᴛᴀɴᴛᴇs.\nX-WA-BIZ-NAME:ehl villano 💎\nEND:VCARD`;
        await mconn.conn.sendMessage(nk.from, { contacts: { displayName: 'ehl villano 💎', contacts: [{ vcard }] } }, { quoted: callmsg });
        await mconn.conn.updateBlockStatus(nk.from, 'block');
      }
    }
  }
}

export async function deleteUpdate(message) {
  const datas = global
  const id = message?.participant 
  const idioma = datas.db.data.users[id]?.language || global.defaultLenguaje;
  const _translate = await loadTranslation(idioma);
  const tradutor = _translate.handler.deleteUpdate


  let d = new Date(new Date + 3600000)
  let date = d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  let time = d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })
  try {
    const { fromMe, id, participant } = message
    if (fromMe) return
    let msg = mconn.conn.serializeM(mconn.conn.loadMessage(id))
    let chat = global.db.data.chats[msg?.chat] || {}
    if (!chat?.antidelete) return
    if (!msg) return
    if (!msg?.isGroup) return
    const antideleteMessage = `${tradutor.texto1[0]}
${tradutor.texto1[1]} @${participant.split`@`[0]}
${tradutor.texto1[2]} ${time}
${tradutor.texto1[3]} ${date}\n
${tradutor.texto1[4]}
${tradutor.texto1[5]}`.trim();
    await mconn.conn.sendMessage(msg.chat, { text: antideleteMessage, mentions: [conn.decodeJid(participant)] }, { quoted: msg })
    mconn.conn.copyNForward(msg.chat, msg).catch(e => console.log(e, msg))
  } catch (e) {
    console.error(e)
  }
}

global.dfail = async (type, m, conn) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = await loadTranslation(idioma);
  const tradutor = _translate.handler.dfail

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
    restrict: tradutor.texto10,
  }[type];
  const aa = { quoted: m, userJid: conn.user.jid };
  const prep = generateWAMessageFromContent(m.chat, { extendedTextMessage: { text: msg, contextInfo: { externalAdReply: { title: tradutor.texto11[0], body: tradutor.texto11[1], thumbnail: imagen1, sourceUrl: tradutor.texto11[2] } } } }, aa);
  if (msg) return conn.relayMessage(m.chat, prep.message, { messageId: prep.key.id });
};

const file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
  unwatchFile(file);
  console.log(chalk.redBright('Update \'handler.js\''));
  if (global.reloadHandler) console.log(await global.reloadHandler());

  if (global.conns && global.conns.length > 0) {
    const users = [...new Set([...global.conns.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED).map((conn) => conn)])];
    for (const userr of users) {
      userr.subreloadHandler(false)
    }
  }
});
    
process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || reason?.toString() || 'Error desconocido';
  if (msg.includes('Unsupported state') || msg.includes('unable to authenticate')) {
    console.log('⚠️ Error crítico de Baileys: Reinicia el bot o escanea el QR nuevamente.');
  } else {
    console.log('⚠️ Promesa rechazada sin manejar:', msg);
  }
});

process.on('uncaughtException', (err) => {
  const msg = err?.message || err?.toString() || 'Error desconocido';
  if (msg.includes('Unsupported state') || msg.includes('unable to authenticate')) {
    console.log('⚠️ Error crítico de Baileys: Reinicia el bot o escanea el QR nuevamente.');
  } else {
    console.log('⚠️ Error no manejado (excepción):', msg);
  }
});