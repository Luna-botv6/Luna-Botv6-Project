import fs from 'fs';

const handler = async (m, { conn }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_grouplist;
  let txt = '';

  try {
    await m.reply('🔄 Limpiando caché y verificando grupos...');

    for (const jid of Object.keys(conn.chats)) {
      if (jid.endsWith('@g.us')) delete conn.chats[jid];
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const botJid = conn.decodeJid(conn.user.jid);
    const groupsObj = await conn.groupFetchAllParticipating();
    const allGroups = Object.entries(groupsObj);

    const activeGroups = [];
    let limpiadosCount = 0;

    for (const [jid] of allGroups) {
      const freshMeta = await conn.groupMetadata(jid).catch(() => null);
      if (!freshMeta || !freshMeta.participants?.length) continue;

      const botParticipant = freshMeta.participants.find(u => conn.decodeJid(u.id) === botJid);
      if (!botParticipant) continue;

      if (freshMeta.participants.length <= 1) {
        try {
          await conn.groupLeave(jid);
          await new Promise(resolve => setTimeout(resolve, 500));
          await conn.chatModify(
            { delete: true, lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }] },
            jid
          );
          limpiadosCount++;
        } catch (err) {
          console.error(`Error saliendo del grupo ${jid}:`, err.message);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }

      activeGroups.push([jid, freshMeta]);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (limpiadosCount > 0) {
      await conn.sendMessage(m.chat, {
        text: `🧹 Se salió y eliminó ${limpiadosCount} grupo(s) donde el bot estaba solo.`
      });
    }

    const totalGroups = activeGroups.length;

    for (let i = 0; i < activeGroups.length; i++) {
      const [jid, groupMetadata] = activeGroups[i];
      const participants = groupMetadata.participants || [];
      const bot = participants.find(u => conn.decodeJid(u.id) === botJid) || {};
      const isBotAdmin = bot?.admin === 'admin' || bot?.admin === 'superadmin';
      const totalParticipants = participants.length;

      let inviteLink = '--- (No admin) ---';
      if (isBotAdmin) {
        const code = await conn.groupInviteCode(jid).catch(() => null);
        inviteLink = code ? `https://chat.whatsapp.com/${code}` : '--- (Error) ---';
      }

      txt += `${tradutor.texto2[0]} ${i + 1}
    ${tradutor.texto2[1]} ${groupMetadata.subject || jid}
    ${tradutor.texto2[2]} ${jid}
    ${tradutor.texto2[3]} ${isBotAdmin ? '✔ Sí' : '❌ No'}
    ${tradutor.texto2[4]} ${tradutor.texto1[0]}
    ${tradutor.texto2[5]} ${totalParticipants}
    ${tradutor.texto2[6]} ${inviteLink}\n\n`;
    }

    m.reply(`${tradutor.texto3} ${totalGroups}\n\n${txt}`.trim());

  } catch (err) {
    console.error('Error en listagrupos:', err);
    m.reply('❌ Error al obtener la lista de grupos.');
  }
};

handler.help = ['groups', 'grouplist'];
handler.tags = ['info'];
handler.command = /^(groups|grouplist|listadegrupo|gruposlista|listagrupos|listgroup)$/i;
handler.rowner = true;
handler.private = true;

export default handler;