import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

if (!global.muted) global.muted = [];

const handler = async (m, { conn, usedPrefix, isOwner, command }) => {
  try {
    if (!m.isGroup) return m.reply('*[⚠] Este comando solo funciona en grupos.*');

    const { participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

    if (!isBotAdmin) {
      return m.reply('*[⚠] El bot debe ser administrador para usar este comando.*');
    }

    if (!isAdmin && !isOwner) {
      return m.reply('*[⚠] Solo los administradores pueden usar este comando.*');
    }

    const resolveLid = (jid) => {
      if (!jid) return null;
      if (!jid.includes('@lid')) return jid;
      const p = participants.find(u => u.lid === jid);
      return p?.id || null;
    };

    let user = null;

    if (m.mentionedJid?.[0]) {
      user = resolveLid(m.mentionedJid[0]) || m.mentionedJid[0];
    } else if (m.quoted?.sender) {
      user = resolveLid(m.quoted.sender) || m.quoted.sender;
    } else if (m.text) {
      const num = m.text.replace(/[^0-9]/g, '');
      if (num.length < 11 || num.length > 15) {
        return m.reply('*[⚠] Número inválido*');
      }
      user = num + '@s.whatsapp.net';
    }

    if (!user) {
      const msg = `*Uso:* ${usedPrefix}${command} @tag\n*⚠ ${usedPrefix}${command} 573012345678*`;
      return m.reply(msg, m.chat, { mentions: conn.parseMention(msg) });
    }

    const exists = participants.find(p => p.id === user);
    if (!exists) {
      return m.reply('*[⚠] La persona mencionada no está en el grupo.*');
    }

    const muteKey = `${m.chat}_${user}`;
    const isMuted = global.muted.includes(muteKey);

    if (command === 'mute' || command === 'silenciar') {
      if (isMuted) return m.reply('*[⚠] Este usuario ya está silenciado*');
      global.muted.push(muteKey);
      await m.reply(`*✓ @${user.split('@')[0]} ha sido silenciado*`, null, { mentions: [user] });
    }

    if (command === 'unmute' || command === 'dessilenciar') {
      if (!isMuted) return m.reply('*[⚠] Este usuario no está silenciado*');
      global.muted.splice(global.muted.indexOf(muteKey), 1);
      await m.reply(`*✓ @${user.split('@')[0]} ha sido dessilenciado*`, null, { mentions: [user] });
    }
  } catch (e) {
    console.error('[ERROR MUTE]', e);
    await m.reply('*[⚠] Error al procesar el comando.*');
  }
};

handler.help = ['mute <@user>', 'silenciar <@user>', 'unmute <@user>', 'dessilenciar <@user>'];
handler.tags = ['group'];
handler.command = /^(mute|silenciar|unmute|dessilenciar)$/i;
handler.group = true;

export default handler;