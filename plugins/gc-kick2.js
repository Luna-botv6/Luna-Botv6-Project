import fs from 'fs';
import { getGroupDataForPlugin, clearGroupCache, resolveRealJidDeLid } from '../lib/funcion/pluginHelper.js';
import { marcarMotivo } from '../lib/funcion/leave-reason.js';
import { esInmune, avisoInmunidad, esInmuneDigitos } from '../lib/funcion/proteccion-grupo.js';
import { buscarParticipante, soloDigitos } from '../lib/funcion/participantes.js';
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js';

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
    let { participants: groupParticipants } = groupData;
    const { isAdmin, isBotAdmin } = groupData;

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

    const resolverEnGrupo = (raw, lista) => {
      if (!raw) return null;
      const directo = buscarParticipante(lista, raw, conn);
      if (directo) return directo;
      try {
        const real = resolveRealJidDeLid(raw);
        if (real && real !== raw) return buscarParticipante(lista, real, conn);
      } catch {}
      return null;
    };

    const recolectarObjetivo = (lista) => {
      if (m.mentionedJid?.[0]) {
        const crudo = m.mentionedJid[0];
        return { participante: resolverEnGrupo(crudo, lista), crudo, motivo: text.replace(/@\d+/g, '').trim() };
      }
      if (m.quoted) {
        const candidatos = [
          m.quoted.sender,
          m.quoted.participant,
          m.msg?.contextInfo?.participant,
          m.quoted.key?.participant,
          m.quoted.author
        ].filter(Boolean);
        for (const candidato of candidatos) {
          const encontrado = resolverEnGrupo(candidato, lista);
          if (encontrado) return { participante: encontrado, crudo: candidato, motivo: text?.trim() || '' };
        }
        return { participante: null, crudo: candidatos[0] || null, motivo: text?.trim() || '' };
      }
      if (text) {
        const numMatch = text.match(/(\d{11,15})(.*)/);
        if (!numMatch) return { participante: null, crudo: null, motivo: '', numeroInvalido: true };
        const crudo = numMatch[1] + '@s.whatsapp.net';
        return { participante: resolverEnGrupo(crudo, lista), crudo, motivo: numMatch[2]?.trim() || '' };
      }
      return { participante: null, crudo: null, motivo: '' };
    };

    let objetivo = recolectarObjetivo(groupParticipants);
    if (!objetivo.participante && !objetivo.numeroInvalido) {
      clearGroupCache(chatId, conn);
      const fresco = await getGroupDataForPlugin(conn, chatId, senderId);
      groupParticipants = fresco.participants || groupParticipants;
      objetivo = recolectarObjetivo(groupParticipants);
    }

    if (objetivo.numeroInvalido) {
      return m.reply(t.wrong_number || '*[◉] El número ingresado es incorrecto.*');
    }

    let targetParticipant = objetivo.participante;
    const reason = objetivo.motivo || '';
    let targetJid = targetParticipant
      ? (targetParticipant.id || targetParticipant.phoneNumber || targetParticipant.lid)
      : objetivo.crudo;

    if (!targetJid) {
      const fallback = (t.no_target || 'Menciona a un usuario.\n*{prefix}{cmd} @usuario*')
        .replace('{prefix}', usedPrefix)
        .replace('{cmd}', command);
      return m.reply(fallback, m.chat, { mentions: conn.parseMention(fallback) });
    }

    const botJid        = conn.decodeJid(conn.user.jid);
    const decodedTarget = conn.decodeJid(targetJid);

    if (decodedTarget === botJid) return m.reply(t.cant_kick_self  || '*🤖 No puedo expulsarme a mí mismo.*');

    if (targetParticipant) {
      if (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin') {
        return m.reply(t.cant_kick_admin || '*[◉] No puedo expulsar a un administrador del grupo.*');
      }

      if (esInmune(chatId, targetParticipant, conn, groupParticipants)) {
        const aviso = avisoInmunidad({
          chat: chatId,
          jid: targetParticipant,
          conn,
          participants: groupParticipants,
          accion: 'kick',
          prefix: usedPrefix
        });
        if (aviso) return conn.sendMessage(chatId, { text: aviso.texto, mentions: aviso.mentions }, { quoted: m });
        return m.reply(t.inmune || '*[◉] Ese usuario tiene inmunidad en este grupo.*');
      }
    } else {
      const digitos = [soloDigitos(targetJid)];
      try {
        const tel = resolveJidToPhone(targetJid, conn);
        if (tel) digitos.push(soloDigitos(tel));
      } catch {}
      if (esInmuneDigitos(chatId, digitos)) {
        return m.reply(t.inmune || '*[◉] Ese usuario tiene inmunidad en este grupo.*');
      }
    }

    const jidToKick = targetJid;
    const chat      = global.db.data.chats[chatId] || {};

    marcarMotivo(chatId, [jidToKick, targetParticipant?.lid, targetParticipant?.phoneNumber], {
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
