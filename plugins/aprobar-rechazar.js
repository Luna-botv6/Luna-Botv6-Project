import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

let isListenerActive = false;
let monitoringInterval = null;

async function checkAndProcessRequests(conn, groupJid) {
  try {
    const chat = global.db.data.chats[groupJid];
    if (!chat || (!chat.autoApprove && !chat.autoReject)) return;

    const requests = await conn.groupRequestParticipantsList(groupJid).catch(() => []);
    if (!requests || requests.length === 0) return;

    const users = requests.map(r => r.jid);

    if (chat.autoApprove) {
      await conn.groupRequestParticipantsUpdate(groupJid, users, 'approve');

      const message = `✅ *Aprobación Automática*\n\n🌟 ${users.length} ${users.length === 1 ? 'persona ha' : 'personas han'} sido aprobadas automáticamente\n\n💫 ¡Bienvenidos al grupo!`;
      await conn.sendMessage(groupJid, { text: message });
    }

    if (chat.autoReject) {
      await conn.groupRequestParticipantsUpdate(groupJid, users, 'reject');

      const message = `❌ *Rechazo Automático*\n\n💫 ${users.length} ${users.length === 1 ? 'solicitud ha' : 'solicitudes han'} sido rechazadas automáticamente`;
      await conn.sendMessage(groupJid, { text: message });
    }
  } catch (e) {
    console.error('Error procesando solicitudes:', e);
  }
}

function initRequestListener(conn) {
  if (isListenerActive) return;

  conn.ev.on('group-request-participants.update', async (update) => {
    try {
      const groupJid = update.id;
      if (!groupJid) return;

      await new Promise(resolve => setTimeout(resolve, 500));
      await checkAndProcessRequests(conn, groupJid);
    } catch (e) {
      console.error('Error en group-request-participants.update:', e);
    }
  });

  conn.ev.on('messages.upsert', async ({ messages }) => {
    try {
      for (const msg of messages) {
        if (!msg.message) continue;

        const groupJid = msg.key.remoteJid;
        if (!groupJid?.endsWith('@g.us')) continue;

        if (msg.messageStubType === 172) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await checkAndProcessRequests(conn, groupJid);
        }
      }
    } catch (e) {
      console.error('Error en messages.upsert:', e);
    }
  });

  conn.ev.on('group-participants.update', async (update) => {
    try {
      const groupJid = update.id;
      if (!groupJid) return;

      await new Promise(resolve => setTimeout(resolve, 1000));
      await checkAndProcessRequests(conn, groupJid);
    } catch (e) {
      console.error('Error en group-participants.update:', e);
    }
  });

  if (monitoringInterval) clearInterval(monitoringInterval);

  monitoringInterval = setInterval(async () => {
    try {
      const chats = global.db.data.chats;
      for (const [groupJid, chat] of Object.entries(chats)) {
        if (!groupJid.endsWith('@g.us')) continue;
        if (!chat.autoApprove && !chat.autoReject) continue;

        await checkAndProcessRequests(conn, groupJid);
      }
    } catch (e) {
      console.error('Error en interval:', e);
    }
  }, 5000);

  isListenerActive = true;
  console.log('Sistema de auto-aprobación/rechazo iniciado');
}

