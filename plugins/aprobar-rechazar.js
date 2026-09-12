import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

let isListenerActive = false;
let monitoringInterval = null;

async function checkAndProcessRequests(conn, groupJid) {
  try {
    const chat = global.db.data.chats[groupJid];
    if (!chat || (!chat.autoApprove && !chat.autoReject)) return;

    const idioma = chat.language || global.defaultLenguaje || 'es';
    const _tr = await global.loadTranslation(idioma);
    const t = _tr?.plugins?.aprobar_rechazar || {};

    const requests = await conn.groupRequestParticipantsList(groupJid).catch(() => []);
    if (!requests || requests.length === 0) return;

    const users = requests.map(r => r.jid);

    if (chat.autoApprove) {
      await conn.groupRequestParticipantsUpdate(groupJid, users, 'approve');

      const persona = users.length === 1
        ? (t.persona_singular || 'persona ha')
        : (t.persona_plural || 'personas han');
      const message = (t.auto_aprobado || '✅ *Aprobación Automática*\n\n🌟 {count} {persona} sido aprobadas automáticamente\n\n💫 ¡Bienvenidos al grupo!')
        .replace('{count}', users.length)
        .replace('{persona}', persona);
      await conn.sendMessage(groupJid, { text: message });
    }

    if (chat.autoReject) {
      await conn.groupRequestParticipantsUpdate(groupJid, users, 'reject');

      const solicitud = users.length === 1
        ? (t.solicitud_singular || 'solicitud ha')
        : (t.solicitud_plural || 'solicitudes han');
      const message = (t.auto_rechazado || '❌ *Rechazo Automático*\n\n💫 {count} {solicitud} sido rechazadas automáticamente')
        .replace('{count}', users.length)
        .replace('{solicitud}', solicitud);
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
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.aprobar_rechazar || {};

  if (!m.isGroup) return m.reply(t.solo_grupos || '🌙 Este comando solo funciona en grupos');

  try {
    if (!isListenerActive) {
      initRequestListener(conn);
    }

    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);

    if (!groupData.isBotAdmin) {
      return m.reply(t.necesito_admin || '✨ Necesito ser administrador para gestionar solicitudes de ingreso');
    }

    if (!groupData.isAdmin) {
      return m.reply(t.solo_admins || '🌟 Solo los administradores pueden gestionar las solicitudes');
    }

    const chatSettings = global.db.data.chats[m.chat] || {};

    if (command === 'aprobarauto' || command === 'autoaprobar') {
      if (!text || !['on', 'off', 'activar', 'desactivar'].includes(text.toLowerCase())) {
        const estado = chatSettings.autoApprove ? (t.estado_on || 'activado ✅') : (t.estado_off || 'desactivado ❌');
        return m.reply((t.aprobarauto_estado || '🌙 *Aprobación Automática*\n\n💫 Estado: {estado}\n\n✦ *Comandos:*\n• {prefix}aprobarauto on\n• {prefix}aprobarauto off')
          .replace('{estado}', estado)
          .replace(/\{prefix\}/g, usedPrefix));
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
          m.reply((t.aprobarauto_activado_con_pendientes || '✅ *Aprobación Automática Activada*\n\n🌟 Se han aprobado {count} solicitud(es) pendiente(s)\n\n💫 Ahora aprobaré automáticamente todas las nuevas solicitudes').replace('{count}', users.length));
        } else {
          m.reply(t.aprobarauto_activado_sin_pendientes || '✅ *Aprobación Automática Activada*\n\n🌟 Ahora aprobaré automáticamente todas las solicitudes de ingreso');
        }
      } else {
        m.reply(t.aprobarauto_desactivado || '❌ *Aprobación Automática Desactivada*\n\n💫 Las solicitudes deberán ser gestionadas manualmente');
      }
    }

    if (command === 'rechazarauto' || command === 'autorechazar') {
      if (!text || !['on', 'off', 'activar', 'desactivar'].includes(text.toLowerCase())) {
        const estado = chatSettings.autoReject ? (t.estado_on || 'activado ✅') : (t.estado_off || 'desactivado ❌');
        return m.reply((t.rechazarauto_estado || '🌙 *Rechazo Automático*\n\n💫 Estado: {estado}\n\n✦ *Comandos:*\n• {prefix}rechazarauto on\n• {prefix}rechazarauto off')
          .replace('{estado}', estado)
          .replace(/\{prefix\}/g, usedPrefix));
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
          m.reply((t.rechazarauto_activado_con_pendientes || '❌ *Rechazo Automático Activado*\n\n💫 Se han rechazado {count} solicitud(es) pendiente(s)\n\n⚠️ Ahora rechazaré automáticamente todas las nuevas solicitudes').replace('{count}', users.length));
        } else {
          m.reply(t.rechazarauto_activado_sin_pendientes || '❌ *Rechazo Automático Activado*\n\n💫 Ahora rechazaré automáticamente todas las solicitudes de ingreso');
        }
      } else {
        m.reply(t.rechazarauto_desactivado || '✅ *Rechazo Automático Desactivado*\n\n💫 Las solicitudes deberán ser gestionadas manualmente');
      }
    }

    if (command === 'solicitudes' || command === 'requests') {
      try {
        const requests = await conn.groupRequestParticipantsList(m.chat);

        if (!requests || requests.length === 0) {
          const autoApprove = chatSettings.autoApprove ? (t.estado_on_corto || '✅ ON') : (t.estado_off_corto || '❌ OFF');
          const autoReject = chatSettings.autoReject ? (t.estado_on_corto || '✅ ON') : (t.estado_off_corto || '❌ OFF');

          return m.reply((t.solicitudes_vacio || '💫 No hay solicitudes pendientes\n\n✦ *Estado actual:*\n• Aprobar auto: {autoApprove}\n• Rechazar auto: {autoReject}')
            .replace('{autoApprove}', autoApprove)
            .replace('{autoReject}', autoReject));
        }

        let message = (t.solicitudes_header || '🌙 *Solicitudes de Ingreso Pendientes*\n\n📊 Total: {total}\n\n').replace('{total}', requests.length);

        requests.forEach((req, i) => {
          const number = req.jid.split('@')[0];
          message += (t.solicitudes_item || '{index}. 📱 +{numero}\n')
            .replace('{index}', i + 1)
            .replace('{numero}', number);
        });

        message += (t.solicitudes_footer || '\n✦ *Comandos:*\n• {prefix}aprobar 1\n• {prefix}rechazar 1\n• {prefix}aprobartodos\n• {prefix}rechazartodos')
          .replace(/\{prefix\}/g, usedPrefix);

        await m.reply(message);
      } catch (e) {
        console.error(e);
        m.reply(t.error_obtener_solicitudes || '⚠️ Error al obtener solicitudes');
      }
    }

    if (command === 'aprobar' || command === 'aceptar') {
      if (!text) return m.reply(t.indica_numero || 'Indica el número de la solicitud');

      try {
        const requests = await conn.groupRequestParticipantsList(m.chat);
        if (!requests || requests.length === 0) return m.reply(t.sin_pendientes || 'No hay solicitudes pendientes');

        const index = parseInt(text) - 1;
        if (isNaN(index) || index < 0 || index >= requests.length) return m.reply(t.numero_invalido || 'Número inválido');

        const userToApprove = requests[index];
        await conn.groupRequestParticipantsUpdate(m.chat, [userToApprove.jid], 'approve');

        const number = userToApprove.jid.split('@')[0];
        await m.reply((t.aprobar_exito || '✅ Solicitud aprobada\n\n👤 +{numero}').replace('{numero}', number));
      } catch (e) {
        console.error(e);
        m.reply(t.error_aprobar || 'Error al aprobar');
      }
    }

    if (command === 'rechazar' || command === 'denegar') {
      if (!text) return m.reply(t.indica_numero || 'Indica el número de la solicitud');

      try {
        const requests = await conn.groupRequestParticipantsList(m.chat);
        if (!requests || requests.length === 0) return m.reply(t.sin_pendientes || 'No hay solicitudes pendientes');

        const index = parseInt(text) - 1;
        if (isNaN(index) || index < 0 || index >= requests.length) return m.reply(t.numero_invalido || 'Número inválido');

        const userToReject = requests[index];
        await conn.groupRequestParticipantsUpdate(m.chat, [userToReject.jid], 'reject');

        const number = userToReject.jid.split('@')[0];
        await m.reply((t.rechazar_exito || '❌ Solicitud rechazada\n\n👤 +{numero}').replace('{numero}', number));
      } catch (e) {
        console.error(e);
        m.reply(t.error_rechazar || 'Error al rechazar');
      }
    }

    if (command === 'aprobartodos' || command === 'aceptartodos') {
      try {
        const requests = await conn.groupRequestParticipantsList(m.chat);
        if (!requests || requests.length === 0) return m.reply(t.sin_pendientes || 'No hay solicitudes pendientes');

        const users = requests.map(r => r.jid);
        await conn.groupRequestParticipantsUpdate(m.chat, users, 'approve');

        await m.reply((t.aprobar_todos_exito || '✅ Todas las solicitudes aprobadas\n\n📊 Total: {total}').replace('{total}', users.length));
      } catch (e) {
        console.error(e);
        m.reply(t.error_aprobar || 'Error al aprobar');
      }
    }

    if (command === 'rechazartodos' || command === 'denegartodos') {
      try {
        const requests = await conn.groupRequestParticipantsList(m.chat);
        if (!requests || requests.length === 0) return m.reply(t.sin_pendientes || 'No hay solicitudes pendientes');

        const users = requests.map(r => r.jid);
        await conn.groupRequestParticipantsUpdate(m.chat, users, 'reject');

        await m.reply((t.rechazar_todos_exito || '❌ Todas las solicitudes rechazadas\n\n📊 Total: {total}').replace('{total}', users.length));
      } catch (e) {
        console.error(e);
        m.reply(t.error_rechazar || 'Error al rechazar');
      }
    }
  } catch (e) {
    console.error('Error en plugin de solicitudes:', e);
    m.reply(t.error_inesperado || 'Error inesperado');
  }
};

handler.help = ['aprobarauto', 'rechazarauto', 'solicitudes', 'aprobar', 'rechazar'];
handler.tags = ['group'];
handler.command = /^(aprobarauto|autoaprobar|rechazarauto|autorechazar|solicitudes|requests|aprobar|aceptar|rechazar|denegar|aprobartodos|aceptartodos|rechazartodos|denegartodos)$/i;
handler.group = true;

export default handler;
