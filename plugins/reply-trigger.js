import conversationPlugin from '../plugins/lunaia/conversation-plugin.js';
import configPlugin from '../plugins/lunaia/config-plugin.js';
import { getConfig, setConfig } from '../lib/funcConfig.js';
import { isDynamicMessage } from '../lib/funcion/dynamicMessageTracker.js';

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

function isBotLid(participant, botNum, participants) {
  if (!participant) return false;
  const participantNum = participant.split('@')[0].split(':')[0];
  if (participantNum === botNum) return true;
  if (participant.includes('@lid') && participants?.length) {
    const match = participants.find(p => {
      const lidNum = (p.lid || p.id || '').split('@')[0].split(':')[0];
      return lidNum === participantNum;
    });
    if (match) {
      const matchedNum = (match.id || '').split('@')[0].split(':')[0];
      return matchedNum === botNum;
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

    const cached = global.groupCache?.get(jid);
    const participants = cached?.data?.participants || [];

    if (!isBotLid(participant, botNum, participants)) return;

    const stanzaId = m.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (isDynamicMessage(stanzaId)) return;

    const settings = global.db?.data?.settings?.[conn.user?.jid];
    if (settings?.iaLunaActive === false) return;

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
      const resolved = await resolvePendingSession(m, { conn, jid });
      if (resolved) return;
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

    const extra = {
      conn,
      msg: m,
      jid,
      isGroup: m.isGroup ?? jid.endsWith('@g.us'),
      isPrivate: !jid.endsWith('@g.us'),
      botNumber: botNum || null
    };

    if (configPlugin.canHandle?.(text)) {
      try {
        await configPlugin.handle(text, extra);
      } catch {}
      return;
    }

    try {
      await conversationPlugin.handle(text, extra);
    } catch {}

  } catch {}
};

export default handler;