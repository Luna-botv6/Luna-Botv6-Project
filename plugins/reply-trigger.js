import { getConfig, setConfig } from '../lib/funcConfig.js';
import { isDynamicMessage } from '../lib/funcion/dynamicMessageTracker.js';
import { checkUserPermissions } from '../lib/funcion/userPermissions.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { dispatchToPlugins } from './pluginDispatch.js';
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js';

const _cooldown = new Map();
const COOLDOWN_MS = 1500;

export const pendingSessions = new Map();
const SESSION_TTL_MS = 120000;

const handler = {};

const NEGATIVE_TRIGGERS = /\b(no|para|basta|calla(te)?|cállate|callate|shh+|sht+|ya\s*(basta)?|dejalo|dejala|apaga(lo)?|saca(lo)?|quita(lo)?|silencio|molesta(n)?|odio|fastidia|no\s+mas|nuevamente\s+no)\b/i;
const POSITIVE_REPLY = /\b(si|sí|dale|obvio|claro|ok|okay|porfa|porfavor|quiero|hacelo|desactiva(lo)?|sacalo)\b/i;
const NEGATIVE_REPLY = /\b(no|nel|nah|dejalo|dejala|olvidalo|cancela(r)?|mejor no)\b/i;
const LAUGH_OR_SHORT = /\b(jaja|jeje|jiji|lol|xd|jajaja)\b/i;

const AUDIO_DISABLE_PHRASE = /\b(no\s+(mandes|envies|env[ií]es|manden)\s+(mas\s+)?audios?|para(r)?\s+(con\s+)?(los\s+)?audios?|desactiva(r)?\s+(los\s+)?audios?|sin\s+audios?|deja(r)?\s+de\s+mandar\s+audios?|no\s+quiero\s+(mas\s+)?audios?)\b/i;
const AUDIO_ENABLE_PHRASE  = /\b(activa(r)?\s+(los\s+)?audios?|volve(r)?\s+(a\s+)?(mandar|enviar)\s+audios?|quiero\s+(los\s+)?audios?\s+de\s+nuevo|prende(r)?\s+(los\s+)?audios?)\b/i;

function digitosJid(j) {
  return String(j || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function esCandidatoSinDominio(j) {
  return typeof j === 'string' && j.indexOf('@') < 0 && j.replace(/[^0-9]/g, '').length >= 5;
}

function isBotLid(participant, botNum, participants, conn) {
  if (!participant || !botNum) return false;
  const partNum = String(participant).split('@')[0].split(':')[0];
  if (partNum === botNum) return true;
  const botJid = botNum + '@s.whatsapp.net';
  try {
    if (conn && conn.decodeJid) {
      const a = conn.decodeJid(participant);
      const b = conn.decodeJid(botJid);
      if (a && b && a === b) return true;
    }
  } catch {}
  try {
    const lidPropio = (conn && conn.user && (conn.user.lid || conn.user.id)) || null;
    if (lidPropio && participant) {
      try {
        if (conn && conn.decodeJid && conn.decodeJid(lidPropio) === conn.decodeJid(participant)) return true;
      } catch {}
      if (String(lidPropio) === String(participant)) return true;
    }
  } catch {}
  const candidatos = [participant];
  if (esCandidatoSinDominio(participant)) {
    candidatos.push(participant + '@lid');
    candidatos.push(participant + '@s.whatsapp.net');
  }
  try {
    for (const c of candidatos) {
      try {
        const tel = resolveJidToPhone(c, conn);
        if (tel && tel.replace(/[^0-9]/g, '') === String(botNum).replace(/[^0-9]/g, '')) return true;
      } catch {}
    }
  } catch {}
  const dig = digitosJid(participant);
  const lista = participants || [];
  const esLid = String(participant).includes('@lid') || esCandidatoSinDominio(participant);
  if (esLid) {
    for (const p of lista) {
      const rawLid = p.lid || (String(p.id || '').includes('@lid') ? p.id : '');
      const lidDig = digitosJid(rawLid);
      if (lidDig && lidDig === dig) {
        const telId = digitosJid(p.id || '');
        if (telId === String(botNum).replace(/[^0-9]/g, '')) return true;
        try {
          const t2 = resolveJidToPhone(p.id || p.lid, conn);
          if (t2 && t2.replace(/[^0-9]/g, '') === String(botNum).replace(/[^0-9]/g, '')) return true;
        } catch {}
      }
    }
  }
  if (lista.length) {
    for (const p of lista) {
      const idDig = digitosJid(p.id || '');
      if (idDig && idDig === dig && idDig === String(botNum).replace(/[^0-9]/g, '')) return true;
    }
  }
  return false;
}

function getQuotedAudio(m) {
  return m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage || null;
}

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [jid, session] of pendingSessions.entries()) {
    if (session.expires && now > session.expires) pendingSessions.delete(jid);
  }
}

async function askDisableAudios(conn, jid, m) {
  try {
    await conn.sendMessage(jid, {
      text: '🎧 Veo que no te gustaron mucho los audios random jaja, ¿querés que los desactive en este grupo? Respondé *sí* o *no* 💜'
    }, { quoted: m });
    pendingSessions.set(jid, { type: 'disable_audios_confirm', expires: Date.now() + SESSION_TTL_MS });
  } catch {}
}

