import fs from 'fs';
import { readFile } from 'fs/promises';
import { setConfig, getConfig } from '../lib/funcConfig.js';

const configLocks = new Map();

async function safeSetConfig(chatId, config) {
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

const handler = async (m, {conn, usedPrefix, command, args, isOwner: _isOwner, isAdmin: _isAdmin, isROwner: _isROwner}) => {
  let isOwner = _isOwner;
  let isAdmin = _isAdmin;
  let isROwner = _isROwner;
  
  if (m.isGroup && m.sender.includes('@lid')) {
    const groupMetadata = await conn.groupMetadata(m.chat).catch(() => null);
    if (groupMetadata) {
      const participantData = groupMetadata.participants.find(p => p.lid === m.sender);
      if (participantData && participantData.id) {
        const realUserJid = participantData.id;
        const realNum = realUserJid.replace(/[^0-9]/g, '');
        
        const ownerNums = global.owner.map(([num]) => num);
        if (ownerNums.includes(realNum)) {
          isROwner = true;
          isOwner = true;
        }
        
        if (participantData.admin) {
          isAdmin = true;
        }
      }
    }
  }
  
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  
  let _translate = {};
  try {
    const translateData = await readFile(`./src/languages/${idioma}.json`, 'utf8');
    _translate = JSON.parse(translateData);
  } catch (e) {
    console.error('Error cargando idioma:', e.message);
  }
  
  const tradutor = _translate.plugins?.config_funciones || {};

  const optionsFull = `*====[ ⚙️ ${tradutor.texto1?.[0] || 'CONFIGURACIÓN'} ⚙️ ]====*

🎉 *WELCOME*
- ${tradutor.texto1?.[1] || 'Activa/desactiva la bienvenida'}
- ${usedPrefix + command} welcome
- ${tradutor.texto1?.[3] || 'Solo para grupos'}

🚫 *ANTILINK*
- ${tradutor.texto4?.[1] || 'Elimina mensajes con links'}
- ${usedPrefix + command} antilink
- ${tradutor.texto4?.[2] || 'Solo grupos'}
- ${tradutor.texto4?.[3] || 'Requiere admin'}

🚫 *ANTILINK 2*
- ${tradutor.texto5?.[1] || 'Versión alternativa de antilink'}
- ${usedPrefix + command} antilink2
- ${tradutor.texto5?.[2] || 'Solo grupos'}
- ${tradutor.texto5?.[3] || 'Requiere admin'}

🔒 *RESTRICT*
- ${tradutor.texto8?.[1] || 'Restringe acciones del bot'}
- ${usedPrefix + command} restrict
- ${tradutor.texto8?.[2] || 'Solo owner'}
- ${tradutor.texto8?.[3] || 'Afecta todo el bot'}

📖 *AUTOREAD*
- ${tradutor.texto9?.[1] || 'Lee mensajes automáticamente'}
- ${usedPrefix + command} autoread
- ${tradutor.texto9?.[2] || 'Solo owner'}
- ${tradutor.texto9?.[3] || 'Afecta todo el bot'}

🎵 *AUDIOS*
- ${tradutor.texto10?.[1] || 'Activa/desactiva audios del bot'}
- ${usedPrefix + command} audios
- ${tradutor.texto10?.[2] || 'Solo grupos'}

🏷️ *AUTOSTICKER*
- ${tradutor.texto11?.[1] || 'Convierte imágenes en stickers automáticamente'}
- ${usedPrefix + command} autosticker
- ${tradutor.texto11?.[2] || 'Solo grupos'}

📞 *ANTICALL*
- ${tradutor.texto15?.[1] || 'Bloquea llamadas entrantes'}
- ${usedPrefix + command} anticall
- ${tradutor.texto15?.[2] || 'Solo owner'}
- ${tradutor.texto15?.[3] || 'Bloquea automáticamente'}

☢️ *ANTITOXIC*
- ${tradutor.texto16?.[1] || 'Elimina mensajes tóxicos'}
- ${usedPrefix + command} antitoxic
- ${tradutor.texto16?.[2] || 'Solo grupos'}
- ${tradutor.texto16?.[3] || 'Requiere admin'}

👑 *MODOADMIN*
- ${tradutor.texto20?.[1] || 'Solo admins pueden usar comandos'}
- ${usedPrefix + command} modoadmin
- ${tradutor.texto20?.[2] || 'Solo grupos'}

⏰ *AFK*
- Activa o desactiva tu estado AFK
- ${usedPrefix + command} afk [motivo]
- Mientras estés AFK, los demás recibirán un aviso si te mencionan
- Puedes desactivar el AFK usando /disable afk en el grupo (admins/owner)

🗑️ *ANTIDELETE*
- ${tradutor.texto22?.[1] || 'Reenvía mensajes eliminados'}
- ${usedPrefix + command} antidelete
- ${tradutor.texto22?.[2] || 'Solo grupos'}

🔊 *AUDIOS_BOT*
- ${tradutor.texto23?.[1] || 'Activa/desactiva audios globales'}
- ${usedPrefix + command} audios_bot
- ${tradutor.texto23?.[2] || 'Solo owner'}
- ${tradutor.texto23?.[3] || 'Afecta todo el bot'}

🚯 *ANTISPAM*
- ${tradutor.texto25?.[1] || 'Previene spam de comandos'}
- ${usedPrefix + command} antispam
- ${tradutor.texto25?.[2] || 'Solo owner'}
- ${tradutor.texto25?.[3] || 'Límite de 2 comandos/10s'}

🔐 *ANTIPRIVADO*
- ${tradutor.texto27?.[1] || 'Bloquea mensajes privados'}
- ${usedPrefix + command} antiprivado
- ${tradutor.texto27?.[2] || 'Solo owner'}
- ${tradutor.texto27?.[3] || 'Owners pueden escribir'}

🌐 *MODOPUBLICO*
- Activa/desactiva el modo público del bot
- ${usedPrefix + command} modopublico
- Permite que todos usen el bot sin restricciones
- Solo owner

👁️ *VIERWIMAGE*
- Captura imágenes/videos de vista única
- ${usedPrefix + command} vierwimage
- Los view once se reenvían al owner
- Solo owner

🏢 *MODOGRUPOS*
- Solo permite grupos autorizados
- ${usedPrefix + command} modogrupos
- El bot sale de grupos no autorizados
- Solo owner

*================================*`;

  const isEnable = /true|enable|(turn)?on|1/i.test(command);
  
  const chat = getConfig(m.chat) || {};
  const user = global.db.data.users[m.sender];
  const bot = global.db.data.settings[conn.user.jid] || {};
  const type = (args[0] || '').toLowerCase();
  let isAll = false;

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

    case 'autoread':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('rowner', m, conn);
        throw false;
      }
      bot.autoread2 = isEnable;
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
      
      let ownerConfigData = {};
      try {
        const configFile = await fs.promises.readFile('./database/funciones-owner.json', 'utf8');
        ownerConfigData = JSON.parse(configFile);
      } catch (e) {
        ownerConfigData = {
          auread: false,
          modopublico: false,
          vierwimage: false,
          antiprivado: false,
          modogrupos: false
        };
      }
      
      ownerConfigData.antiprivado = isEnable;
      
      try {
        await fs.promises.writeFile(
          './database/funciones-owner.json', 
          JSON.stringify(ownerConfigData, null, 2), 
          'utf8'
        );
      } catch (e) {
        console.error('Error guardando funciones-owner.json:', e.message);
        return m.reply('❌ Error al guardar la configuración.');
      }
      
      break;

    case 'modopublico':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('owner', m, conn);
        throw false;
      }
      
      let configPublico = {};
      try {
        const configFile = await fs.promises.readFile('./database/funciones-owner.json', 'utf8');
        configPublico = JSON.parse(configFile);
      } catch (e) {
        configPublico = {
          auread: false,
          modopublico: false,
          vierwimage: false,
          antiprivado: false,
          modogrupos: false
        };
      }
      
      configPublico.modopublico = isEnable;
      
      try {
        await fs.promises.writeFile(
          './database/funciones-owner.json', 
          JSON.stringify(configPublico, null, 2), 
          'utf8'
        );
      } catch (e) {
        console.error('Error guardando funciones-owner.json:', e.message);
        return m.reply('❌ Error al guardar la configuración.');
      }
      
      break;

    case 'vierwimage':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('owner', m, conn);
        throw false;
      }
      
      let configView = {};
      try {
        const configFile = await fs.promises.readFile('./database/funciones-owner.json', 'utf8');
        configView = JSON.parse(configFile);
      } catch (e) {
        configView = {
          auread: false,
          modopublico: false,
          vierwimage: false,
          antiprivado: false,
          modogrupos: false
        };
      }
      
      configView.vierwimage = isEnable;
      
      try {
        await fs.promises.writeFile(
          './database/funciones-owner.json', 
          JSON.stringify(configView, null, 2), 
          'utf8'
        );
      } catch (e) {
        console.error('Error guardando funciones-owner.json:', e.message);
        return m.reply('❌ Error al guardar la configuración.');
      }
      
      break;

    case 'modogrupos':
      isAll = true;
      if (!(isROwner || isOwner)) {
        global.dfail('owner', m, conn);
        throw false;
      }
      
      let configGrupos = {};
      try {
        const configFile = await fs.promises.readFile('./database/funciones-owner.json', 'utf8');
        configGrupos = JSON.parse(configFile);
      } catch (e) {
        configGrupos = {
          auread: false,
          modopublico: false,
          vierwimage: false,
          antiprivado: false,
          modogrupos: false
        };
      }
      
      configGrupos.modogrupos = isEnable;
      
      try {
        await fs.promises.writeFile(
          './database/funciones-owner.json', 
          JSON.stringify(configGrupos, null, 2), 
          'utf8'
        );
      } catch (e) {
        console.error('Error guardando funciones-owner.json:', e.message);
        return m.reply('❌ Error al guardar la configuración.');
      }
      
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

    case 'afk':
      if (m.isGroup) {
        if (!(isAdmin || isROwner || isOwner)) {
          global.dfail('admin', m, conn);
          throw false;
        }
      }
      chat.afkAllowed = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    default:
      if (!/[01]/.test(command)) {
        await conn.sendMessage(m.chat, {text: optionsFull}, {quoted: m});
      }
      return;
  }
  
  const statusEmoji = isEnable ? '✅' : '❌';
  const statusText = isEnable ? '_activada_' : '_desactivada_';
  const scopeText = isAll ? '_bot._' : '_chat._';
  
  const responseMessage = `*====[ ⚙️ ${tradutor.texto28?.[0] || 'CONFIGURACIÓN ACTUALIZADA'} ⚙️ ]====*

${statusEmoji} *${tradutor.texto28?.[1] || 'Función'}:* _${type}_
*Estado:* ${statusText}
*${tradutor.texto28?.[2] || 'Alcance'}:* ${scopeText}

*================================*`;

  conn.sendMessage(m.chat, {text: responseMessage}, {quoted: m});
};

handler.command = /^((en|dis)able|(tru|fals)e|(turn)?[01])$/i;
export default handler;