const handler = async (m, { conn, text, command, usedPrefix }) => {
  if (!m.isGroup) return m.reply('🌙 Este comando solo funciona en grupos');

  try {
    if (!isListenerActive) {
      initRequestListener(conn);
    }

    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);

    if (!groupData.isBotAdmin) {
      return m.reply('✨ Necesito ser administrador para gestionar solicitudes de ingreso');
    }

    if (!groupData.isAdmin) {
      return m.reply('🌟 Solo los administradores pueden gestionar las solicitudes');
    }

    const chatSettings = global.db.data.chats[m.chat] || {};

    if (command === 'aprobarauto' || command === 'autoaprobar') {
      if (!text || !['on', 'off', 'activar', 'desactivar'].includes(text.toLowerCase())) {
        const status = chatSettings.autoApprove ? 'activado ✅' : 'desactivado ❌';
        return m.reply(`🌙 *Aprobación Automática*\n\n💫 Estado: ${status}\n\n✦ *Comandos:*\n• ${usedPrefix}aprobarauto on\n• ${usedPrefix}aprobarauto off`);
      }

      const enable = ['on', 'activar'].includes(text.toLowerCase());

      if (enable && chatSettings.autoReject) {
        chatSettings.autoReject = false;
      }

      chatSettings.autoApprove = enable;

      if (enable) {
        const requests = await conn.groupRequestParticipantsList(m.chat).catch(() => []);
        if (requests && requests.length > 0) {
          const users = requests.map(r => r.jid);
          await conn.groupRequestParticipantsUpdate(m.chat, users, 'approve');
          m.reply(`✅ *Aprobación Automática Activada*\n\n🌟 Se han aprobado ${users.length} solicitud(es) pendiente(s)\n\n💫 Ahora aprobaré automáticamente todas las nuevas solicitudes`);
        } else {
          m.reply(`✅ *Aprobación Automática Activada*\n\n🌟 Ahora aprobaré automáticamente todas las solicitudes de ingreso`);
        }
      } else {
        m.reply(`❌ *Aprobación Automática Desactivada*\n\n💫 Las solicitudes deberán ser gestionadas manualmente`);
      }
    }

    if (command === 'rechazarauto' || command === 'autorechazar') {
      if (!text || !['on', 'off', 'activar', 'desactivar'].includes(text.toLowerCase())) {
        const status = chatSettings.autoReject ? 'activado ✅' : 'desactivado ❌';
        return m.reply(`🌙 *Rechazo Automático*\n\n💫 Estado: ${status}\n\n✦ *Comandos:*\n• ${usedPrefix}rechazarauto on\n• ${usedPrefix}rechazarauto off`);
      }

      const enable = ['on', 'activar'].includes(text.toLowerCase());

      if (enable && chatSettings.autoApprove) {
        chatSettings.autoApprove = false;
      }

      chatSettings.autoReject = enable;

      if (enable) {
        const requests = await conn.groupRequestParticipantsList(m.chat).catch(() => []);
        if (requests && requests.length > 0) {
          const users = requests.map(r => r.jid);
          await conn.groupRequestParticipantsUpdate(m.chat, users, 'reject');
          m.reply(`❌ *Rechazo Automático Activado*\n\n💫 Se han rechazado ${users.length} solicitud(es) pendiente(s)\n\n⚠️ Ahora rechazaré automáticamente todas las nuevas solicitudes`);
        } else {
          m.reply(`❌ *Rechazo Automático Activado*\n\n💫 Ahora rechazaré automáticamente todas las solicitudes de ingreso`);
        }
      } else {
        m.reply(`✅ *Rechazo Automático Desactivado*\n\n💫 Las solicitudes deberán ser gestionadas manualmente`);
      }
    }

    if (command === 'solicitudes' || command === 'requests') {
      try {
        const requests = await conn.groupRequestParticipantsList(m.chat);

        if (!requests || requests.length === 0) {
          const autoApprove = chatSettings.autoApprove ? '✅ ON' : '❌ OFF';
          const autoReject = chatSettings.autoReject ? '✅ ON' : '❌ OFF';

          return m.reply(`💫 No hay solicitudes pendientes\n\n✦ *Estado actual:*\n• Aprobar auto: ${autoApprove}\n• Rechazar auto: ${autoReject}`);
        }

        let message = `🌙 *Solicitudes de Ingreso Pendientes*\n\n`;
        message += `📊 Total: ${requests.length}\n\n`;

        requests.forEach((req, i) => {
          const number = req.jid.split('@')[0];
          message += `${i + 1}. 📱 +${number}\n`;
        });

        message += `\n✦ *Comandos:*\n`;
        message += `• ${usedPrefix}aprobar 1\n`;
        message += `• ${usedPrefix}rechazar 1\n`;
        message += `• ${usedPrefix}aprobartodos\n`;
        message += `• ${usedPrefix}rechazartodos`;

        await m.reply(message);
      } catch (e) {
        console.error(e);
        m.reply('⚠️ Error al obtener solicitudes');
      }
    }

    if (command === 'aprobar' || command === 'aceptar') {
      if (!text) return m.reply(`Indica el número de la solicitud`);

      try {
        const requests = await conn.groupRequestParticipantsList(m.chat);
        if (!requests || requests.length === 0) return m.reply('No hay solicitudes pendientes');

        const index = parseInt(text) - 1;
        if (isNaN(index) || index < 0 || index >= requests.length) return m.reply('Número inválido');

        const userToApprove = requests[index];
        await conn.groupRequestParticipantsUpdate(m.chat, [userToApprove.jid], 'approve');

        const number = userToApprove.jid.split('@')[0];
        await m.reply(`✅ Solicitud aprobada\n\n👤 +${number}`);
      } catch (e) {
        console.error(e);
        m.reply('Error al aprobar');
      }
    }

    if (command === 'rechazar' || command === 'denegar') {
      if (!text) return m.reply(`Indica el número de la solicitud`);

      try {
        const requests = await conn.groupRequestParticipantsList(m.chat);
        if (!requests || requests.length === 0) return m.reply('No hay solicitudes pendientes');

        const index = parseInt(text) - 1;
        if (isNaN(index) || index < 0 || index >= requests.length) return m.reply('Número inválido');

        const userToReject = requests[index];
        await conn.groupRequestParticipantsUpdate(m.chat, [userToReject.jid], 'reject');

        const number = userToReject.jid.split('@')[0];
        await m.reply(`❌ Solicitud rechazada\n\n👤 +${number}`);
      } catch (e) {
        console.error(e);
        m.reply('Error al rechazar');
      }
    }

    if (command === 'aprobartodos' || command === 'aceptartodos') {
      try {
        const requests = await conn.groupRequestParticipantsList(m.chat);
        if (!requests || requests.length === 0) return m.reply('No hay solicitudes pendientes');

        const users = requests.map(r => r.jid);
        await conn.groupRequestParticipantsUpdate(m.chat, users, 'approve');

        await m.reply(`✅ Todas las solicitudes aprobadas\n\n📊 Total: ${users.length}`);
      } catch (e) {
        console.error(e);
        m.reply('Error al aprobar');
      }
    }

    if (command === 'rechazartodos' || command === 'denegartodos') {
      try {
        const requests = await conn.groupRequestParticipantsList(m.chat);
        if (!requests || requests.length === 0) return m.reply('No hay solicitudes pendientes');

        const users = requests.map(r => r.jid);
        await conn.groupRequestParticipantsUpdate(m.chat, users, 'reject');

        await m.reply(`❌ Todas las solicitudes rechazadas\n\n📊 Total: ${users.length}`);
      } catch (e) {
        console.error(e);
        m.reply('Error al rechazar');
      }
    }
  } catch (e) {
    console.error('Error en plugin de solicitudes:', e);
    m.reply('Error inesperado');
  }
};

handler.help = ['aprobarauto', 'rechazarauto', 'solicitudes', 'aprobar', 'rechazar'];
handler.tags = ['group'];
handler.command = /^(aprobarauto|autoaprobar|rechazarauto|autorechazar|solicitudes|requests|aprobar|aceptar|rechazar|denegar|aprobartodos|aceptartodos|rechazartodos|denegartodos)$/i;
handler.group = true;

export default handler;
