import fs from 'fs';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';

const cooldowns = new Map();

const handler = async (m, { isOwner, conn, text, command, usedPrefix }) => {
  try {
    if (usedPrefix == 'a' || usedPrefix == 'A') return;
    if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos');

    const chatId = m.chat;
    const senderId = m.sender;
    const cooldownTime = 2 * 60 * 1000;
    const now = Date.now();

    const groupData = await getGroupDataForPlugin(conn, chatId, senderId);
    const { isAdmin, isBotAdmin, participants: groupParticipants } = groupData;

    if (!isAdmin && !isOwner) {
      return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.');
    }

    if (!isBotAdmin) {
      return m.reply('⚠️ Necesito ser administrador para expulsar usuarios.');
    }

    if (cooldowns.has(chatId)) {
      const expire = cooldowns.get(chatId) + cooldownTime;
      if (now < expire) {
        const left = expire - now;
        return m.reply(`⏰ Debes esperar ${Math.floor(left / 60000)}m ${Math.floor((left % 60000) / 1000)}s antes de usar este comando nuevamente.`);
      }
    }
    cooldowns.set(chatId, now);

    const datas = global;
    const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
    
    let tradutor = {};
    try {
      const translationData = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`, 'utf8'));
      tradutor = translationData.plugins?.gc_kick2 || {};
    } catch (e) {
      tradutor = {
        texto1: ['Necesitas habilitar restrict', 'para usar este comando'],
        texto2: 'Debes mencionar a un usuario o responder a su mensaje'
      };
    }

    if (!global.db.data.settings[conn.user.jid]?.restrict) {
      throw `${tradutor.texto1?.[0] || 'Necesitas habilitar restrict'} (enable restrict / disable restrict) ${tradutor.texto1?.[1] || 'para usar este comando'}`;
    }

    const kicktext = `${tradutor.texto2 || 'Debes mencionar a un usuario'}\n*${usedPrefix + command} @${global.suittag?.[0] || 'usuario'}*`;

    const resolveLid = (jid) => {
      if (!jid) return null;
      if (!jid.includes('@lid')) return jid;
      const p = groupParticipants.find(u => u.lid === jid);
      return p?.id || null;
    };

    let userToRemove = null;

    if (m.mentionedJid?.[0]) {
      userToRemove = resolveLid(m.mentionedJid[0]) || m.mentionedJid[0];
    } else if (m.quoted?.sender) {
      userToRemove = resolveLid(m.quoted.sender) || m.quoted.sender;
    } else if (text) {
      const num = text.replace(/[^0-9]/g, '');
      if (num.length < 11 || num.length > 15) {
        return m.reply('*[◉] El número ingresado es incorrecto.*');
      }
      userToRemove = num + '@s.whatsapp.net';
    }

    if (!userToRemove) {
      return m.reply(kicktext, m.chat, { mentions: conn.parseMention(kicktext) });
    }

    if (userToRemove === conn.user.jid) {
      return m.reply('*🤖 No puedo expulsarme a mí mismo.*');
    }

    const decodedUserToRemove = conn.decodeJid(userToRemove);
    const exists = groupParticipants.find(p => conn.decodeJid(p.id) === decodedUserToRemove);
    
    if (!exists) {
      return m.reply('*[◉] La persona mencionada no está en el grupo.*');
    }

    await conn.groupParticipantsUpdate(chatId, [userToRemove], 'remove');
    
    clearGroupCache(chatId);
    
    await m.reply(`✅ @${userToRemove.split('@')[0]} ha sido expulsado del grupo.`, null, {
      mentions: [userToRemove]
    });
  } catch (e) {
    console.error('Error en kick:', e);
    await m.reply('*[◉] No se pudo expulsar al usuario. Puede que sea admin o WhatsApp no lo permita.*');
  }
};

handler.help = ['kick <@user>', 'echar <@user>'];
handler.tags = ['group'];
handler.command = /^(kick|echar|hechar|sacar)$/i;
handler.group = true;

export default handler;