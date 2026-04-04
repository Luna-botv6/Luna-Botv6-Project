import { setConfig, getConfig } from '../lib/funcConfig.js';

const handler = async (m, { conn, args }) => {
  const botJid = conn.decodeJid(conn.user.jid);

  if (!args[0]) {
    await m.reply('⏳ Obteniendo lista de grupos baneados...');

    const groupsObj    = await conn.groupFetchAllParticipating();
    const allGroups    = Object.entries(groupsObj);
    const bannedGroups = allGroups.filter(([jid]) => global.db?.data?.chats?.[jid]?.isBanned);

    if (!bannedGroups.length) return m.reply('✅ No hay grupos baneados actualmente.');

    let txt = `🚫 *GRUPOS BANEADOS (${bannedGroups.length})*\n\n`;

    for (let i = 0; i < bannedGroups.length; i++) {
      const [jid, meta] = bannedGroups[i];
      const participants = meta.participants || [];
      const bot          = participants.find(u => conn.decodeJid(u.id) === botJid);
      const isBotAdmin   = bot?.admin === 'admin' || bot?.admin === 'superadmin';

      txt += `*${i + 1}.* ${meta.subject || jid}\n`;
      txt += `🆔 \`${jid}\`\n`;
      txt += `👥 ${participants.length} miembros | 🛡️ Admin: ${isBotAdmin ? 'Sí' : 'No'}\n\n`;
    }

    txt += `_Usá .unbanid <id> para desbanear un grupo_`;
    return m.reply(txt);
  }

  const targetJid = args[0].trim().endsWith('@g.us')
    ? args[0].trim()
    : args[0].trim() + '@g.us';

  if (!getConfig(targetJid).isBanned) {
    return m.reply('⚠️ Ese grupo no está baneado.');
  }

  let groupMeta = null;
  try {
    groupMeta = await conn.groupMetadata(targetJid);
  } catch {
    return m.reply('❌ No se encontró ese grupo o el bot no está en él.');
  }

  setConfig(targetJid, { isBanned: false });

  await conn.sendMessage(targetJid, {
    text: `✅ *Este chat ha sido desbaneado*\n\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🎉 El bot vuelve a estar *activo* en este grupo.\n` +
          `👑 Autorizado por el *owner* del bot.\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `_¡Ya podés usar todos los comandos normalmente!_`
  });

  return m.reply(
    `✅ *Grupo desbaneado exitosamente*\n\n` +
    `📛 *Nombre:* ${groupMeta.subject}\n` +
    `🆔 *ID:* ${targetJid}\n` +
    `👥 *Miembros:* ${groupMeta.participants?.length || '?'}\n\n` +
    `_Se envió el aviso al grupo._`
  );
};

handler.help = ['unbanid <id-grupo>'];
handler.tags = ['owner'];
handler.command = /^(unbanid|unbanchatid)$/i;
handler.rowner = true;
handler.private = true;

export default handler;
