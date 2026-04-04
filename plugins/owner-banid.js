import { setConfig } from '../lib/funcConfig.js';

const handler = async (m, { conn, args }) => {
  const botJid = conn.decodeJid(conn.user.jid);

  if (!args[0]) {
    await m.reply('⏳ Obteniendo lista de grupos...');

    const groupsObj = await conn.groupFetchAllParticipating();
    const allGroups = Object.entries(groupsObj);

    if (!allGroups.length) return m.reply('❌ El bot no está en ningún grupo.');

    let txt = `📋 *GRUPOS ACTIVOS DEL BOT*\n\n`;

    for (let i = 0; i < allGroups.length; i++) {
      const [jid, meta] = allGroups[i];
      const participants  = meta.participants || [];
      const bot           = participants.find(u => conn.decodeJid(u.id) === botJid);
      const isBotAdmin    = bot?.admin === 'admin' || bot?.admin === 'superadmin';
      const banned        = global.db?.data?.chats?.[jid]?.isBanned ? '🚫 Baneado' : '✅ Activo';

      txt += `*${i + 1}.* ${meta.subject || jid}\n`;
      txt += `🆔 \`${jid}\`\n`;
      txt += `👥 ${participants.length} miembros | 🛡️ Admin: ${isBotAdmin ? 'Sí' : 'No'} | ${banned}\n\n`;
    }

    txt += `_Usá .banid <id> para banear un grupo_`;
    return m.reply(txt);
  }

  const targetJid = args[0].trim().endsWith('@g.us')
    ? args[0].trim()
    : args[0].trim() + '@g.us';

  let groupMeta = null;
  try {
    groupMeta = await conn.groupMetadata(targetJid);
  } catch {
    return m.reply('❌ No se encontró ese grupo o el bot no está en él.');
  }

  if (!groupMeta) return m.reply('❌ No se encontró ese grupo o el bot no está en él.');

  setConfig(targetJid, { isBanned: true });

  await conn.sendMessage(targetJid, {
    text: `🚫 *Este chat ha sido baneado*\n\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `⛔ El bot ya *no responderá* en este grupo.\n` +
          `👑 Decisión tomada por el *owner* del bot.\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `_Si creés que es un error, contactá al owner._`
  });

  return m.reply(
    `✅ *Grupo baneado exitosamente*\n\n` +
    `📛 *Nombre:* ${groupMeta.subject}\n` +
    `🆔 *ID:* ${targetJid}\n` +
    `👥 *Miembros:* ${groupMeta.participants?.length || '?'}\n\n` +
    `_Se envió el aviso al grupo._`
  );
};

handler.help = ['banid <id-grupo>'];
handler.tags = ['owner'];
handler.command = /^(banid|banchatid)$/i;
handler.rowner = true;
handler.private = true;

export default handler;
