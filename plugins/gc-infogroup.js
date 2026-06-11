import fs from 'fs';
import { access } from 'fs/promises';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { getConfig } from '../lib/funcConfig.js';

const MENU_DIR = './database/WELCOME';
const CUSTOM_IMG = `${MENU_DIR}/menu_image.jpg`;
const CUSTOM_VID = `${MENU_DIR}/menu_video.mp4`;
const DEFAULT_VID = './src/assets/images/menu/languages/es/VID-20250527-WA0006.mp4';
const DEFAULT_AVT = './src/avatar_contact.png';

const BOT = () => global.BotName || 'Luna';

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

const on  = '✓ Activado';
const off = '✗ Desactivado';

const handler = async (m, { conn }) => {
  const datas  = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const tradutor = _translate.plugins.gc_infogroup;

  const { groupMetadata, participants, isBotAdmin } =
    await getGroupDataForPlugin(conn, m.chat, m.sender);

  const config = getConfig(m.chat);

  const groupAdmins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
  const superAdmin  = participants.find(p => p.admin === 'superadmin');

  const owner =
    groupMetadata.owner ||
    superAdmin?.id ||
    m.chat.split('-')[0] + '@s.whatsapp.net';

  const registrados = Object.keys(global.db?.data?.users || {}).length;

  const listAdmin = groupAdmins.length > 0
    ? groupAdmins.map((v, i) => `> ${i + 1}. @${v.id.split('@')[0]}${v.admin === 'superadmin' ? ' 👑' : ''}`).join('\n')
    : `> Sin admins`;

  const createdAt = groupMetadata.creation
    ? new Date(groupMetadata.creation * 1000).toLocaleDateString('es-AR', {
        day: '2-digit', month: 'long', year: 'numeric'
      })
    : '—';

  const desc = groupMetadata.desc?.toString()?.trim() || 'Sin descripción';

  const text = `「✦」Grupo ◢ 🌐 *${groupMetadata.subject || '—'}* 🌐 ◤
❀ *Dueño* » @${owner.split('@')[0]}
✦ *Miembros* » ${participants.length} Participantes
ꕥ *Admins* » ${groupAdmins.length}
☆ *Registrados* » ${registrados.toLocaleString()}
❖ *Bot principal* » ${BOT()}
📅 *Creado* » ${createdAt}
🤖 *Bot admin* » ${isBotAdmin ? '✓' : '✗'}

*▢ Admins:*
${listAdmin}

*▢ Descripción:*
> ${desc}

*▢ Opciones:*
> ◆ *Welcome* » ${config.welcome      ? on : off}
> ◆ *Anti-Link* » ${config.antiLink   ? on : off}
> ◆ *Anti-Link2* » ${config.antiLink2 ? on : off}
> ◆ *Anti-Tóxico* » ${config.antiToxic   ? on : off}
> ◆ *Anti-Traba* » ${config.antiTraba    ? on : off}
> ◆ *Anti-Delete* » ${config.antidelete  ? on : off}
> ◆ *Anti-ViewOnce* » ${config.antiviewonce ? on : off}
> ◆ *Modo Admin* » ${config.modoadmin    ? on : off}
> ◆ *Auto-Sticker* » ${config.autosticker ? on : off}
> ◆ *Audios Bot* » ${config.audios       ? on : off}
> ◆ *Modo Horny* » ${config.modohorny    ? on : off}
> ◆ *Detección* » ${config.detect        ? on : off}
> ◆ *Detección 2* » ${config.detect2     ? on : off}`.trim();

  const mentions = [...groupAdmins.map(v => v.id), owner];

  let mediaPath = null;
  let mediaType = 'video';

  if (await fileExists(CUSTOM_VID)) {
    mediaPath = CUSTOM_VID; mediaType = 'video';
  } else if (await fileExists(CUSTOM_IMG)) {
    mediaPath = CUSTOM_IMG; mediaType = 'image';
  } else if (await fileExists(DEFAULT_VID)) {
    mediaPath = DEFAULT_VID; mediaType = 'video';
  } else {
    mediaPath = DEFAULT_AVT; mediaType = 'image';
  }

  if (mediaType === 'video') {
    conn.sendFile(m.chat, mediaPath, 'grupo.mp4', text, m, false, { mentions, mimetype: 'video/mp4' });
  } else {
    conn.sendFile(m.chat, mediaPath, 'grupo.jpg', text, m, false, { mentions });
  }
};

handler.help    = ['infogrupo'];
handler.tags    = ['group'];
handler.command = /^(infogrupo|gro?upinfo|info(gro?up|gc))$/i;
handler.group   = true;

export default handler;
