function normalizeJid(jid) {
  return jid.includes('@') ? jid : jid + '@s.whatsapp.net';
}

let handler = async (m, { isOwner, conn, participants, args, command }) => {
  const senderNumber = m.sender.split('@')[0];
  const groupMetadata = await conn.groupMetadata(m.chat);
  const allParticipants = groupMetadata.participants || [];

  const user = allParticipants.find(p =>
    p.id === m.sender ||
    p.id.split('@')[0] === senderNumber ||
    conn.decodeJid(p.id) === m.sender
  ) || { id: m.sender, admin: null };

  const isAdmin = user.admin === 'admin' || user.admin === 'superadmin' || isOwner;
  const isRAdmin = user.admin === 'superadmin';

  const botNumber = conn.user.jid.split('@')[0];
  const bot = allParticipants.find(p =>
    p.id === conn.user.jid ||
    p.id.split('@')[0] === botNumber ||
    conn.decodeJid(p.id) === conn.user.jid
  ) || {};

  const isBotAdmin = bot.admin === 'admin' || bot.admin === 'superadmin';

  if (!isAdmin) {
    return m.reply('❌ Solo los administradores pueden usar este comando.');
  }

  if (!isBotAdmin) {
    return m.reply('⚠️ El bot necesita ser administrador para ejecutar esta función.');
  }

  const wm = global.wm || 'LunaBot';
  const vs = global.vs || '6.0';
  const lenguajeGB = global.lenguajeGB || {
    smstagaa: () => '📢 Mención General',
    smsAddB5: () => '🔔 Atentos todos:',
  };

  const groupName = await conn.getName(m.chat);

  if (['tagall', 'invocar', 'todos', 'invocacion', 'invocación'].includes(command.toLowerCase())) {
    let mensaje = args.join(' ') || '';
    let texto = `╭───『 *${lenguajeGB.smstagaa()}* 』───⬣
│
│ ${lenguajeGB.smsAddB5()}
│ ✦ ${mensaje}
│
│ 👥 *Miembros del grupo: ${allParticipants.length}*
│`;

    for (let mem of allParticipants) {
      texto += `│ ⊹ @${mem.id.split('@')[0]}\n`;
    }

    texto += `│\n│ © ${wm}\n╰───────〔 v${vs} 〕───────⬣`;

    const mentions = allParticipants.map(p => normalizeJid(p.id));
    await conn.sendMessage(m.chat, { text: texto, mentions });
  }

  if (command.toLowerCase() === 'contador') {
    let memberData = allParticipants.map(mem => {
      let userId = normalizeJid(mem.id);
      let userData = global.db.data.users[userId] || {};
      let msgCount = userData.mensaje?.[m.chat] || 0;
      return { id: userId, messages: msgCount };
    });

    memberData.sort((a, b) => b.messages - a.messages);

    let activos = memberData.filter(mem => mem.messages > 0).length;
    let inactivos = memberData.length - activos;

    let texto = `╭───『 *📊 Estadísticas de Actividad* 』───⬣
│
│ 🏷️ *Grupo:* ${groupName}
│ 👥 *Miembros:* ${allParticipants.length}
│ ✅ *Activos:* ${activos}
│ ❌ *Inactivos:* ${inactivos}
│`;

    for (let mem of memberData) {
      texto += `│ ⊹ @${mem.id.split('@')[0]} ┊ ${mem.messages} mensajes\n`;
    }

    texto += `│\n│ © ${wm}\n╰───────〔 v${vs} 〕───────⬣`;

    const mentions = memberData.map(u => u.id);
    await conn.sendMessage(m.chat, { text: texto, mentions }, { quoted: m });
  }
};

handler.command = /^(tagall|invocar|invocacion|todos|invocación|contador)$/i;
handler.group = true;

export default handler;

