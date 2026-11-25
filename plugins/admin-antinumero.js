import { getConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { marcarMotivo } from '../lib/funcion/leave-reason.js';
import { filtrosActivos, numeroBloqueado, numeroBloqueadoGlobal, numeroBloqueadoDelGrupo, permitidoGlobal, esProtegido, jidParaExpulsar, jidDeMencion } from '../lib/funcion/filtro-numeros.js';
import { getFiltrosGlobales } from '../lib/funcion/filtros-globales.js';
import { esInmune, esNumeroPermitido, numerosBloqueados } from '../lib/funcion/proteccion-grupo.js';
import { registrarEliminado } from '../lib/funcion/numeros-eliminados.js';

const ETIQUETA = {
  antinumero: 'número no permitido',
  antiarabes: 'número de país bloqueado',
  global: 'número bloqueado (global)',
  grupo: 'número bloqueado en el grupo'
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
    const global = getFiltrosGlobales();
    const bloqueosGrupo = numerosBloqueados(m.chat);
    if (!filtros.length && !global.activo && !bloqueosGrupo.size) return;

    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    if (groupData.isAdmin) return;

    const senderNorm = norm(m.sender);
    const participante = (groupData.participants || []).find(
      p => norm(p.id) === senderNorm || norm(p.lid) === senderNorm
    ) || m.sender;

    if (esProtegido(participante, conn, groupData.isAdmin)) return;
    if (esInmune(m.chat, participante, conn, groupData.participants)) return;
    if (esNumeroPermitido(m.chat, participante, conn, groupData.participants)) return;
    if (permitidoGlobal(participante, conn)) return;

    const match = numeroBloqueado(participante, filtros, conn)
      || numeroBloqueadoGlobal(participante, conn)
      || numeroBloqueadoDelGrupo(participante, m.chat, conn, groupData.participants);
    if (!match) return;

    const mencion = jidDeMencion(participante, m.sender);
    const numero = norm(mencion) || senderNorm;
    const { isBotAdmin } = groupData;
    const motivo = ETIQUETA[match.tipo] || 'filtro';
    const detalle = match.prefijo || match.numero || '';

    if (!isBotAdmin) {
      const admins = await getAdmins(conn, m.chat);
      await conn.sendMessage(m.chat, {
        text: `🚨 *ALERTA PARA ADMINISTRADORES*\n\n👤 *Usuario:* @${numero}\n🚫 *Motivo:* ${motivo} (*${detalle}*)\n\n❌ *No soy administrador/a, no puedo borrar ni expulsar.*\n📢 *Por favor expúlsenlo manualmente.*`,
        mentions: [mencion, ...admins]
      });
      return;
    }

    try { await conn.sendMessage(m.chat, { delete: m.key }); } catch {}

    let expulsado = false;
    const jidObjetivo = jidParaExpulsar(participante, m.sender);
    try {
      marcarMotivo(m.chat, [m.sender], { tipo: match.tipo, prefijo: match.prefijo });
      await conn.groupParticipantsUpdate(m.chat, [jidObjetivo], 'remove');
      expulsado = true;
    } catch {}

    if (expulsado) {
      registrarEliminado({
        chatId: m.chat,
        jid: jidObjetivo,
        lid: participante?.lid,
        numero: numero || senderNorm,
        nombre: m.pushName || '',
        motivo: `${motivo} (${detalle})`,
        origen: match.tipo,
        autor: 'bot',
        autorNombre: 'Filtro automático'
      });
    }

    await conn.sendMessage(m.chat, {
      text: `🚫 *ACCESO BLOQUEADO*\n\n👤 *Usuario:* @${numero}\n🚫 *Motivo:* ${motivo} (*${detalle}*)\n${expulsado ? '✅ *Expulsado y mensaje eliminado.*' : '⚠️ *No pude expulsarlo, avisen a un admin.*'}`,
      mentions: [mencion]
    });
  } catch {}
};

handler.before = async function (m, extra) {
  return await handler(m, extra);
};

export default handler;
