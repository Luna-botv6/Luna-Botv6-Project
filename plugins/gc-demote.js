import fs from 'fs';
import { getGroupDataForPlugin, clearGroupCache, resolveRealJidDeLid } from '../lib/funcion/pluginHelper.js';
import { buscarParticipante } from '../lib/funcion/participantes.js';

const handler = async (m, { conn, usedPrefix, isOwner, args, command }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const tradutor = _translate.plugins.gc_demote;
  const t_handler = _translate.handler.dfail;

  if (!m.isGroup) return m.reply(t_handler.texto5);

  const { groupMetadata, participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin && !isOwner) {
    return m.reply(t_handler.texto7);
  }

  if (!isBotAdmin) {
    return m.reply(t_handler.texto8);
  }

  const botJid = conn.decodeJid(conn.user.id);

  const resolverEnGrupo = (raw, lista) => {
    if (!raw) return null;
    const directo = buscarParticipante(lista, raw, conn);
    if (directo) return directo;
    try {
      const real = resolveRealJidDeLid(raw);
      if (real && real !== raw) return buscarParticipante(lista, real, conn);
    } catch {}
    return null;
  };

  const candidatos = [];
  if (m.mentionedJid?.length) {
    candidatos.push(...m.mentionedJid.filter(jid => conn.decodeJid(jid) !== botJid));
  }
  if (m.quoted) {
    candidatos.push(m.quoted.sender, m.quoted.participant, m.msg?.contextInfo?.participant);
  }
  if (!candidatos.filter(Boolean).length && m.text) {
    const cleanText = m.text.replace(/[^0-9]/g, '');
    if (cleanText.length >= 11 && cleanText.length <= 15) candidatos.push(cleanText + '@s.whatsapp.net');
  }

  let objetivo = null;
  for (const candidato of candidatos.filter(Boolean)) {
    objetivo = resolverEnGrupo(candidato, participants);
    if (objetivo) break;
  }

  if (!objetivo && candidatos.filter(Boolean).length) {
    clearGroupCache(m.chat, conn);
    const fresco = await getGroupDataForPlugin(conn, m.chat, m.sender);
    for (const candidato of candidatos.filter(Boolean)) {
      objetivo = resolverEnGrupo(candidato, fresco.participants || []);
      if (objetivo) break;
    }
  }

  if (!objetivo) {
    if (!candidatos.filter(Boolean).length) {
      const msg = `${tradutor.texto1[0]}\n\n*┯┷*\n*┃ ≽ ${usedPrefix}${command} @tag*\n*┃ ≽ ${usedPrefix}${command} ${tradutor.texto1[1]}\n*┷┯*`;
      return m.reply(msg, m.chat, { mentions: conn.parseMention(msg) });
    }
    return m.reply(tradutor.texto4);
  }

  const user = objetivo.id || objetivo.phoneNumber || objetivo.lid;
  if (!user) return m.reply(tradutor.texto4);
  if (conn.decodeJid(user) === botJid) return m.reply(tradutor.texto2);
  if (!objetivo.admin) return m.reply(tradutor.texto5);

  try {
    await conn.groupParticipantsUpdate(m.chat, [user], 'demote');
    clearGroupCache(m.chat, conn);
    const tag = String(objetivo.phoneNumber || user).split('@')[0];
    await m.reply(`${tradutor.texto3} @${tag}`, null, { mentions: [user] });
  } catch (e) {
    console.error(e);
    await m.reply(tradutor.texto6);
  }
};

handler.help = ['demote <@user>', 'quitarpoder <@user>', 'quitaradmin <@user>'];
handler.tags = ['group'];
handler.command = /^(demote|quitarpoder|quitaradmin)$/i;
handler.group = true;

export default handler;
