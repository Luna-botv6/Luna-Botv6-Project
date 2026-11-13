import { getConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { marcarMotivo } from '../lib/funcion/leave-reason.js';
import { filtrosActivos, numeroBloqueado, esProtegido, jidParaExpulsar, jidDeMencion } from '../lib/funcion/filtro-numeros.js';

const ETIQUETA = {
  antinumero: 'número no permitido',
  antiarabes: 'número de país bloqueado'
};

function norm(jid) {
  return String(jid || '').split('@')[0].replace(/\D/g, '');
}

async function getAdmins(conn, chatId) {
  try {
    const meta = await conn.groupMetadata(chatId);
    return meta.participants
      .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
      .map(p => p.phoneNumber || p.id);
  } catch {
    return [];
  }
}

const handler = async (m, { conn }) => {
  try {
    if (!m.isGroup || !m.sender) return;

    const config = getConfig(m.chat);
    const filtros = filtrosActivos(config);
    if (!filtros.length) return;

    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    if (groupData.isAdmin) return;

    const senderNorm = norm(m.sender);
    const participante = (groupData.participants || []).find(
      p => norm(p.id) === senderNorm || norm(p.lid) === senderNorm
    ) || m.sender;

    if (esProtegido(participante, conn, groupData.isAdmin)) return;

    const match = numeroBloqueado(participante, filtros, conn);
    if (!match) return;

    const mencion = jidDeMencion(participante, m.sender);
    const numero = norm(mencion) || senderNorm;
    const { isBotAdmin } = groupData;
    const motivo = ETIQUETA[match.tipo] || 'filtro';

    if (!isBotAdmin) {
      const admins = await getAdmins(conn, m.chat);
      await conn.sendMessage(m.chat, {
        text: `🚨 *ALERTA PARA ADMINISTRADORES*\n\n👤 *Usuario:* @${numero}\n🚫 *Motivo:* ${motivo} (*${match.prefijo}*)\n\n❌ *No soy administrador/a, no puedo borrar ni expulsar.*\n📢 *Por favor expúlsenlo manualmente.*`,
        mentions: [mencion, ...admins]
      });
      return;
    }

    try { await conn.sendMessage(m.chat, { delete: m.key }); } catch {}

    let expulsado = false;
    try {
      marcarMotivo(m.chat, [m.sender], { tipo: match.tipo, prefijo: match.prefijo });
      await conn.groupParticipantsUpdate(m.chat, [jidParaExpulsar(participante, m.sender)], 'remove');
      expulsado = true;
    } catch {}

    await conn.sendMessage(m.chat, {
      text: `🚫 *ACCESO BLOQUEADO*\n\n👤 *Usuario:* @${numero}\n🚫 *Motivo:* ${motivo} (*${match.prefijo}*)\n${expulsado ? '✅ *Expulsado y mensaje eliminado.*' : '⚠️ *No pude expulsarlo, avisen a un admin.*'}`,
      mentions: [mencion]
    });
  } catch {}
};

handler.before = async function (m, extra) {
  return await handler(m, extra);
};

export default handler;
