import { addAdminToCache, removeAdminFromCache, updateGroupAdmins, nombreDeParticipante } from './pluginHelper.js';
import { registerLidPhone } from './lid-resolver.js';
import { addParticipant, removeParticipant } from './hidetag-cache.js';
import { obtenerKickban, registrarKickban } from './kickban-store.js';
import { tomarMotivo, mismosDigitos, candidatosParticipante } from './leave-reason.js';
import { mensajeReingreso, avisoPermabanFallido } from './kickban-estilo.js';
import fs from 'fs';

const reingresoEnCurso = new Set();

function candidatosNumero(participant, userJid) {
  const lista = [
    participant?.phoneNumber,
    participant?.id,
    participant?.jid,
    participant?.lid,
    userJid
  ];
  const vistos = new Set();
  const salida = [];
  for (const item of lista) {
    if (!item) continue;
    const digitos = String(item).split('@')[0].replace(/\D/g, '');
    if (digitos.length < 8 || vistos.has(digitos)) continue;
    vistos.add(digitos);
    salida.push(digitos);
  }
  return salida;
}

export function esSalidaSilenciosa(chatId, userJid, participant) {
  if (!userJid) return false;
  const set = global.kickSkipGoodbye;
  const digitos = String(userJid).split('@')[0].replace(/\D/g, '');
  if (set && digitos && set.has(`${chatId}_${digitos}`)) return true;
  if (set && set.has(`${chatId}_${userJid}`)) return true;

  for (const num of candidatosNumero(participant, userJid)) {
    if (!set?.has(`${chatId}_${num}`)) continue;
    set.delete(`${chatId}_${num}`);
    return true;
  }

  for (const num of candidatosNumero(participant, userJid)) {
    if (!obtenerKickban(chatId, num)) continue;
    return true;
  }

  return false;
}

export async function bloquearReingreso(conn, chatId, userJid, participant) {  const candidatos = candidatosNumero(participant, userJid);
  if (!candidatos.length) return false;

  let numero = null;
  let previo = null;
  for (const num of candidatos) {
    const encontrado = obtenerKickban(chatId, num);
    if (encontrado) {
      numero = num;
      previo = encontrado;
      break;
    }
  }
  if (!numero) return false;

  const clave = `${chatId}_${numero}`;
  if (reingresoEnCurso.has(clave)) return true;
  reingresoEnCurso.add(clave);

  const jidParaExpulsar = String(participant?.phoneNumber || userJid).includes('@lid')
    ? (previo.jid || userJid)
    : (participant?.phoneNumber || userJid);

  try {
    if (!global.kickSkipGoodbye) global.kickSkipGoodbye = new Set();
    global.kickSkipGoodbye.add(`${chatId}_${numero}`);
    global.kickSkipGoodbye.add(`${chatId}_${jidParaExpulsar}`);

    const nombreVivo = /^\d+$/.test(String(previo.nombre || ''))
      ? nombreDeParticipante(participant || {})
      : '';
    const nombre = nombreVivo || previo.nombre || numero;

    const entrada = registrarKickban({
      chatId,
      jid: jidParaExpulsar,
      lid: participant?.lid,
      numero,
      nombre,
      motivo: previo.motivo,
      autor: previo.autor,
      autorNombre: previo.autorNombre
    }) || previo;

    let expulsado = true;
    try {
      const msEspera = Number(global.__kickbanEsperaMs);
      const espera = Number.isFinite(msEspera) && msEspera >= 0 ? msEspera : 5000;
      if (espera) await new Promise((r) => setTimeout(r, espera));
      await conn.groupParticipantsUpdate(chatId, [jidParaExpulsar], 'remove');
      removeParticipant(chatId, userJid);
    } catch {
      expulsado = false;
    }

    const texto = expulsado
      ? mensajeReingreso({
          numero,
          nombre: entrada.nombre,
          motivo: entrada.motivo,
          veces: entrada.veces,
          comandoUnban: '.unkickban'
        })
      : avisoPermabanFallido({ numero, nombre: entrada.nombre, motivo: entrada.motivo, comandoUnban: '.unkickban' });

    const menciones = [...new Set([numero + '@s.whatsapp.net', jidParaExpulsar, userJid, participant?.id, participant?.lid])]
      .filter(x => typeof x === 'string' && x.includes('@') && x.split('@')[0].length >= 8);
    await conn.sendMessage(chatId, { text: texto, mentions: menciones }).catch(() => {});
  } catch {}

  setTimeout(() => reingresoEnCurso.delete(clave), 30000);
  return true;
}

