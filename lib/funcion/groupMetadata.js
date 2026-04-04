import { addAdminToCache, removeAdminFromCache, updateGroupAdmins } from './pluginHelper.js';
import { registerLidPhone } from './lid-resolver.js';

const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const actionDeduplicator = new Map();

export async function getGroupMetadata(conn, chatId, groupCache, senderJid) {
  try {
    const cached = groupCache.get(chatId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }

    const metadata = conn.chats?.[chatId]?.metadata || await conn.groupMetadata(chatId).catch(() => null);

    if (metadata) {
      const participants = (metadata.participants || []).map(p => ({
        id:    p.id || p.jid,
        lid:   p.lid || null,
        admin: p.admin || null,
      }));

      for (const p of participants) {
        if (p.lid && p.id) registerLidPhone(p.lid, p.id);
      }

      await updateGroupAdmins(chatId, participants, conn);

      const decodedSender = conn.decodeJid(senderJid);
      const botJid        = conn.decodeJid(conn.user.jid);

      const userGroup = participants.find(u => conn.decodeJid(u.id) === decodedSender) || {};
      const botGroup  = participants.find(u => conn.decodeJid(u.id) === botJid) || {};

      const groupData = {
        groupMetadata: metadata,
        participants,
        userGroup,
        botGroup,
        isAdmin:    userGroup?.admin === 'admin' || userGroup?.admin === 'superadmin',
        isRAdmin:   userGroup?.admin === 'superadmin',
        isBotAdmin: botGroup?.admin  === 'admin' || botGroup?.admin  === 'superadmin',
      };

      if (groupCache.size >= MAX_CACHE_SIZE) {
        groupCache.delete(groupCache.keys().next().value);
      }

      groupCache.set(chatId, { data: groupData, timestamp: Date.now() });

      return groupData;
    }

    return { groupMetadata: {}, participants: [], userGroup: {}, botGroup: {}, isAdmin: false, isRAdmin: false, isBotAdmin: false };
  } catch {
    return { groupMetadata: {}, participants: [], userGroup: {}, botGroup: {}, isAdmin: false, isRAdmin: false, isBotAdmin: false };
  }
}

export async function handleWelcomeMessage(conn, id, groupMetadata, participant, chat) {
  try {
    const userJid = participant.id || participant.phoneNumber || '';
    if (!userJid) return null;

    let pp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
    try { pp = await conn.profilePictureUrl(userJid, 'image'); } catch {}

    const apii = await conn.getFile(pp).catch(() => ({}));
    const totalMembers = groupMetadata?.participants?.length || 0;
    const groupName    = groupMetadata?.subject || 'el grupo';
    const groupDesc    = groupMetadata?.desc?.toString() || 'Sin descripción';

    let text = chat.sWelcome?.trim()
      ? chat.sWelcome
      : `🌙 *¡Bienvenido/a a ${groupName}!* ✨\n\n👋 ¡Hola, @user!\n🌟 Ahora somos *${totalMembers}* miembros en este grupo.\n📖 Te invitamos a leer la descripción del grupo:.\n\n*@desc*\n\n*¡Que disfrutes tu estancia!* 🎉`;

    text = text
      .replace(/@user/g,  '@' + userJid.split('@')[0])
      .replace(/@group/g, groupName)
      .replace(/@desc/g,  groupDesc)
      .replace(/@total/g, totalMembers.toString());

    return { text, apii, userJid };
  } catch {
    return null;
  }
}

export async function handleGoodbyeMessage(conn, id, groupMetadata, participant, chat) {
  try {
    const userJid = participant.id || participant.phoneNumber || '';
    if (!userJid) return null;

    let pp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
    try { pp = await conn.profilePictureUrl(userJid, 'image'); } catch {}

    const apii = await conn.getFile(pp).catch(() => ({}));
    const totalMembers = Math.max(0, (groupMetadata?.participants?.length || 1) - 1);
    const groupName    = groupMetadata?.subject || 'el grupo';

    let text = chat.sBye?.trim()
      ? chat.sBye
      : `🌙 *¡Hasta pronto!* 👫\n\n👋 Adiós, @user\n🌟 Ahora quedamos *${totalMembers}* miembros.\n\n*¡Esperamos verte de nuevo!* ✨`;

    text = text
      .replace(/@user/g,  '@' + userJid.split('@')[0])
      .replace(/@group/g, groupName)
      .replace(/@total/g, totalMembers.toString());

    return { text, apii, userJid };
  } catch {
    return null;
  }
}

