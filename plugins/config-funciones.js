import fs from 'fs'
import { setConfig, getConfig } from '../lib/funcConfig.js'

// Sistema de locks para evitar condiciones de carrera
const configLocks = new Map();

async function safeSetConfig(chatId, config) {
  // Evitar múltiples escrituras simultáneas
  if (configLocks.has(chatId)) {
    await configLocks.get(chatId);
  }
  
  const promise = setConfig(chatId, config);
  configLocks.set(chatId, promise);
  
  try {
    await promise;
  } finally {
    configLocks.delete(chatId);
  }
}

const handler = async (m, {conn, usedPrefix, command, args, isOwner, isAdmin, isROwner}) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.config_funciones

  const optionsFull = `*====[ ⚙️ ${tradutor.texto1[0]} ⚙️ ]====*

🎉 *WELCOME*
• ${tradutor.texto1[1]}
• ${usedPrefix + command} welcome
• ${tradutor.texto1[3]}

🌐 *PUBLIC*
• ${tradutor.texto2[1]}
• ${usedPrefix + command} public
• ${tradutor.texto2[2]}
• ${tradutor.texto2[3]}

🔥 *MODOHORNY*
• ${tradutor.texto3[1]}
• ${usedPrefix + command} modohorny
• ${tradutor.texto3[2]}

🚫 *ANTILINK*
• ${tradutor.texto4[1]}
• ${usedPrefix + command} antilink
• ${tradutor.texto4[2]}
• ${tradutor.texto4[3]}

🚫 *ANTILINK 2*
• ${tradutor.texto5[1]}
• ${usedPrefix + command} antilink2
• ${tradutor.texto5[2]}
• ${tradutor.texto5[3]}

👀 *DETECT*
• ${tradutor.texto6[1]}
• ${usedPrefix + command} detect
• ${tradutor.texto6[2]}

👀 *DETECT 2*
• ${tradutor.texto7[1]}
• ${usedPrefix + command} detect2
• ${tradutor.texto7[2]}

🔒 *RESTRICT*
• ${tradutor.texto8[1]}
• ${usedPrefix + command} restrict
• ${tradutor.texto8[2]}
• ${tradutor.texto8[3]}

📖 *AUTOREAD*
• ${tradutor.texto9[1]}
• ${usedPrefix + command} autoread
• ${tradutor.texto9[2]}
• ${tradutor.texto9[3]}

🎵 *AUDIOS*
• ${tradutor.texto10[1]}
• ${usedPrefix + command} audios
• ${tradutor.texto10[2]}

🏷️ *AUTOSTICKER*
• ${tradutor.texto11[1]}
• ${usedPrefix + command} autosticker
• ${tradutor.texto11[2]}

💻 *PCONLY*
• ${tradutor.texto12[1]}
• ${usedPrefix + command} pconly
• ${tradutor.texto12[2]}
• ${tradutor.texto12[3]}

👥 *GCONLY*
• ${tradutor.texto13[1]}
• ${usedPrefix + command} gconly
• ${tradutor.texto13[2]}
• ${tradutor.texto13[3]}

👁️ *ANTIVIEWONCE*
• ${tradutor.texto14[1]}
• ${usedPrefix + command} antiviewonce
• ${tradutor.texto14[2]}

📞 *ANTILLAMADAS*
• ${tradutor.texto15[1]}
• ${usedPrefix + command} anticall
• ${tradutor.texto15[2]}
• ${tradutor.texto15[3]}

☢️ *ANTITOXIC*
• ${tradutor.texto16[1]}
• ${usedPrefix + command} antitoxic
• ${tradutor.texto16[2]}
• ${tradutor.texto16[3]}

🛡️ *ANTITRABAS*
• ${tradutor.texto17[1]}
• ${usedPrefix + command} antitraba
• ${tradutor.texto17[2]}
• ${tradutor.texto17[3]}

🚷 *ANTIARABES*
• ${tradutor.texto18[1]}
• ${usedPrefix + command} antiarabes
• ${tradutor.texto18[2]}
• ${tradutor.texto18[3]}

🚷 *ANTIARABES 2*
• ${tradutor.texto19[1]}
• ${usedPrefix + command} antiarabes2
• ${tradutor.texto19[2]}
• ${tradutor.texto19[3]}

👑 *MODOADMIN*
• ${tradutor.texto20[1]}
• ${usedPrefix + command} modoadmin
• ${tradutor.texto20[2]}

🤖 *SIMSIMI*
• ${tradutor.texto21[1]}
• ${usedPrefix + command} simsimi
• ${tradutor.texto21[2]}

🗑️ *ANTIDELETE*
• ${tradutor.texto22[1]}
• ${usedPrefix + command} antidelete
• ${tradutor.texto22[2]}

🔊 *AUDIOS_BOT*
• ${tradutor.texto23[1]}
• ${usedPrefix + command} audios_bot
• ${tradutor.texto23[2]}
• ${tradutor.texto23[3]}

🧠 *MODOIA*
• ${tradutor.texto24[1]}
• ${usedPrefix + command} modoia
• ${tradutor.texto24[2]}
• ${tradutor.texto24[3]}

🚯 *ANTISPAM*
• ${tradutor.texto25[1]}
• ${usedPrefix + command} antispam
• ${tradutor.texto25[2]}
• ${tradutor.texto25[3]}

🤖 *MODEJADIBOT*
• ${tradutor.texto26[1]}
• ${usedPrefix + command} modejadibot
• ${tradutor.texto26[2]} (${usedPrefix}serbot / ${usedPrefix}jadibot)
• ${tradutor.texto26[3]}

🔐 *ANTIPRIVADO*
• ${tradutor.texto27[1]}
• ${usedPrefix + command} antiprivado
• ${tradutor.texto27[2]}
• ${tradutor.texto27[3]}

*================================*`

  const isEnable = /true|enable|(turn)?on|1/i.test(command);
  
  // Usar getConfig para obtener la configuración actual
  const chat = getConfig(m.chat) || {};
  const user = global.db.data.users[m.sender];
  const bot = global.db.data.settings[conn.user.jid] || {};
  const type = (args[0] || '').toLowerCase();
  let isAll = false; 
  const isUser = false;

  switch (type) {
    case 'welcome':
      if (!m.isGroup) {
        if (!isOwner) {
          global.dfail('group', m, conn);
          throw false;
        }
      } else if (!(isAdmin || isOwner || isROwner)) {
        global.dfail('admin', m, conn);
        throw false;
      }
      chat.welcome = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'detect':
      if (!m.isGroup) {
        if (!isOwner) {
          global.dfail('group', m, conn);
          throw false;
        }
      } else if (!isAdmin) {
        global.dfail('admin', m, conn);
        throw false;
      }
      chat.detect = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'detect2':
      if (!m.isGroup) {
        if (!isOwner) {
          global.dfail('group', m, conn);
          throw false;
        }
      } else if (!isAdmin) {
        global.dfail('admin', m, conn);
        throw false;
      }
      chat.detect2 = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'simsimi':
      if (m.isGroup) {
        if (!(isAdmin || isROwner || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.simi = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'antiporno':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.antiporno = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'delete':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.delete = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'antidelete':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.antidelete = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'public':
      isAll = true;
      if (!isROwner) {
        global.dfail('rowner', m, conn);
        throw false;
      }
      global.opts['self'] = !isEnable;
      break;

    case 'antilink':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.antiLink = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'antilink2':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.antiLink2 = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'antiviewonce':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.antiviewonce = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'modohorny':
      if (m.isGroup) {
        if (!(isAdmin || isROwner || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.modohorny = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'modoadmin':
      if (m.isGroup) {
        if (!(isAdmin || isROwner || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.modoadmin = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'autosticker':
      if (m.isGroup) {
        if (!(isAdmin || isROwner || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.autosticker = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'audios':
      if (m.isGroup) {
        if (!(isAdmin || isROwner || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.audios = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'restrict':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('owner', m, conn);
        throw false;
      }
      bot.restrict = isEnable;
      break;

    case 'audios_bot':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('owner', m, conn);
        throw false;
      }
      bot.audios_bot = isEnable;  
      break;

    case 'modoia':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('owner', m, conn);
        throw false;
      }
      bot.modoia = isEnable;  
      break;      

    case 'nyimak':
      isAll = true;
      if (!isROwner) {
        global.dfail('rowner', m, conn);
        throw false;
      }
      global.opts['nyimak'] = isEnable;
      break;

    case 'autoread':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('rowner', m, conn);
        throw false;
      }
      bot.autoread2 = isEnable;
      break;

    case 'pconly':
    case 'privateonly':
      isAll = true;
      if (!isROwner) {
        global.dfail('rowner', m, conn);
        throw false;
      }
      global.opts['pconly'] = isEnable;
      break;

    case 'gconly':
    case 'grouponly':
      isAll = true;
      if (!isROwner) {
        global.dfail('rowner', m, conn);
        throw false;
      }
      global.opts['gconly'] = isEnable;
      break;

    case 'swonly':
    case 'statusonly':
      isAll = true;
      if (!isROwner) {
        global.dfail('rowner', m, conn);
        throw false;
      }
      global.opts['swonly'] = isEnable;
      break;

    case 'anticall':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('owner', m, conn);
        throw false;
      }
      bot.antiCall = isEnable;
      break;

    case 'antiprivado':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('owner', m, conn);
        throw false;
      }
      bot.antiPrivate = isEnable;
      break;

    case 'modejadibot':
      isAll = true;
      if (!isROwner) {
        global.dfail('rowner', m, conn);
        throw false;
      }
      bot.modejadibot = isEnable;
      break;

    case 'antispam':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('owner', m, conn);
        throw false;
      }
      bot.antispam = isEnable;
      break;

    case 'antitoxic':
      if (m.isGroup) {
        if (!(isAdmin || isROwner || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.antiToxic = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'game': 
    case 'juegos': 
    case 'fun': 
    case 'ruleta':
      if (m.isGroup) {
        if (!(isAdmin || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.game = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'antitraba':
      if (m.isGroup) {
        if (!(isAdmin || isROwner || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.antiTraba = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'antiarabes':
      if (m.isGroup) {
        if (!(isAdmin || isROwner || isOwner)) {
          global.dfail('admin', m, conn); 
          throw false;
        }
      }
      chat.antiArab = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'antiarabes2':
      if (m.isGroup) {
        if (!(isAdmin || isROwner || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.antiArab2 = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    default:
      if (!/[01]/.test(command)) return await conn.sendMessage(m.chat, {text: optionsFull}, {quoted: m});
      throw false;
  }
  
  const statusEmoji = isEnable ? '✅' : '❌';
  const statusText = isEnable ? '_activada_' : '_desactivada_';
  const scopeText = isAll ? '_bot._' : isUser ? '' : '_chat._';
  
  const responseMessage = `*====[ ⚙️ ${tradutor.texto28[0]} ⚙️ ]====*

${statusEmoji} *${tradutor.texto28[1]}* _${type}_
*Estado:* ${statusText}
*${tradutor.texto28[2]}* ${scopeText}

*================================*`;

  conn.sendMessage(m.chat, {text: responseMessage}, {quoted: m});
};

handler.command = /^((en|dis)able|(tru|fals)e|(turn)?[01])$/i;
export default handler;