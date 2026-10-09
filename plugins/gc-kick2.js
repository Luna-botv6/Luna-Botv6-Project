import fs from 'fs';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';
import { marcarMotivo } from '../lib/funcion/leave-reason.js';

const cooldowns = new Map();

const handler = async (m, { isOwner, conn, text, command, usedPrefix }) => {
  try {
    if (usedPrefix === 'a' || usedPrefix === 'A') return;
    if (!m.isGroup) return m.reply('⌠Este comando solo funciona en grupos');

    const chatId   = m.chat;
    const senderId = m.sender;
    const now      = Date.now();
    const cooldownTime = 2 * 60 * 1000;

    const idioma   = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
    const tFull    = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'));
    const t        = tFull.plugins?.gc_kick2   || {};
    const tGrp     = tFull.functions?.group_msgs || {};

    const groupData = await getGroupDataForPlugin(conn, chatId, senderId);
    const { isAdmin, isBotAdmin, participants: groupParticipants } = groupData;

    if (!isAdmin && !isOwner) return m.reply(t.no_admin     || '⚠️ Solo administradores pueden usar este comando.');
    if (!isBotAdmin)          return m.reply(t.no_bot_admin || '⚠️ Necesito ser administrador para expulsar usuarios.');

    if (cooldowns.has(chatId)) {
      const expire = cooldowns.get(chatId) + cooldownTime;
      if (now < expire) {
        const left = expire - now;
        const mins = Math.floor(left / 60000);
        const secs = Math.floor((left % 60000) / 1000);
        return m.reply((t.cooldown || '⏰ Espera {min}m {seg}s.').replace('{min}', mins).replace('{seg}', secs));
      }
    }
    cooldowns.set(chatId, now);

    if (!global.db.data.settings[conn.user.jid]?.restrict) {
      return m.reply(t.no_restrict || '⚠️ Necesitas habilitar *restrict* para usar este comando.');
    }

    const resolveLidToJid = (jid) => {
      if (!jid) return null;
      if (jid.includes('@lid')) {
        const found = groupParticipants.find(p => p.lid === jid);
        return found?.id || null;
      }
      return jid;
    };

    const findParticipantByJid = (jid) => {
      if (!jid) return null;
      const decoded = conn.decodeJid(jid);
      return groupParticipants.find(p => conn.decodeJid(p.id) === decoded);
    };

    let targetJid = null;
    let reason    = '';

    if (m.mentionedJid?.[0]) {
      targetJid = resolveLidToJid(m.mentionedJid[0]) || m.mentionedJid[0];
      reason    = text.replace(/@\d+/g, '').trim();
    } else if (m.quoted?.sender) {
      targetJid = resolveLidToJid(m.quoted.sender) || m.quoted.sender;
      reason    = text?.trim() || '';
    } else if (text) {
      const numMatch = text.match(/(\d{11,15})(.*)/);
      if (!numMatch) return m.reply(t.wrong_number || '*[◉] El número ingresado es incorrecto.*');
      targetJid = numMatch[1] + '@s.whatsapp.net';
      reason    = numMatch[2]?.trim() || '';
    }

    if (!targetJid) {
      const fallback = (t.no_target || 'Menciona a un usuario.\n*{prefix}{cmd} @usuario*')
        .replace('{prefix}', usedPrefix)
        .replace('{cmd}', command);
      return m.reply(fallback, m.chat, { mentions: conn.parseMention(fallback) });
    }

    const botJid        = conn.decodeJid(conn.user.jid);
    const decodedTarget = conn.decodeJid(targetJid);

    if (decodedTarget === botJid) return m.reply(t.cant_kick_self  || '*🤖 No puedo expulsarme a mí mismo.*');

    const targetParticipant = findParticipantByJid(targetJid);
    if (!targetParticipant)  return m.reply(t.not_in_group    || '*[◉] La persona mencionada no está en el grupo.*');
    if (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin') {
      return m.reply(t.cant_kick_admin || '*[◉] No puedo expulsar a un administrador del grupo.*');
    }

    const jidToKick = targetParticipant.id;
    const chat      = global.db.data.chats[chatId] || {};

    marcarMotivo(chatId, [jidToKick, targetParticipant.lid, targetParticipant.phoneNumber], {
      tipo: 'kick',
      motivo: reason,
      autor: senderId
    });

    await conn.groupParticipantsUpdate(chatId, [jidToKick], 'remove');
    clearGroupCache(chatId, conn);
  } catch (e) {
    console.error('Error en kick:', e);
    await m.reply('*[◉] No se pudo expulsar al usuario. Puede que sea admin o WhatsApp no lo permita.*');
  }
};

handler.help = ['kick <@user> [motivo]', 'echar <@user> [motivo]'];
handler.tags = ['group'];
handler.command = /^(kick|echar|hechar|sacar)$/i;
handler.group = true;
handler.ownerProtect = true;

export default handler;
