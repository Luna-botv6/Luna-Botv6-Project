import fs from 'fs';

const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const requestDelay = new Map();

export async function getGroupMetadata(conn, chatId, groupCache, senderJid) {
  try {
    const cached = groupCache.get(chatId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }

    const lastRequest = requestDelay.get(chatId) || 0;
    const timeSince = Date.now() - lastRequest;
    if (timeSince < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSince));
    }
    requestDelay.set(chatId, Date.now());

    const metadata = conn.chats?.[chatId]?.metadata || await conn.groupMetadata(chatId).catch(_ => null);

    if (metadata) {
      const participants = (metadata.participants || []).map(p => ({
        id: p.id || p.jid,
        admin: p.admin
      }));

      const decodedSender = conn.decodeJid(senderJid);
      const botJid = conn.decodeJid(conn.user.jid);

      const userGroup = participants.find(u => conn.decodeJid(u.id) === decodedSender) || {};
      const botGroup = participants.find(u => conn.decodeJid(u.id) === botJid) || {};

      const groupData = {
        groupMetadata: metadata,
        participants,
        userGroup,
        botGroup,
        isAdmin: userGroup?.admin === 'admin' || userGroup?.admin === 'superadmin',
        isRAdmin: userGroup?.admin === 'superadmin',
        isBotAdmin: !!botGroup?.admin
      };

      if (groupCache.size >= MAX_CACHE_SIZE) {
        const firstKey = groupCache.keys().next().value;
        groupCache.delete(firstKey);
      }

      groupCache.set(chatId, {
        data: groupData,
        timestamp: Date.now()
      });

      return groupData;
    }

    return {
      groupMetadata: {},
      participants: [],
      userGroup: {},
      botGroup: {},
      isAdmin: false,
      isRAdmin: false,
      isBotAdmin: false
    };
  } catch {
    return {
      groupMetadata: {},
      participants: [],
      userGroup: {},
      botGroup: {},
      isAdmin: false,
      isRAdmin: false,
      isBotAdmin: false
    };
  }
}

export async function handleWelcomeMessage(conn, id, groupMetadata, participant, chat) {
  try {
    const userJid = participant.phoneNumber || participant.id || '';
    if (!userJid) return null;

    let pp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
    try {
      pp = await conn.profilePictureUrl(userJid, 'image');
    } catch {}

    const apii = await conn.getFile(pp).catch(() => ({}));

    let text = chat.sWelcome && chat.sWelcome.trim() !== ''
      ? chat.sWelcome
      : '¡Bienvenido/a @user al grupo @group!';

    text = text
      .replace(/@user/g, '@' + userJid.split('@')[0])
      .replace(/@group/g, groupMetadata?.subject || 'Grupo')
      .replace(/@desc/g, groupMetadata?.desc?.toString() || '*SIN DESCRIPCIÓN*');

    return { text, apii, userJid };
  } catch {
    return null;
  }
}

export async function handleGoodbyeMessage(conn, id, groupMetadata, participant, chat) {
  try {
    const userJid = participant.phoneNumber || participant.id || '';
    if (!userJid) return null;

    let pp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
    try {
      pp = await conn.profilePictureUrl(userJid, 'image');
    } catch {}

    const apii = await conn.getFile(pp).catch(() => ({}));

    let text = chat.sBye && chat.sBye.trim() !== ''
      ? chat.sBye
      : 'Adiós @user';

    text = text.replace(/@user/g, '@' + userJid.split('@')[0]);

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
      await conn.sendFile(
        id,
        apii.data,
        'pp.jpg',
        text,
        null,
        false,
        { mentions: [userJid] }
      ).catch(() =>
        conn.sendMessage(id, { text, mentions: [userJid] })
      );
    } else {
      await conn.sendMessage(id, { text, mentions: [userJid] });
    }
  } catch {}
}

export async function handlePromoteDemote(conn, id, chat, participantsList, action, authorJid) {
  try {
    let text = '';

    if (action === 'promote' || action === 'daradmin' || action === 'darpoder') {
      text = chat.sPromote || '*[ ℹ️ ] @author promovió a administrador a @user.*';
    }

    if (action === 'demote' || action === 'quitaradmin' || action === 'quitarpoder') {
      text = chat.sDemote || '*[ ℹ️ ] @author quitó administrador a @user.*';
    }

    if (!text || participantsList.length === 0) return;

    const userJid = participantsList[0].phoneNumber || participantsList[0].id || '';
    if (!userJid || !authorJid) return;

    text = text
      .replace(/@user/g, '@' + userJid.split('@')[0])
      .replace(/@author/g, '@' + authorJid.split('@')[0]);

    if (chat.detect && !chat.isBanned) {
      await conn.sendMessage(id, {
        text,
        mentions: [userJid, authorJid]
      });
    }
  } catch {}
}

export async function handleParticipantsUpdate(
  mconn,
  id,
  participants,
  action,
  globalLoadDatabase,
  globalConfig,
  globalDb,
  opts,
  groupCache
) {
  try {
    if (opts.self) return;
    if (globalDb.data == null) await globalLoadDatabase();

    const chat = globalDb.data.chats[id] = globalConfig(id);
    const normalizedAction = action === 'leave' ? 'remove' : action;

    let participantsList = [];
    if (Array.isArray(participants)) {
      participantsList = participants.map(p =>
        typeof p === 'string'
          ? { phoneNumber: p.replace(/[^0-9]/g, '') + '@s.whatsapp.net' }
          : p
      );
    } else if (typeof participants === 'string') {
      participantsList = [{ phoneNumber: participants.replace(/[^0-9]/g, '') + '@s.whatsapp.net' }];
    }

    const authorJid = mconn?.key?.participant || mconn?.participant;

    switch (normalizedAction) {
      case 'add':
      case 'remove': {
        if (!chat.welcome || chat.isBanned) return;

        const groupMetadata = mconn?.conn?.chats[id]?.metadata
          || await mconn.conn.groupMetadata(id).catch(() => ({}));

        for (const participant of participantsList) {
          const userJid = participant.phoneNumber || participant.id;
          if (!userJid) continue;
          if (normalizedAction === 'remove' && userJid === mconn.conn.user.jid) continue;

          if (normalizedAction === 'add') {
            const data = await handleWelcomeMessage(mconn.conn, id, groupMetadata, participant, chat);
            await sendWelcomeOrGoodbye(mconn.conn, id, data);
          } else {
            const data = await handleGoodbyeMessage(mconn.conn, id, groupMetadata, participant, chat);
            await sendWelcomeOrGoodbye(mconn.conn, id, data);
          }
        }
        break;
      }

      case 'promote':
      case 'demote':
      case 'daradmin':
      case 'quitaradmin':
      case 'darpoder':
      case 'quitarpoder':
        await handlePromoteDemote(
          mconn.conn,
          id,
          chat,
          participantsList,
          normalizedAction,
          authorJid
        );
        break;
    }
  } catch {}
}