export async function sendWelcomeOrGoodbye(conn, id, messageData) {
  try {
    if (!messageData) return;
    const { text, apii, userJid } = messageData;

    if (apii?.data) {
      await conn.sendFile(id, apii.data, 'pp.jpg', text, null, false, { mentions: [userJid] })
        .catch(() => conn.sendMessage(id, { text, mentions: [userJid] }));
    } else {
      await conn.sendMessage(id, { text, mentions: [userJid] });
    }
  } catch {}
}

export async function handlePromoteDemote(conn, id, chat, participantsList, action, authorJid) {
  try {
    const isPromote = ['promote', 'daradmin', 'darpoder'].includes(action);
    const isDemote  = ['demote', 'quitaradmin', 'quitarpoder'].includes(action);

    let text = '';
    if (isPromote) text = chat.sPromote || '🌙 *¡Promoción!* ✨\n\n👑 @tag ha promovido a @user como administrador/a del grupo.\n\n*¡Felicidades!* 🎉';
    else if (isDemote) text = chat.sDemote || '🌙 *Cambio de rol* 👫\n\n📉 @tag ha removido a @user como administrador/a del grupo.';

    if (!text || participantsList.length === 0) return;

    const userJid = participantsList[0].phoneNumber || participantsList[0].id || '';
    if (!userJid || !authorJid) return;

    text = text
      .replace(/@user/g, '@' + userJid.split('@')[0])
      .replace(/@tag/g,  '@' + authorJid.split('@')[0]);

    if (chat.detect && !chat.isBanned) {
      await conn.sendMessage(id, { text, mentions: [userJid, authorJid] });
    }
  } catch {}
}

export async function handleParticipantsUpdate(
  conn, id, participants, action,
  globalLoadDatabase, globalConfig, globalDb, opts, groupCache
) {
  try {
    if (!conn?.user?.jid) return;
    if (opts.self) return;
    if (globalDb.data == null) await globalLoadDatabase();

    const chat = globalDb.data.chats[id] = globalConfig(id);
    const normalizedAction = action === 'leave' ? 'remove' : action;

    let participantsList = [];
    if (Array.isArray(participants)) {
      participantsList = participants.map(p => typeof p === 'string' ? { id: p, phoneNumber: p } : p);
    } else if (typeof participants === 'string') {
      participantsList = [{ id: participants, phoneNumber: participants }];
    }

    const deduplicateKey = `${id}_${normalizedAction}_${participantsList.map(p => p.id || p.phoneNumber || '').filter(Boolean).sort().join(',')}`;
    if (actionDeduplicator.has(deduplicateKey)) return;
    actionDeduplicator.set(deduplicateKey, true);
    setTimeout(() => actionDeduplicator.delete(deduplicateKey), 5000);

    if (normalizedAction === 'add' || normalizedAction === 'remove') {
      if (!chat.welcome || chat.isBanned) return;

      const groupMetadata = conn.chats?.[id]?.metadata || await conn.groupMetadata(id).catch(() => ({}));

      for (const participant of participantsList) {
        const userJid = participant.id || participant.phoneNumber;
        if (!userJid) continue;
        if (normalizedAction === 'remove' && userJid === conn.user.jid) continue;

        const data = normalizedAction === 'add'
          ? await handleWelcomeMessage(conn, id, groupMetadata, participant, chat)
          : await handleGoodbyeMessage(conn, id, groupMetadata, participant, chat);

        await sendWelcomeOrGoodbye(conn, id, data);
      }
    } else if (['promote', 'demote', 'daradmin', 'quitaradmin', 'darpoder', 'quitarpoder'].includes(normalizedAction)) {
      const isPromote = ['promote', 'daradmin', 'darpoder'].includes(normalizedAction);

      for (const participant of participantsList) {
        const userJid = participant.id || participant.phoneNumber;
        if (!userJid) continue;
        if (isPromote) addAdminToCache(id, userJid);
        else removeAdminFromCache(id, userJid);
      }

      await handlePromoteDemote(conn, id, chat, participantsList, normalizedAction, conn.user?.jid);
    }
  } catch {}
}
