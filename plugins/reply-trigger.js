import conversationPlugin from '../plugins/lunaia/conversation-plugin.js';
import configPlugin from '../plugins/lunaia/config-plugin.js';

const _cooldown = new Map();
const COOLDOWN_MS = 1500;

export const pendingSessions = new Map();

const handler = {};

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

    if (pendingSessions.has(jid)) return;

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

    const cooldownKey = jid + '_' + sender;
    const now = Date.now();
    if (_cooldown.has(cooldownKey) && now - _cooldown.get(cooldownKey) < COOLDOWN_MS) return;
    _cooldown.set(cooldownKey, now);

    if (_cooldown.size > 500) {
      for (const [k, v] of _cooldown.entries()) {
        if (now - v > COOLDOWN_MS * 10) _cooldown.delete(k);
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

    if (configPlugin.canHandle?.(m.text)) {
      await configPlugin.handle(m.text, extra);
      return;
    }

    await conversationPlugin.handle(m.text, extra);

  } catch (e) {
    console.log('[REPLY-TRIGGER] error:', e.message);
  }
};

export default handler;
