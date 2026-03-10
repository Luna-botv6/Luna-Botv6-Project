import fs from 'fs';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';

const cooldowns = new Map();

const handler = async (m, { isOwner, conn, text, command, usedPrefix }) => {
  try {
    if (usedPrefix == 'a' || usedPrefix == 'A') return;
    if (!m.isGroup) return m.reply('⌠Este comando solo funciona en grupos');

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

    // Resuelve cualquier JID o LID al JID real del participante
    const resolveParticipant = (jid) => {
      if (!jid) return null;
      const num = jid.replace(/[^0-9]/g, '');
      // 1. match exacto por id
      let p = groupParticipants.find(p => p.id === jid);
      if (p) return p;
      // 2. match exacto por lid
      p = groupParticipants.find(p => p.lid === jid);
      if (p) return p;
      // 3. match por numero en id o lid (cubre LID, JID con sufijo :XX, etc)
      p = groupParticipants.find(p =>
        (p.id  || '').replace(/[^0-9]/g, '') === num ||
        (p.lid || '').replace(/[^0-9]/g, '') === num
      );
      return p || null;
    };

    // Buscar participante desde mención, respuesta o número
    let rawJid = null;
    if (m.mentionedJid?.[0])  rawJid = m.mentionedJid[0];
    else if (m.quoted?.sender) rawJid = m.quoted.sender;
    else if (text) {
      const num = text.replace(/[^0-9]/g, '');
      if (num.length < 11 || num.length > 15) return m.reply('*[◉] El número ingresado es incorrecto.*');
      rawJid = num + '@s.whatsapp.net';
    }

    if (!rawJid) return m.reply(kicktext, m.chat, { mentions: conn.parseMention(kicktext) });

    const targetParticipant = resolveParticipant(rawJid);
    if (!targetParticipant) return m.reply('*[◉] La persona mencionada no está en el grupo.*');

    const jidToKick = targetParticipant.id;
    const botNum = (conn.user.jid || '').replace(/[^0-9]/g, '');
    if (jidToKick.replace(/[^0-9]/g, '') === botNum) return m.reply('*🤖 No puedo expulsarme a mí mismo.*');
    if (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin') return m.reply('*[◉] No puedo expulsar a un administrador del grupo.*');

    await conn.groupParticipantsUpdate(chatId, [jidToKick], 'remove');
    clearGroupCache(chatId);

    const displayNumber = jidToKick.split('@')[0];
    await m.reply('✅ @' + displayNumber + ' ha sido expulsado del grupo.', null, { mentions: [jidToKick] });
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