const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const WELCOME_DIR = './database/WELCOME';
const actionDeduplicator = new Map();

const _translateCache = new Map();
function getTranslate(idioma) {
  const lang = idioma || global.defaultLenguaje || 'es';
  if (_translateCache.has(lang)) return _translateCache.get(lang);
  try {
    const parsed = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'));
    _translateCache.set(lang, parsed);
    return parsed;
  } catch {
    if (lang !== 'es') {
      if (!_translateCache.has('es')) {
        try {
          const fallback = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'));
          _translateCache.set('es', fallback);
        } catch {
          _translateCache.set('es', {});
        }
      }
      return _translateCache.get('es') || {};
    }
    return {};
  }
}

function getCustomImage(chatId, type) {
  try {
    const chatClean = chatId.replace('@g.us', '');
    const imgPath = `${WELCOME_DIR}/${chatClean}_${type}.jpg`;
    if (fs.existsSync(imgPath)) return fs.readFileSync(imgPath);
  } catch {}
  return null;
}

export async function getGroupMetadata(conn, chatId, groupCache, senderJid) {
  try {
    const cached = groupCache.get(chatId);
    const isFresh = cached && (Date.now() - cached.timestamp) < CACHE_TTL;

    let metadata, participants;

    if (isFresh) {
      ({ groupMetadata: metadata, participants } = cached.data);
    } else {
      metadata = conn.chats?.[chatId]?.metadata || await conn.groupMetadata(chatId).catch(() => null);

      if (metadata) {
        participants = (metadata.participants || []).map(p => {
          const rawId = p.id || p.jid || '';
          const isLid = rawId.includes('@lid');
          const phoneJid = p.phoneNumber || (!isLid ? rawId : null);
          const lidJid   = p.lid || (isLid ? rawId : null);
          return {
            id:    phoneJid || rawId,
            lid:   lidJid   || null,
            admin: p.admin  || null,
          };
        });

        for (const p of participants) {
          if (p.lid && p.id) registerLidPhone(p.lid, p.id);
        }

        await updateGroupAdmins(chatId, participants, conn);

        if (groupCache.size >= MAX_CACHE_SIZE) {
          groupCache.delete(groupCache.keys().next().value);
        }

        groupCache.set(chatId, { data: { groupMetadata: metadata, participants }, timestamp: Date.now() });
      }
    }

    if (!metadata) {
      return { groupMetadata: {}, participants: [], userGroup: {}, botGroup: {}, isAdmin: false, isRAdmin: false, isBotAdmin: false };
    }

    const decodedSender = conn.decodeJid(senderJid);
    const botJid        = conn.decodeJid(conn.user.jid);

    const userGroup = participants.find(u => conn.decodeJid(u.id) === decodedSender) || {};
    const botGroup  = participants.find(u => conn.decodeJid(u.id) === botJid) || {};

    return {
      groupMetadata: metadata,
      participants,
      userGroup,
      botGroup,
      isAdmin:    userGroup?.admin === 'admin' || userGroup?.admin === 'superadmin',
      isRAdmin:   userGroup?.admin === 'superadmin',
      isBotAdmin: botGroup?.admin  === 'admin' || botGroup?.admin  === 'superadmin',
    };
  } catch {
    return { groupMetadata: {}, participants: [], userGroup: {}, botGroup: {}, isAdmin: false, isRAdmin: false, isBotAdmin: false };
  }
}

