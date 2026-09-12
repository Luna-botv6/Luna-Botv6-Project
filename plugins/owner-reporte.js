import { getLidMapping } from '../lib/stats.js';

const OWNER_JID = '5493483466763@s.whatsapp.net';

function resolveJidLocal(senderId, participants) {
  if (!senderId.includes('@lid')) return senderId;
  const match = participants.find(p => p.lid && p.lid.replace(/:[0-9]+@lid/, '@lid') === senderId);
  return match?.id ? match.id : senderId;
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_reporte || {};

  if (!text) throw (
    (t.ayuda ? t.ayuda
      .split('{comando}').join(usedPrefix + command)
      .split('{prefix}').join(usedPrefix) : null) ||
    '╭─「 *📋 REPORTE AL OWNER* 」\n' +
    '│\n' +
    '│ Enviá tu reporte así:\n' +
    `│ *${usedPrefix + command}* _descripción del problema_\n` +
    '│\n' +
    '│ 📌 Si es un bug de un comando incluí el prefijo:\n' +
    `│ *${usedPrefix + command}* El comando *${usedPrefix}play* no funciona\n` +
    '╰─'
  );

  if (text.length < 10) throw (t.muy_corto || '⚠️ El reporte es muy corto. Describí el problema con más detalle.');
  if (text.length > 1000) throw (t.muy_largo || '⚠️ El reporte supera los 1000 caracteres. Resumí un poco.');

  let realJid = m.sender;

  if (m.sender.includes('@lid')) {
    if (m.isGroup) {
      try {
        const meta = await conn.groupMetadata(m.chat);
        const resolved = resolveJidLocal(m.sender, meta?.participants || []);
        if (resolved && !resolved.includes('@lid')) realJid = resolved;
      } catch {}
    }

    if (realJid.includes('@lid')) {
      const mapped = getLidMapping(m.sender);
      if (mapped) realJid = mapped;
    }
  }

  const numero = realJid.split('@')[0];

  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora  = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  let grupoNombre = (t.chat_privado || 'Chat privado');
  if (m.isGroup) {
    try {
      const meta = await conn.groupMetadata(m.chat);
      grupoNombre = meta?.subject || m.chat;
    } catch {}
  }

  const cmdMatch = text.match(/[!./,;]([a-zA-Z0-9]+)/);
  const comandoDetectado = cmdMatch ? cmdMatch[0] : null;

  let teks =
    (t.titulo_reporte || '╭─「 *🚨 NUEVO REPORTE* 」') + '\n' +
    '│\n' +
    (t.linea_usuario?.replace('{numero}', numero) || `├ 👤 *Usuario:* @${numero}`) + '\n' +
    (t.linea_numero?.replace('{numero}', numero) || `├ 📱 *Número:* wa.me/${numero}`) + '\n' +
    (t.linea_origen?.replace('{origen}', grupoNombre) || `├ 📍 *Origen:* ${grupoNombre}`) + '\n' +
    (t.linea_fecha?.replace('{fecha}', fecha).replace('{hora}', hora) || `├ 📅 *Fecha:* ${fecha} — ${hora}`) + '\n';

  if (comandoDetectado) {
    teks += (t.linea_comando?.replace('{comando}', comandoDetectado) || `├ 🔧 *Comando reportado:* ${comandoDetectado}`) + '\n';
  }

  teks +=
    '│\n' +
    (t.linea_descripcion || '├ 📝 *Descripción:*') + '\n' +
    `│ ${text}\n`;

  if (m.quoted?.text) {
    teks +=
      '│\n' +
      (t.linea_mensaje_citado || '├ 💬 *Mensaje citado:*') + '\n' +
      `│ ${m.quoted.text}\n`;
  }

  teks += '╰─';

  await conn.reply(OWNER_JID, teks, null, {
    contextInfo: { mentionedJid: [realJid] }
  });

  m.reply((t.enviado || '✅ Tu reporte fue enviado correctamente.\n\nGracias por reportar, lo revisaremos a la brevedad 🙏'));
};

handler.help = ['reporte <mensaje>', 'report <mensaje>'];
handler.tags = ['info'];
handler.command = /^(report|request|reporte|bugs|bug|report-owner|reportes)$/i;

export default handler;