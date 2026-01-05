import fs from 'fs';
import { readFile } from 'fs/promises';

const CACHE_TTL = 2 * 60 * 1000;
const MAX_CACHE_SIZE = 150;

export async function getGroupMetadata(conn, chatId, groupCache, senderJid) {
  try {
    const cachedData = getCachedGroupData(chatId, groupCache);
    if (cachedData) {
      return cachedData;
    }

    const metadata = conn.chats?.[chatId]?.metadata || await conn.groupMetadata(chatId).catch(_ => null);
    
    if (metadata) {
      const participants = (metadata.participants || []).map(p => ({
        id: p.id || p.jid,
        jid: p.id || p.jid,
        lid: p.lid,
        admin: p.admin
      }));
      
      const decodedSender = conn.decodeJid(senderJid);
      
      const userGroup = participants.find(u => {
        const decodedParticipant = conn.decodeJid(u.id);
        return decodedParticipant === decodedSender;
      }) || {};
      
      const botDecodedJid = conn.decodeJid(conn.user.jid);
      
      const botData = metadata.participants?.find(p => {
        const pDecoded = conn.decodeJid(p.id || p.jid);
        return pDecoded === botDecodedJid;
      });
      
      const botGroup = participants.find(u => {
        const decodedBot = conn.decodeJid(u.id);
        return decodedBot === botDecodedJid;
      }) || {};
      
      const isRAdmin = userGroup?.admin === 'superadmin' || false;
      const isAdmin = isRAdmin || userGroup?.admin === 'admin' || false;
      const isBotAdmin = botGroup?.admin ? true : false;
      
      const groupData = {
        groupMetadata: metadata,
        participants,
        userGroup,
        botGroup,
        isAdmin,
        isRAdmin,
        isBotAdmin
      };
      
      setCachedGroupData(chatId, groupData, groupCache);
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
  } catch (e) {
    console.error(`Error obteniendo metadata del grupo: ${e.message}`);
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

export function getCachedGroupData(chatId, groupCache) {
  const cached = groupCache.get(chatId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  groupCache.delete(chatId);
  return null;
}

export function setCachedGroupData(chatId, data, groupCache) {
  if (groupCache.size >= MAX_CACHE_SIZE) {
    const firstKey = groupCache.keys().next().value;
    groupCache.delete(firstKey);
  }
  
  groupCache.set(chatId, {
    data,
    timestamp: Date.now()
  });
}

export async function handleWelcomeMessage(conn, m, id, groupMetadata, participant, chat, tradutor) {
  try {
    const userJid = participant.phoneNumber || participant.id || '';
    
    if (!userJid) return;

    let pp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png?q=60';

    try {
      pp = await conn.profilePictureUrl(userJid, 'image');
    } catch (e) {}
    
    const apii = await conn.getFile(pp).catch(() => ({}));
    
    let antiArab = [];
    try {
      const antiArabData = await fs.promises.readFile('./src/antiArab.json', 'utf8');
      antiArab = JSON.parse(antiArabData);
    } catch (e) {}
    
    const userPrefix = antiArab.some((prefix) => userJid.startsWith(prefix));
    const botTt2 = groupMetadata?.participants?.find((u) => conn.decodeJid(u.id || u.jid) === conn.decodeJid(conn.user.jid)) || {};
    const isBotAdminNn = botTt2?.admin === 'admin' || false;

    let text = '';
    if (chat.sWelcome && chat.sWelcome.trim() !== '') {
      text = chat.sWelcome
        .replace('@user', '@' + userJid.split('@')[0])
        .replace('@subject', await conn.getName(id))
        .replace('@group', groupMetadata?.subject || 'Grupo')
        .replace('@desc', groupMetadata?.desc?.toString() || '*SIN DESCRIPCIÓN*');
    } else {
      text = (tradutor.texto1 || '¡Bienvenido/a @user!')
        .replace('@user', '@' + userJid.split('@')[0])
        .replace('@subject', await conn.getName(id))
        .replace('@group', groupMetadata?.subject || 'Grupo')
        .replace('@desc', groupMetadata?.desc?.toString() || '*SIN DESCRIPCIÓN*');
    }

    return { text, apii, userJid, userPrefix, isBotAdminNn };
  } catch (e) {
    console.error(`Error en handleWelcomeMessage: ${e.message}`);
    return null;
  }
}

export async function handleGoodbyeMessage(conn, m, id, groupMetadata, participant, chat, tradutor) {
  try {
    const userJid = participant.phoneNumber || participant.id || '';
    
    if (!userJid) return null;

    let pp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png?q=60';

    try {
      pp = await conn.profilePictureUrl(userJid, 'image');
    } catch (e) {}
    
    const apii = await conn.getFile(pp).catch(() => ({}));

    let text = '';
    if (chat.sBye && chat.sBye.trim() !== '') {
      text = chat.sBye.replace('@user', '@' + userJid.split('@')[0]);
    } else {
      text = (tradutor.texto2 || 'Adiós @user')
        .replace('@user', '@' + userJid.split('@')[0]);
    }

    return { text, apii, userJid };
  } catch (e) {
    console.error(`Error en handleGoodbyeMessage: ${e.message}`);
    return null;
  }
}

export async function sendWelcomeOrGoodbye(conn, id, messageData, isWelcome = true) {
  try {
    if (!messageData) return;

    const { text, apii, userJid } = messageData;

    if (apii?.data) {
      try {
        await conn.sendFile(id, apii.data, 'pp.jpg', text, null, false, { mentions: [userJid] });
      } catch (e) {
        console.error('Error con foto:', e.message);
        await conn.sendMessage(id, { text, mentions: [userJid] }).catch(() => {});
      }
    } else {
      try {
        await conn.sendMessage(id, { text, mentions: [userJid] });
      } catch (e) {
        console.error('Error mensaje:', e.message);
      }
    }
  } catch (e) {
    console.error(`Error en sendWelcomeOrGoodbye: ${e.message}`);
  }
}

export async function handleAntiArab(conn, m, id, userJid, chat, botTt) {
  try {
    let antiArab = [];
    try {
      const antiArabData = await fs.promises.readFile('./src/antiArab.json', 'utf8');
      antiArab = JSON.parse(antiArabData);
    } catch (e) {}
    
    const userPrefix = antiArab.some((prefix) => userJid.startsWith(prefix));
    
    if (userPrefix && chat.antiArab && botTt.restrict) {
      try {
        await conn.groupParticipantsUpdate(id, [userJid], 'remove');
        const fkontak2 = { 'key': { 'participants': '0@s.whatsapp.net', 'remoteJid': 'status@broadcast', 'fromMe': false, 'id': 'Halo' }, 'message': { 'contactMessage': { 'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${userJid.split('@')[0]}:${userJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` } }, 'participant': '0@s.whatsapp.net' };
        await conn.sendMessage(id, { text: `*[•] @${userJid.split('@')[0]} en este grupo no se permiten numeros arabes ni raros.` }, { quoted: fkontak2 });
        return true;
      } catch (e) {
        console.error('Error antiArab:', e.message);
      }
    }
    
    return false;
  } catch (e) {
    console.error(`Error en handleAntiArab: ${e.message}`);
    return false;
  }
}

export async function handlePromoteDemote(conn, id, chat, participantsList, action, tradutor) {
  try {
    let text = '';
    
    if (action === 'promote' || action === 'daradmin' || action === 'darpoder') {
      text = chat.sPromote || tradutor.texto3 || '@user ahora es admin';
    } else if (action === 'demote' || action === 'quitarpoder' || action === 'quitaradmin') {
      text = chat?.sDemote || tradutor.texto4 || '@user ya no es admin';
    }
    
    if (participantsList.length > 0) {
      const userJid = participantsList[0].phoneNumber || participantsList[0].id || '';
      if (userJid) {
        text = text.replace(/@user/g, '@' + userJid.split('@')[0]);
        
        if (chat.detect && !chat?.isBanned) {
          try {
            await conn.sendMessage(id, { text, mentions: [userJid] });
          } catch (e) {
            console.error('Error promote:', e.message);
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error en handlePromoteDemote: ${e.message}`);
  }
}

export async function handleParticipantsUpdate(mconn, id, participants, action, globalLoadDatabase, globalConfig, globalDb, idioma, tradutor, opts, groupCache) {
  try {
    if (opts['self']) return;
    if (globalDb.data == null) await globalLoadDatabase();
    
    const chat = globalDb.data.chats[id] = globalConfig(id);
    const botTt = globalDb.data.settings[mconn?.conn?.user?.jid] || {};
    
    const normalizedAction = action === 'leave' ? 'remove' : action;
    
    let participantsList = [];
    if (Array.isArray(participants)) {
      for (const p of participants) {
        if (typeof p === 'string') {
          participantsList.push({ phoneNumber: p.replace(/[^0-9]/g, '') + '@s.whatsapp.net' });
        } else {
          participantsList.push(p);
        }
      }
    } else if (typeof participants === 'string') {
      participantsList = [{ phoneNumber: participants.replace(/[^0-9]/g, '') + '@s.whatsapp.net' }];
    }
    
    switch (normalizedAction) {
      case 'add':
      case 'remove':
        if (chat.welcome && !chat?.isBanned) {
          const groupMetadata = mconn?.conn?.chats[id]?.metadata || await mconn?.conn?.groupMetadata(id).catch(_ => ({}));
          
          for (const participant of participantsList) {
            const userJid = participant.phoneNumber || participant.id || '';
            
            if (!userJid) continue;
            if (normalizedAction === 'remove' && userJid === mconn?.conn?.user?.jid) return;
            
            if (normalizedAction === 'add') {
              const welcomeData = await handleWelcomeMessage(mconn?.conn, mconn, id, groupMetadata, participant, chat, tradutor);
              if (welcomeData) {
                const isBlocked = await handleAntiArab(mconn?.conn, mconn, id, userJid, chat, botTt);
                if (isBlocked) return;
                await sendWelcomeOrGoodbye(mconn?.conn, id, welcomeData, true);
              }
            } else if (normalizedAction === 'remove') {
              const goodbyeData = await handleGoodbyeMessage(mconn?.conn, mconn, id, groupMetadata, participant, chat, tradutor);
              if (goodbyeData) {
                await sendWelcomeOrGoodbye(mconn?.conn, id, goodbyeData, false);
              }
            }
          }
        }
        break;
        
      case 'promote':
      case 'daradmin':
      case 'darpoder':
      case 'demote':
      case 'quitarpoder':
      case 'quitaradmin':
        await handlePromoteDemote(mconn?.conn, id, chat, participantsList, normalizedAction, tradutor);
        break;
    }
  } catch (e) {
    console.error('handleParticipantsUpdate:', e.message);
  }
}