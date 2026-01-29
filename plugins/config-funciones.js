import fs from 'fs';
import { setConfig, getConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

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

const handler = async (m, {conn, usedPrefix, command, args}) => {
  if (!conn?.user?.jid) {
    return m.reply('⚠️ Sesión no válida. El bot no está conectado correctamente. Intenta nuevamente en unos segundos.');
  }

  let isOwner = false;
  let isAdmin = false;
  let isROwner = false;

  const realNum = m.sender.replace(/[^0-9]/g, '');
  const ownerNums = global.owner.map(([num]) => num);
  
  if (ownerNums.includes(realNum)) {
    isROwner = true;
    isOwner = true;
  }

  if (m.isGroup) {
    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    isAdmin = groupData.isAdmin;
  }

  const optionsFull = `*====[ ⚙️ CONFIGURACIÓN ⚙️ ]====*

🎉 *WELCOME*
- Activa/desactiva la bienvenida
- ${usedPrefix + command} welcome
- Solo para grupos y admins

🚫 *ANTILINK*
- Elimina mensajes con links
- ${usedPrefix + command} antilink
- Solo grupos y admins

🚫 *ANTILINK2*
- Versión alternativa de antilink
- ${usedPrefix + command} antilink2
- Solo grupos y admins

🔐 *RESTRICT*
- Restringe acciones del bot
- ${usedPrefix + command} restrict
- Solo owner - Afecta todo el bot

📖 *AUTOREAD*
- Lee mensajes automáticamente
- ${usedPrefix + command} autoread
- Solo owner - Afecta todo el bot

🎵 *AUDIOS*
- Activa/desactiva audios del bot
- ${usedPrefix + command} audios
- Solo grupos y admins

🏷️ *AUTOSTICKER*
- Convierte imágenes en stickers automáticamente
- ${usedPrefix + command} autosticker
- Solo grupos y admins

📞 *ANTICALL*
- Bloquea llamadas entrantes
- ${usedPrefix + command} anticall
- Solo owner - Bloquea automáticamente

☢️ *ANTITOXIC*
- Elimina mensajes tóxicos
- ${usedPrefix + command} antitoxic
- Solo grupos y admins

👑 *MODOADMIN*
- Solo admins pueden usar comandos
- ${usedPrefix + command} modoadmin
- Solo grupos y admins

⏰ *AFK*
- Activa/desactiva comandos AFK
- ${usedPrefix + command} afk
- Solo grupos y admins

🗑️ *ANTIDELETE*
- Reenvía mensajes eliminados
- ${usedPrefix + command} antidelete
- Solo grupos y admins

📊 *AUDIOS_BOT*
- Activa/desactiva audios globales
- ${usedPrefix + command} audios_bot
- Solo owner - Afecta todo el bot

🎯 *ANTISPAM*
- Previene spam de comandos
- ${usedPrefix + command} antispam
- Solo owner - Límite de 2 comandos/10s

📝 *ANTIPRIVADO*
- Bloquea mensajes privados
- ${usedPrefix + command} antiprivado
- Solo owner - Owners pueden escribir

🌐 *MODOPUBLICO*
- Activa/desactiva el modo público del bot
- ${usedPrefix + command} modopublico
- Solo owner - Permite que todos usen el bot

👀 *VIERWIMAGE*
- Captura imágenes/videos de vista única
- ${usedPrefix + command} vierwimage
- Solo owner - Los view once se reenvían al owner

🢀 *MODOGRUPOS*
- Solo permite grupos autorizados
- ${usedPrefix + command} modogrupos
- Solo owner - El bot sale de grupos no autorizados

*================================*`;

  const isEnable = /true|enable|(turn)?on|1/i.test(command);
  
  const chat = getConfig(m.chat) || {};
  const user = global.db.data.users[m.sender] || {};
  const bot = global.db.data.settings[conn.user.jid] || {};
  const type = (args[0] || '').toLowerCase();
  let isAll = false;

  switch (type) {
    case 'welcome':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
      }
      chat.welcome = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'detect':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
      }
      chat.detect = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'detect2':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
      }
      chat.detect2 = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'antidelete':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
      }
      chat.antidelete = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'antilink':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
      }
      chat.antiLink = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'antilink2':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
      }
      chat.antiLink2 = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'modoadmin':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
      }
      chat.modoadmin = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'autosticker':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
      }
      chat.autosticker = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'audios':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
      }
      chat.audios = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'restrict':
      isAll = true;
      if (!isOwner && !isROwner) {
        return m.reply('❌ Solo el owner puede usar este comando');
      }
      bot.restrict = isEnable;
      break;

    case 'audios_bot':
      isAll = true;
      if (!isOwner && !isROwner) {
        return m.reply('❌ Solo el owner puede usar este comando');
      }
      bot.audios_bot = isEnable;  
      break;

    case 'autoread':
      isAll = true;
      if (!isOwner && !isROwner) {
        return m.reply('❌ Solo el owner puede usar este comando');
      }
      bot.autoread2 = isEnable;
      break;

    case 'anticall':
      isAll = true;
      if (!isOwner && !isROwner) {
        return m.reply('❌ Solo el owner puede usar este comando');
      }
      bot.antiCall = isEnable;
      break;

    case 'antiprivado':
    case 'modopublico':
    case 'vierwimage':
    case 'modogrupos':
      isAll = true;
      if (!isOwner && !isROwner) {
        return m.reply('❌ Solo el owner puede usar este comando');
      }
      
      let ownerConfig = {};
      try {
        const configFile = await fs.promises.readFile('./database/funciones-owner.json', 'utf8');
        ownerConfig = JSON.parse(configFile);
      } catch (e) {
        ownerConfig = {
          auread: false,
          modopublico: false,
          vierwimage: false,
          antiprivado: false,
          modogrupos: false
        };
      }
      
      ownerConfig[type] = isEnable;
      
      try {
        await fs.promises.writeFile(
          './database/funciones-owner.json', 
          JSON.stringify(ownerConfig, null, 2), 
          'utf8'
        );
      } catch (e) {
        console.error('Error guardando funciones-owner.json:', e.message);
        return m.reply('❌ Error al guardar la configuración.');
      }
      break;

    case 'antispam':
      isAll = true;
      if (!isOwner && !isROwner) {
        return m.reply('❌ Solo el owner puede usar este comando');
      }
      bot.antispam = isEnable;
      break;

    case 'antitoxic':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
      }
      chat.antiToxic = isEnable;
      await safeSetConfig(m.chat, chat);
      break;

    case 'afk':
      if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos');
      }
      if (!isAdmin && !isOwner) {
        return m.reply('❌ Solo admins pueden usar este comando');
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
  const statusText = isEnable ? 'ACTIVADA' : 'DESACTIVADA';
  const scopeText = isAll ? 'TODO EL BOT' : 'ESTE CHAT';
  
  const responseMessage = `*====[ ⚙️ CONFIGURACIÓN ACTUALIZADA ⚙️ ]====*

${statusEmoji} *Función:* _${type}_
*Estado:* _${statusText}_
*Alcance:* _${scopeText}_

*================================*`;

  conn.sendMessage(m.chat, {text: responseMessage}, {quoted: m});
};

handler.command = /^((en|dis)able|(tru|fals)e|(turn)?[01])$/i;
export default handler;