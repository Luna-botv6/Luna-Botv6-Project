import { isVoiceMessage, handleVoiceMessage } from './voice-handler.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { getConfig } from '../lib/funcConfig.js';
import { dispatchToPlugins } from './pluginDispatch.js';
import { isBanned } from '../plugins/lunaia/banchat-plugin.js';
import banchatPlugin from '../plugins/lunaia/banchat-plugin.js';
import { esBotIgnorado, MARCA_LUNA } from '../lib/funcion/botsIgnorados.js';
import { etiquetaUsuarioParaLog, etiquetaChatParaLog, resolveJidToPhone } from '../lib/funcion/lid-resolver.js';
import { getOwnerNumbers, isSubOwnerJid } from '../lib/funcion/system-owners.js';
import { modoOwnerActivo, puedeUsarBot } from '../lib/funcion/modo-owner.js';
import { cleanMessageText, esMencionSinContenido, tieneMencionPosible } from '../lib/funcion/mencion-sola.js';
import { hayConfirmacionPendiente } from '../lib/funcion/confirmacion.js';
import chalk from 'chalk';

export default function mentionListener(conn) {
  const recentMsgs = new Map();
  const participantNames = new Map();
  const PARTICIPANT_NAMES_MAX = 300;
  let botNumber = null;

  function rememberParticipantName(key, value) {
    if (participantNames.size >= PARTICIPANT_NAMES_MAX) {
      participantNames.delete(participantNames.keys().next().value);
    }
    participantNames.set(key, value);
  }

  function isGroupChat(jid) {
    return jid.endsWith('@g.us');
  }

  let cachedOwnersCodes = null;
  let cachedOwnersCodesAt = 0;

  function getOwnerCodes() {
    const now = Date['now']();
    if (now < cachedOwnersCodesAt) return cachedOwnersCodes;
    cachedOwnersCodes = getOwnerNumbers();
    cachedOwnersCodesAt = now + 10000;
    return cachedOwnersCodes;
  }

  function isOwnerNumber(id) {
    const digits = String(id || '').replace(/\D/g, '');
    if (!digits) return false;
    return getOwnerCodes().includes(digits);
  }

  function isBotMentioned(msg, text, participants) {
    if (!botNumber) return false;
    const mentionedJid = msg['message']?.['extendedTextMessage']?.['contextInfo']?.['mentionedJid'] || [];
    if (text.includes('@' + botNumber)) return true;
    const botJid = conn.decodeJid(botNumber + '@s.whatsapp.net');
    const botParticipant = (participants || []).find(p => conn.decodeJid(p.id || p.jid || '') === botJid);
    const botLid = botParticipant?.['lid'] || null;
    const lidPropio = (conn && conn.user && (conn.user.lid || conn.user.id)) || null;
    for (const jid of mentionedJid) {
      if (!jid) continue;
      let decoded = null;
      try { decoded = conn.decodeJid(jid); } catch {}
      const matchesNumber = decoded ? decoded.includes(botNumber) : String(jid).replace(/[^0-9]/g, '').includes(String(botNumber).replace(/[^0-9]/g, ''));
      const matchesLid = botLid && (decoded === conn.decodeJid(botLid) || jid === botLid);
      if (matchesNumber || matchesLid) return true;
      try {
        const tel = resolveJidToPhone(jid, conn);
        if (tel && tel.replace(/[^0-9]/g, '') === String(botNumber).replace(/[^0-9]/g, '')) return true;
      } catch {}
      try {
        if (lidPropio && conn.decodeJid(lidPropio) === conn.decodeJid(jid)) return true;
      } catch {}
      if (typeof jid === 'string' && jid.indexOf('@') < 0) {
        try {
          const tel2 = resolveJidToPhone(jid + '@lid', conn);
          if (tel2 && tel2.replace(/[^0-9]/g, '') === String(botNumber).replace(/[^0-9]/g, '')) return true;
        } catch {}
      }
    }
    return false;
  }

  function shouldSkipMessage(msg) {
    const remoteJid = msg['key']['remoteJid'];
    if (msg.key['fromMe']) return true;
    if (remoteJid === 'status@broadcast') return true;
    if (!isGroupChat(remoteJid)) return true;
    return false;
  }

  conn.ev.on('messages.upsert', async upsert => {
    try {
      if (!upsert?.['messages']?.[0]?.['message']) return;
      const msg = upsert.messages[0];
      if (shouldSkipMessage(msg)) return;
      const textoConfirmacion = msg['message']?.['conversation'] || msg['message']?.['extendedTextMessage']?.['text'] || '';
      if (hayConfirmacionPendiente(msg['key']['remoteJid'], msg['key']['participant'] || msg['key']['remoteJid'], msg['key']['participantAlt'], textoConfirmacion)) return;
      if (!tieneMencionPosible(msg)) return;
      const posibleLunaJid = msg['key']['participant'] || msg['key']['remoteJid'];
      const textoBruto = msg['message']?.['conversation'] || msg['message']?.['extendedTextMessage']?.['text'] || '';
      if (textoBruto.includes(MARCA_LUNA)) return;
      if (esBotIgnorado(posibleLunaJid, msg['key']['remoteJid'])) {
        const ialunaChat = msg['key']['remoteJid'];
        console.log(chalk.cyan(`[Ignorado] usuario posible bot ${etiquetaUsuarioParaLog(posibleLunaJid, conn)}${ialunaChat ? ` en chat ${etiquetaChatParaLog(ialunaChat, conn)}` : ''}`));
        return;
      }

      const chatId = msg['key']['remoteJid'];
      const msgId = msg['key'].id;
      const now = Date['now']();
      if (recentMsgs.has(msgId) && now - recentMsgs.get(msgId) < 10000) return;
      recentMsgs.set(msgId, now);
      if (recentMsgs.size > 100) {
        for (const [id, ts] of recentMsgs.entries()) {
          if (now - ts > 300000) recentMsgs.delete(id);
        }
      }

      if (!botNumber && conn['user']?.id) {
        botNumber = conn['user'].id.split('@')[0].split(':')[0];
      }
      if (!botNumber) return;

      const chatSettings = global.db?.['data']?.['settings']?.[conn?.['user']?.['jid']];
      if (chatSettings?.['iaLunaActive'] === false) return;
      try { if (getConfig(chatId)?.ia === false) return; } catch {}

      const senderId = msg['key']['participant'] || msg['key']['remoteJid'];
      const userData = global.db?.['data']?.['users']?.[senderId];
      if (userData?.['banned']) return;

      const chatBaneado = isBanned(msg['key']['remoteJid']);
      const remitenteOwner = isOwnerNumber(senderId);
      if (!puedeUsarBot(modoOwnerActivo(conn), { isOwner: remitenteOwner, isSubOwner: isSubOwnerJid(senderId, conn) })) return;

      const groupData = await getGroupDataForPlugin(conn, chatId, senderId);
      const { participants } = groupData;

      const chatCfg = getConfig(chatId);
      if (chatCfg?.modoadmin && !groupData?.isAdmin && !isOwnerNumber(senderId)) return;

      let senderJid = senderId;
      if (senderId.includes('@lid')) {
        const found = (participants || []).find(p => p['lid'] === senderId);
        if (found?.id) senderJid = conn.decodeJid(found.id);
      }

      const muteKey = chatId + '_' + senderJid;
      const muteData = global.db?.['data']?.['mutes']?.[muteKey];
      if (muteData) {
        if (!muteData['until'] || Date['now']() < muteData['until']) return;
        delete global.db['data']['mutes'][muteKey];
      }

      if (isVoiceMessage(msg)) {
        if (isBotMentioned(msg, '', participants)) {
          await handleVoiceMessage(conn, msg, chatId, recentMsgs);
        }
        return;
      }

      const text = msg['message']['conversation']
        || msg['message']['extendedTextMessage']?.['text']
        || msg['message']['imageMessage']?.['caption']
        || msg['message']['videoMessage']?.['caption']
        || '';
      if (!text) return;
      if (!isBotMentioned(msg, text, participants)) return;

      const textoLimpio = cleanMessageText(text, msg, botNumber);
      const mentionOnly = esMencionSinContenido(textoLimpio);
      const cleanText = mentionOnly ? 'Hola' : textoLimpio;
      if (chatBaneado && !remitenteOwner && !banchatPlugin.canHandle(cleanText)) return;
      const rawMentions = msg['message']?.['extendedTextMessage']?.['contextInfo']?.['mentionedJid'] || [];
      const groupParticipants = groupData?.participants || [];

      const resolveJid = jid => {
        if (!jid.includes('@lid')) return conn.decodeJid(jid);
        const found = groupParticipants.find(p => p['id'] === jid || conn.decodeJid(p.lid || '') === conn.decodeJid(jid));
        return found ? conn.decodeJid(found.id) : conn.decodeJid(jid);
      };

      const botJid = conn.decodeJid(botNumber + '@s.whatsapp.net');
      const botParticipant = groupParticipants.find(p => conn.decodeJid(p.id) === botJid);
      const botLid = botParticipant?.['lid'] || null;

      const mentionedJids = rawMentions
        .filter(jid => {
          if (jid === botLid) return false;
          if (botLid && conn.decodeJid(jid) === conn.decodeJid(botLid)) return false;
          const resolved = resolveJid(jid);
          return !resolved.includes(botNumber);
        })
        .map(jid => resolveJid(jid));

      const mentionedNames = {};
      if (rawMentions.length) {
        for (const participant of groupParticipants) {
          const decoded = conn.decodeJid(participant.id || participant['jid'] || '');
          const name = participant['name'] || participant['pushName'] || null;
          const numberPart = decoded.split('@')[0];
          if (decoded) rememberParticipantName(decoded, name || numberPart);
          if (participant['lid']) {
            const decodedLid = conn.decodeJid(participant['lid']);
            if (decodedLid) rememberParticipantName(decodedLid, name || numberPart);
          }
        }
        for (const jid of rawMentions) {
          const decoded = resolveJid(jid);
          if (decoded.includes(botNumber)) continue;
          const name = participantNames.get(decoded) || participantNames.get(conn.decodeJid(jid));
          const numberPart = decoded.split('@')[0];
          if (numberPart) mentionedNames[decoded] = name || numberPart;
        }
      }

      const context = {
        conn,
        msg,
        jid: chatId,
        isGroup: true,
        isPrivate: false,
        groupData,
        mentionedJids,
        mentionedNames,
        botNumber,
        mentionOnly
      };

      const contextInfoPre = msg['message']?.['extendedTextMessage']?.['contextInfo'];
      if (contextInfoPre?.['mentionedJid']?.['length']) {
        contextInfoPre['mentionedJid'] = contextInfoPre['mentionedJid'].filter(jid => {
          const decoded = conn.decodeJid(jid);
          if (botLid && (jid === botLid || decoded === conn.decodeJid(botLid))) return false;
          return !decoded.includes(botNumber);
        });
      }

      await dispatchToPlugins(cleanText, context);
    } catch (err) {}
  });
}