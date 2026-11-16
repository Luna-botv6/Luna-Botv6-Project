import fs from 'fs';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';
import { addWarning, resetWarnings } from '../lib/advertencias.js';
import { marcarMotivo } from '../lib/funcion/leave-reason.js';
import { esInmune, avisoInmunidad } from '../lib/funcion/proteccion-grupo.js';
import { buscarParticipante } from '../lib/funcion/participantes.js';

function getT(idioma) {
  try {
    return JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma || global.defaultLenguaje || 'es'}.json`)).plugins.gc_warn || {};
  } catch {
    return {};
  }
}

const handler = async (m, { conn, text, isOwner, usedPrefix, command }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const t = getT(idioma);

  if (!m.isGroup) return m.reply(t.solo_grupos);

  const { participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin && !isOwner) return m.reply(t.solo_admins);
  if (!isBotAdmin) return m.reply(t.bot_no_admin);

  let target = m.mentionedJid?.[0] || m.quoted?.sender;
  if (!target) return m.reply(t.uso.replace('{prefix}', usedPrefix).replace('{cmd}', command));
  if (target === conn.user.jid) return m.reply(t.no_auto);

  const resolveLid = (jid) => buscarParticipante(participants, jid, conn)?.id || null;

  target = resolveLid(target) || target;

  let finalCheck = buscarParticipante(participants, target, conn);
  if (!finalCheck) {
    try {
      clearGroupCache(m.chat, conn);
      const fresco = await getGroupDataForPlugin(conn, m.chat, m.sender);
      finalCheck = buscarParticipante(fresco.participants || [], target, conn);
    } catch {}
  }
  if (!finalCheck) return m.reply(t.no_en_grupo);

  if (finalCheck.admin === 'admin' || finalCheck.admin === 'superadmin') {
    return m.reply(t.no_admin || '⚠️ No puedo advertir a un administrador del grupo.');
  }

  if (esInmune(m.chat, finalCheck, conn, participants)) {
    const aviso = avisoInmunidad({
      chat: m.chat,
      jid: finalCheck,
      conn,
      participants,
      accion: 'warn',
      prefix: usedPrefix
    });
    if (aviso) return conn.sendMessage(m.chat, { text: aviso.texto, mentions: aviso.mentions }, { quoted: m });
    return m.reply(t.inmune || '⚠️ Ese usuario tiene inmunidad en este grupo.');
  }

  target = finalCheck.id;
  const reason = text?.replace(/@\d+/g, '').trim() || t.sin_motivo;
  const resolvedSender = (() => {
    const byLid = resolveLid(m.sender);
    if (byLid) return byLid;
    const p = participants.find(x => x.id === m.sender);
    return p?.id || m.sender;
  })();
  const senderTag = resolvedSender.split('@')[0];
  const warns = await addWarning(target, reason, senderTag, resolvedSender);
  const tag = target.split('@')[0];

  const now = new Date();
  const fecha = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

  await m.reply(
    t.advertido
      .replace('{tag}', tag)
      .replace('{sancionadoPor}', senderTag)
      .replace('{fecha}', fecha)
      .replace('{motivo}', reason)
      .replace('{warns}', warns),
    null, { mentions: [target, resolvedSender] }
  );

  if (warns >= 3) {
    await resetWarnings(target);
    marcarMotivo(m.chat, [target], { tipo: 'warn', motivo: reason, autor: resolvedSender });
    await conn.groupParticipantsUpdate(m.chat, [target], 'remove');
    clearGroupCache(m.chat, conn);
  }
};

handler.command = /^(warn|advertir|advertencia|warning|sancion|sanción)$/i;
handler.group = true;
handler.ownerProtect = true;
export default handler;
