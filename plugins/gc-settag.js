import fs from 'fs';
import { isAdminNoTTL, hasAdminCacheForGroup, getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import {
  getPendingTemplate,
  setPendingTemplate,
  confirmPendingTemplate,
  resetCustomTemplate
} from '../lib/funcion/tagallTemplateStore.js';
import { renderTagallTemplate } from '../lib/funcion/tagallPlaceholders.js';

const _langCache = new Map();

function getLang(idioma) {
  if (_langCache.has(idioma)) return _langCache.get(idioma);
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_settag;
  _langCache.set(idioma, t);
  return t;
}

function buildPreviewText(rawText, { groupName, senderNum, participants }) {
  const jids = participants.map(p => p.id).filter(Boolean);
  const tagLines = jids.map(j => `┃>@${j.split('@')[0]}`).join('\n');
  return renderTagallTemplate(rawText, {
    bot: global.BotName || 'Luna',
    grupo: groupName,
    tag: `@${senderNum}`,
    razon: 'ejemplo de razón',
    tags: tagLines
  });
}

const handler = async (m, { conn, args, isOwner, usedPrefix, command, text }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const t = getLang(idioma);

  try {
    if (!m.isGroup) return m.reply(t.solo_grupos);

    const chatId = m.chat;
    const groupData = await getGroupDataForPlugin(conn, chatId, m.sender);
    const participants = groupData?.participants || [];

    const isAdmin = hasAdminCacheForGroup(chatId)
      ? isAdminNoTTL(chatId, m.sender)
      : groupData.isAdmin;

    if (!isAdmin && !isOwner) return m.reply(t.solo_admins);

    if (/^settagreset$/i.test(command)) {
      resetCustomTemplate(chatId);
      return m.reply(t.reset_ok);
    }

    if (/^(setconfir|setconf)$/i.test(command)) {
      const confirmado = confirmPendingTemplate(chatId);
      if (!confirmado) return m.reply(t.sin_pendiente);
      return m.reply(t.confirmado_ok);
    }

    // A partir de acá: .settag / .setn
    const q = m.quoted || m;
    const mime = q.mediaType || '';
    const tieneImagen = /image/.test(mime);

    let imageBuffer = null;
    if (tieneImagen) {
      try {
        imageBuffer = await q.download();
      } catch {
        return m.reply(t.error_imagen);
      }
    }

    const textoCrudo = (text || '').trim() || (args.length ? args.join(' ') : '');
    const textoNuevo = textoCrudo || (tieneImagen ? (q.text || q.caption || null) : null);

    const pendienteActual = getPendingTemplate(chatId);
    if (!textoNuevo && !imageBuffer && !pendienteActual) {
      return m.reply(t.ayuda);
    }

    const pendiente = setPendingTemplate(chatId, textoNuevo, imageBuffer);

    if (!pendiente.text) {
      return m.reply(t.falta_texto);
    }

    const groupName = groupData?.groupMetadata?.subject
      || conn.chats?.[chatId]?.subject
      || conn.chats?.[chatId]?.name
      || chatId.split('@')[0];

    const senderNum = m.sender.split('@')[0];
    const preview = buildPreviewText(pendiente.text, { groupName, senderNum, participants });
    const caption = `${preview}\n\n${t.preview_footer.replace(/\{usedPrefix\}/g, usedPrefix)}`;

    if (pendiente.image) {
      await conn.sendMessage(chatId, {
        image: fs.readFileSync(pendiente.image),
        caption
      }, { quoted: m });
    } else {
      await m.reply(caption);
    }

  } catch {
    await m.reply(t.error);
  }
};

handler.help = ['settag <texto>', 'setn <texto>', 'setconfir'];
handler.tags = ['group'];
handler.command = /^(settag|setn|setconfir|setconf|settagreset)$/i;
handler.group = true;

export default handler;