export async function handleWelcomeMessage(conn, id, groupMetadata, participant, chat, idioma) {
  try {
    const userJid = participant.id || participant.phoneNumber || '';
    if (!userJid) return null;

    let pp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
    try { pp = await conn.profilePictureUrl(userJid, 'image'); } catch {}

    const apii = await conn.getFile(pp).catch(() => ({}));
    const totalMembers = groupMetadata?.participants?.length || 0;
    const groupName    = groupMetadata?.subject || '';
    const t = getTranslate(idioma)?.functions?.group_msgs || {};
    const groupDesc    = groupMetadata?.desc?.toString() || t.no_desc;

    let text = chat.sWelcome?.trim() ? chat.sWelcome : t.welcome;

    text = text
      .replace(/@user/g,  '@' + userJid.split('@')[0])
      .replace(/@group/g, groupName)
      .replace(/@desc/g,  groupDesc)
      .replace(/@total/g, totalMembers.toString());

    const customImage = getCustomImage(id, 'welcome');

    return { text, apii, userJid, customImage };
  } catch {
    return null;
  }
}

export async function handleGoodbyeMessage(conn, id, groupMetadata, participant, chat, idioma, removedBy, removedByPn) {
  try {
    const userJid = participant.id || participant.phoneNumber || '';
    if (!userJid) return null;

    let pp = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
    try { pp = await conn.profilePictureUrl(userJid, 'image'); } catch {}

    const apii = await conn.getFile(pp).catch(() => ({}));
    const totalMembers = Math.max(0, (groupMetadata?.participants?.length || 1) - 1);
    const groupName    = groupMetadata?.subject || '';
    const t            = getTranslate(idioma)?.functions?.group_msgs || {};

    let text = chat.sBye?.trim() ? chat.sBye : t.bye;

    text = text
      .replace(/@user/g,  '@' + userJid.split('@')[0])
      .replace(/@group/g, groupName)
      .replace(/@total/g, totalMembers.toString());

    const phoneNum   = userJid.split('@')[0];
    const candidatos = candidatosParticipante(participant);

    let info = tomarMotivo(id, candidatos);

    if (!info) {
      const legacy = global.kickReasons?.get(`${id}_${phoneNum}`) || global.kickReasons?.get(`${id}_${userJid}`) || '';
      if (legacy) {
        global.kickReasons.delete(`${id}_${phoneNum}`);
        global.kickReasons.delete(`${id}_${userJid}`);
        info = { tipo: 'kick', motivo: legacy, autor: '', autorNombre: '' };
      }
    }

    const removidoPorOtro = removedBy && !candidatos.some(c => mismosDigitos(c, removedBy) || mismosDigitos(c, removedByPn));
    const botJid = conn.user?.jid;
    const autorEsBot = removedBy && botJid && mismosDigitos(removedBy, botJid);
    if (!info) {
      if (!removidoPorOtro) info = { tipo: 'self', motivo: '', autor: '', autorNombre: '' };
      else if (autorEsBot) info = { tipo: 'auto', motivo: '', autor: '', autorNombre: '' };
      else info = { tipo: 'admin', motivo: '', autor: removedBy, autorNombre: '' };
    }

    const motivoTexto = (info.motivo && info.motivo.trim())
      ? info.motivo.trim()
      : (t[`motivo_${info.tipo}`] || t.motivo_otro || 'sin datos');

    let bloque = (t.bye_motivo || '\n\n⚠️ *Motivo:* {motivo}').replace('{motivo}', motivoTexto);

    const mentions = [userJid];
    const autorJid = info.autor ? String(info.autor) : '';
    const autorEsBot2 = autorJid && botJid && mismosDigitos(autorJid, botJid);
    const autorEsHumano = autorJid && !autorEsBot2 && !candidatos.some(c => mismosDigitos(c, autorJid));
    if (autorEsHumano) {
      const autorTag = '@' + autorJid.split(':')[0].split('@')[0];
      bloque += (t.bye_por_autor || '\n👮 *Expulsado por:* {autor}').replace('{autor}', autorTag);
      mentions.push(autorJid);
    } else if (info.tipo !== 'self' && info.tipo !== 'auto') {
      bloque += (t.bye_auto || '\n🤖 *Acción automática del bot*');
    }

    text += bloque;

    const customImage = getCustomImage(id, 'bye');

    return { text, apii, userJid, customImage, mentions: [...new Set(mentions.filter(Boolean))] };
  } catch {
    return null;
  }
}