async function toggleAudiosDirect(conn, jid, m, enable) {
  try {
    const current = getConfig(jid) || {};
    setConfig(jid, { ...current, audios: enable });
    pendingSessions.delete(jid);
    const msg = enable
      ? '✅ Listo, volví a activar los audios random en este grupo 🎧🔊'
      : '✅ Listo, desactivé los audios random en este grupo 🎧🔇';
    await conn.sendMessage(jid, { text: msg }, { quoted: m });
  } catch {
    await conn.sendMessage(jid, { text: '😅 Hubo un problema cambiando la config de audios, probá de nuevo más tarde.' }, { quoted: m });
  }
}

async function resolvePendingSession(m, { conn, jid }) {
  const session = pendingSessions.get(jid);
  if (!session) return false;

  if (Date.now() > session.expires) {
    pendingSessions.delete(jid);
    return false;
  }

  if (session.type === 'disable_audios_confirm') {
    const text = (m.text || '').trim();
    if (POSITIVE_REPLY.test(text)) {
      pendingSessions.delete(jid);
      try {
        const current = getConfig(jid) || {};
        setConfig(jid, { ...current, audios: false });
        await conn.sendMessage(jid, { text: '✅ Listo, desactivé los audios random en este grupo 🎧🔇' }, { quoted: m });
      } catch {
        await conn.sendMessage(jid, { text: '😅 Hubo un problema desactivando los audios, probá de nuevo más tarde.' }, { quoted: m });
      }
      return true;
    }
    if (NEGATIVE_REPLY.test(text)) {
      pendingSessions.delete(jid);
      await conn.sendMessage(jid, { text: 'Dale, los dejo activados entonces 😄' }, { quoted: m });
      return true;
    }
    pendingSessions.delete(jid);
    return false;
  }

  return false;
}

handler.before = async function (m, { conn }) {
  try {
    if (!m?.text || m.fromMe) return;

    const participant = m.message?.extendedTextMessage?.contextInfo?.participant;
    if (!participant) return;

    

    const botJid = conn.user?.jid;
    const botNum = botJid?.split('@')[0]?.split(':')[0];
    const jid = m.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const { isROwner, isOwner } = checkUserPermissions(m, conn);
    const chat = getConfig(jid);
    if (m.isGroup && chat?.modoadmin && !isOwner && !isROwner) return;

    const cached = global.groupCache?.get(jid);
    const participants = cached?.data?.participants || [];

    if (!isBotLid(participant, botNum, participants, conn)) return;

    const stanzaId = m.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (isDynamicMessage(stanzaId)) return;

    const settings = global.db?.data?.settings?.[conn.user?.jid];
    if (settings?.iaLunaActive === false) return;
    try { if (getConfig(jid)?.ia === false) return; } catch {}

    const sender = m.key.participant || m.key.remoteJid;

    const _muteDB = global.db?.data?.mutes || {};
    const senderNum = sender.replace(/[^0-9]/g, '');
    const isMuted = Object.entries(_muteDB).some(([k, v]) => {
      if (!k.startsWith(jid + '_')) return false;
      if (!k.replace(/[^0-9]/g, '').includes(senderNum)) return false;
      if (v?.until && Date.now() > v.until) return false;
      return true;
    });
    if (isMuted) return;

    const userDB = global.db?.data?.users?.[sender];
    if (userDB?.banned) return;

    cleanExpiredSessions();

    if (pendingSessions.has(jid)) {
      await resolvePendingSession(m, { conn, jid });
      return;
    }

    const cooldownKey = jid + '_' + sender;
    const now = Date.now();
    if (_cooldown.has(cooldownKey) && now - _cooldown.get(cooldownKey) < COOLDOWN_MS) return;
    _cooldown.set(cooldownKey, now);

    if (_cooldown.size > 500) {
      for (const [k, v] of _cooldown.entries()) {
        if (now - v > COOLDOWN_MS * 10) _cooldown.delete(k);
      }
    }

    const text = typeof m.text === 'string' ? m.text.trim() : '';
    if (!text) return;

    if (AUDIO_DISABLE_PHRASE.test(text)) {
      await toggleAudiosDirect(conn, jid, m, false);
      return;
    }
    if (AUDIO_ENABLE_PHRASE.test(text)) {
      await toggleAudiosDirect(conn, jid, m, true);
      return;
    }

    const quotedAudio = getQuotedAudio(m);
    if (quotedAudio) {
      if (NEGATIVE_TRIGGERS.test(text) || LAUGH_OR_SHORT.test(text)) {
        await askDisableAudios(conn, jid, m);
        return;
      }
    }

    const groupData = await getGroupDataForPlugin(conn, jid, sender);

    const extra = {
      conn,
      msg: m,
      jid,
      isGroup: true,
      isPrivate: false,
      groupData,
      mentionedJids: m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
      mentionedNames: {},
      botNumber: botNum || null
    };

    try {
      await dispatchToPlugins(text, extra);
    } catch {}

  } catch {}
};

export default handler;