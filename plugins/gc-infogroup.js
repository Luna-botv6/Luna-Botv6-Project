import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { getConfig } from '../lib/funcConfig.js';

const handler = async (m, { conn }) => {
  const datas  = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor   = _translate.plugins.gc_infogroup;

  const { groupMetadata, participants, isBotAdmin } =
    await getGroupDataForPlugin(conn, m.chat, m.sender);

  const config = getConfig(m.chat);

  const pp = await conn.profilePictureUrl(m.chat, 'image').catch(() => null)
    || './src/avatar_contact.png';

  const groupAdmins = participants.filter(
    p => p.admin === 'admin' || p.admin === 'superadmin'
  );

  const owner =
    groupMetadata.owner ||
    participants.find(p => p.admin === 'superadmin')?.id ||
    m.chat.split('-')[0] + '@s.whatsapp.net';

  const listAdmin = groupAdmins.length > 0
    ? groupAdmins.map((v, i) => `   ${i + 1}. @${v.id.split('@')[0]}`).join('\n')
    : `   ${tradutor.texto1[22] || 'Sin admins registrados'}`;

  const on  = '✅';
  const off = '❌';
  const sep = '─────────────────────';

  const createdAt = groupMetadata.creation
    ? new Date(groupMetadata.creation * 1000).toLocaleDateString('es-AR', {
        day: '2-digit', month: 'long', year: 'numeric'
      })
    : '—';

  const text = `
╔══════════════════════╗
   🌙 *INFORMACIÓN DEL GRUPO*
╚══════════════════════╝

📛 *${groupMetadata.subject || '—'}*
🆔 \`${groupMetadata.id}\`
📅 Creado: ${createdAt}
👥 Miembros: *${participants.length}* ${tradutor.texto1[5] || ''}

${sep}
👑 *DUEÑO*
   @${owner.split('@')[0]}

🛡️ *ADMINISTRADORES* (${groupAdmins.length})
${listAdmin}

${sep}
📋 *DESCRIPCIÓN*
${groupMetadata.desc?.toString()?.trim() || tradutor.texto1[22] || 'Sin descripción'}

${sep}
⚙️ *CONFIGURACIÓN DEL GRUPO*

${on} Bienvenida     ${config.welcome        ? on : off}
${on} Anti-Link      ${config.antiLink       ? on : off}
${on} Anti-Link2     ${config.antiLink2      ? on : off}
${on} Anti-Tóxico    ${config.antiToxic      ? on : off}
${on} Anti-Traba     ${config.antiTraba      ? on : off}
${on} Anti-Delete    ${config.antidelete     ? on : off}
${on} Anti-ViewOnce  ${config.antiviewonce   ? on : off}
${on} Modo Admin     ${config.modoadmin      ? on : off}
${on} Auto-Sticker   ${config.autosticker    ? on : off}
${on} Audios Bot     ${config.audios         ? on : off}
${on} Modo Horny     ${config.modohorny      ? on : off}
${on} Detección      ${config.detect         ? on : off}
${on} Detección 2    ${config.detect2        ? on : off}

${sep}
🤖 Bot admin: ${isBotAdmin ? on : off}
`.trim();

  const mentions = [
    ...groupAdmins.map(v => v.id),
    owner
  ];

  conn.sendFile(m.chat, pp, 'grupo.jpg', text, m, false, { mentions });
};

handler.help    = ['infogrup'];
handler.tags    = ['group'];
handler.command = /^(infogrupo|gro?upinfo|info(gro?up|gc))$/i;
handler.group   = true;

export default handler;