export async function sendWelcomeOrGoodbye(conn, id, messageData) {
  try {
    if (!messageData) return;
    const { text, apii, userJid, customImage, mentions } = messageData;
    const menciones = Array.isArray(mentions) && mentions.length ? mentions : [userJid];

    if (customImage) {
      await conn.sendMessage(id, {
        image: customImage,
        caption: text,
        mentions: menciones
      }).catch(() => conn.sendMessage(id, { text, mentions: menciones }));
    } else if (apii?.data) {
      await conn.sendFile(id, apii.data, 'pp.jpg', text, null, false, { mentions: menciones })
        .catch(() => conn.sendMessage(id, { text, mentions: menciones }));
    } else {
      await conn.sendMessage(id, { text, mentions: menciones });
    }
  } catch {}
}

export async function handlePromoteDemote(conn, id, chat, participantsList, action, authorJid, idioma) {
  try {
    const isPromote = ['promote', 'daradmin', 'darpoder'].includes(action);
    const isDemote  = ['demote', 'quitaradmin', 'quitarpoder'].includes(action);
    const t         = getTranslate(idioma)?.functions?.group_msgs || {};

    let text = '';
    if (isPromote) text = chat.sPromote || t.promote;
    else if (isDemote) text = chat.sDemote || t.demote;

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
  globalLoadDatabase, globalConfig, globalDb, idioma, tradutor, opts, groupCache,
  author, authorPn
) {
  try {
    if (!conn?.user?.jid) return;
    if (opts?.self) return;
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
      if (chat.isBanned) return;

      const canWelcome = !!chat.welcome;
      const canBye     = chat.bye !== false;

      const _cachedMeta = global.groupCache?.get(id);
      const groupMetadata = (_cachedMeta && (Date.now() - _cachedMeta.timestamp) < CACHE_TTL)
        ? _cachedMeta.data.groupMetadata
        : (conn.chats?.[id]?.metadata || await conn.groupMetadata(id).catch(() => ({})));

      for (const participant of participantsList) {
        const userJid = participant.id || participant.phoneNumber;
        if (!userJid) continue;
        if (normalizedAction === 'remove' && userJid === conn.user.jid) continue;

        if (normalizedAction === 'remove' && esSalidaSilenciosa(id, userJid, participant)) {
          global.kickSkipGoodbye?.delete(`${id}_${userJid.split('@')[0]}`);
          global.kickSkipGoodbye?.delete(`${id}_${userJid}`);
          removeParticipant(id, userJid);
          continue;
        }

        if (normalizedAction === 'add') {
          const reingreso = await bloquearReingreso(conn, id, userJid, participant);
          if (reingreso) continue;
          addParticipant(id, userJid, participant.lid || null);
        } else {
          removeParticipant(id, userJid);
        }

        if (normalizedAction === 'add' && !canWelcome) continue;
        if (normalizedAction === 'remove' && !canBye) continue;

        const data = normalizedAction === 'add'
          ? await handleWelcomeMessage(conn, id, groupMetadata, participant, chat, idioma)
          : await handleGoodbyeMessage(conn, id, groupMetadata, participant, chat, idioma, author, authorPn);

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

      await handlePromoteDemote(conn, id, chat, participantsList, normalizedAction, conn.user?.jid, idioma);
    }
  } catch {}
}
