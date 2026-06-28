import { getConfig, setConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const warnings = new Map();
const MAX_WARNINGS = 3;

const PATTERNS = {
  whatsapp:  /chat\.whatsapp\.com\/[^\s]+/gi,
  whchannel: /whatsapp\.com\/channel\/[^\s]+/gi,
  facebook:  /(?:facebook\.com|fb\.com)[^\s]*/gi,
  instagram: /instagram\.com[^\s]*/gi,
  tiktok:    /tiktok\.com[^\s]*/gi,
  twitter:   /(?:twitter\.com|x\.com)[^\s]*/gi,
  youtube:   /(?:youtube\.com|youtu\.be)[^\s]*/gi,
  telegram:  /t\.me\/[^\s]+/gi,
  discord:   /discord\.gg\/[^\s]+/gi,
  general:   /(?:https?:\/\/|www\.)[^\s]+/gi,
};

const DEFAULT_ANTILINK_CONFIG = Object.fromEntries(
  Object.keys(PATTERNS).map(k => [k, true])
);

function getAntiLinkConfig(config) {
  return { ...DEFAULT_ANTILINK_CONFIG, ...(config.antiLinkConfig || {}) };
}

function hasBlockedLink(text, alConfig) {
  if (!text) return false;

  const specificKeys = [
    'whatsapp', 'whchannel', 'facebook', 'instagram',
    'tiktok', 'twitter', 'youtube', 'telegram', 'discord'
  ];

  for (const key of specificKeys) {
    if (!alConfig[key]) continue;
    const pattern = new RegExp(PATTERNS[key].source, 'gi');
    if (pattern.test(text)) return true;
  }

  if (alConfig.general) {
    const generalPattern = new RegExp(PATTERNS.general.source, 'gi');
    const matches = text.match(generalPattern) || [];
    for (const match of matches) {
      const isSpecific = specificKeys.some(k => {
        const p = new RegExp(PATTERNS[k].source, 'gi');
        return p.test(match);
      });
      if (!isSpecific) return true;
    }
  }

  return false;
}

function addWarning(chatId, userId) {
  if (!warnings.has(chatId)) warnings.set(chatId, {});
  const cw = warnings.get(chatId);
  cw[userId] = (cw[userId] || 0) + 1;
  return cw[userId];
}

function resetWarnings(chatId, userId) {
  const cw = warnings.get(chatId);
  if (cw?.[userId]) delete cw[userId];
}

async function getAdmins(conn, chatId) {
  try {
    const meta = await conn.groupMetadata(chatId);
    return meta.participants
      .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
      .map(p => p.id);
  } catch {
    return [];
  }
}

const handler = async (m, { conn }) => {
  try {
    if (!m.isGroup || !m.text) return;

    const config = getConfig(m.chat);
    if (!config.antiLink && !config.antiLink2) return;

    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    if (groupData.isAdmin) return;

    const alConfig = getAntiLinkConfig(config);
    if (!hasBlockedLink(m.text, alConfig)) return;

    const { isBotAdmin } = groupData;
    const warningCount = addWarning(m.chat, m.sender);

    if (isBotAdmin) {
      try {
        await conn.sendMessage(m.chat, { delete: m.key });
      } catch {}
    }

    if (warningCount >= MAX_WARNINGS) {
      let userBanned = false;

      if (isBotAdmin) {
        try {
          await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
          userBanned = true;
        } catch {}
      }

      if (userBanned) {
        await conn.sendMessage(m.chat, {
          text: `🚫 *USUARIO ELIMINADO POR SPAM DE ENLACES*\n\n👤 *Usuario:* @${m.sender.split('@')[0]}\n📊 *Advertencias:* ${warningCount}/${MAX_WARNINGS}\n📋 *Motivo:* Envío repetido de enlaces no permitidos\n\n✅ *El usuario ha sido removido exitosamente.*`,
          mentions: [m.sender]
        });
        resetWarnings(m.chat, m.sender);
      } else {
        const admins = await getAdmins(conn, m.chat);
        await conn.sendMessage(m.chat, {
          text: `🚨 *ALERTA PARA ADMINISTRADORES*\n\n👤 *Usuario:* @${m.sender.split('@')[0]}\n📊 *Advertencias:* ${warningCount}/${MAX_WARNINGS}\n📋 *Motivo:* Spam de enlaces\n\n❌ *No soy administrador/a, no puedo eliminar al usuario.*\n📢 *Por favor elimínenlo manualmente.*`,
          mentions: [m.sender, ...admins]
        });
      }

    } else {
      const remaining = MAX_WARNINGS - warningCount;
      const isLast = warningCount === MAX_WARNINGS - 1;
      const lastWarn = isLast
        ? '🔥 *¡ÚLTIMA ADVERTENCIA!*\n⚡ *Próximo enlace = ELIMINACIÓN AUTOMÁTICA*'
        : '⚡ *Sigue enviando enlaces y serás eliminado*';

      if (!isBotAdmin) {
        const admins = await getAdmins(conn, m.chat);
        await conn.sendMessage(m.chat, {
          text: `⚠️ *ADVERTENCIA ${warningCount}/${MAX_WARNINGS} - ENLACES NO PERMITIDOS*\n\n👤 *Usuario:* @${m.sender.split('@')[0]}\n🔗 *Motivo:* Envío de enlaces/links\n⏰ *Advertencias restantes:* ${remaining}\n\n${lastWarn}\n\n❌ *No pude borrar el mensaje (no soy admin)*\n🤝 *Por favor respeta las reglas del grupo.*`,
          mentions: [m.sender, ...admins]
        });
      } else {
        await conn.sendMessage(m.chat, {
          text: `⚠️ *ADVERTENCIA ${warningCount}/${MAX_WARNINGS} - ENLACES NO PERMITIDOS*\n\n👤 *Usuario:* @${m.sender.split('@')[0]}\n🔗 *Motivo:* Envío de enlaces/links\n⏰ *Advertencias restantes:* ${remaining}\n\n${lastWarn}\n\n🗑️ *Tu mensaje fue eliminado automáticamente*\n🤝 *Por favor respeta las reglas del grupo.*`,
          mentions: [m.sender]
        });
      }
    }

  } catch {}
};

handler.before = async function (m, extra) {
  return await handler(m, extra);
};

export default handler;
