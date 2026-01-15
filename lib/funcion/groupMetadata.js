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
  } catch (e) {
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
      text = (tradutor.texto2 || 'Adiós @user').replace('@user', '@' + userJid.split('@')[0]);
    }

    return { text, apii, userJid };
  } catch (e) {
    return null;
  }
}

export async function sendWelcomeOrGoodbye(conn, id, messageData) {
  try {
    if (!messageData) return;
    const { text, apii, userJid } = messageData;

    if (apii?.data) {
      await conn.sendFile(id, apii.data, 'pp.jpg', text, null, false, { mentions: [userJid] }).catch(() => 
        conn.sendMessage(id, { text, mentions: [userJid] })
      );
    } else {
      await conn.sendMessage(id, { text, mentions: [userJid] });
    }
  } catch (e) {}
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
      await conn.groupParticipantsUpdate(id, [userJid], 'remove').catch(() => {});
      const fkontak2 = { 'key': { 'participants': '0@s.whatsapp.net', 'remoteJid': 'status@broadcast', 'fromMe': false, 'id': 'Halo' }, 'message': { 'contactMessage': { 'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${userJid.split('@')[0]}:${userJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` } }, 'participant': '0@s.whatsapp.net' };
      await conn.sendMessage(id, { text: `*[•] @${userJid.split('@')[0]} en este grupo no se permiten numeros arabes ni raros.` }, { quoted: fkontak2 }).catch(() => {});
      return true;
    }
    
    return false;
  } catch (e) {
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
          await conn.sendMessage(id, { text, mentions: [userJid] }).catch(() => {});
        }
      }
    }
  } catch (e) {}
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
                await sendWelcomeOrGoodbye(mconn?.conn, id, welcomeData);
              }
            } else if (normalizedAction === 'remove') {
              const goodbyeData = await handleGoodbyeMessage(mconn?.conn, mconn, id, groupMetadata, participant, chat, tradutor);
              if (goodbyeData) {
                await sendWelcomeOrGoodbye(mconn?.conn, id, goodbyeData);
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
  } catch (e) {}
}