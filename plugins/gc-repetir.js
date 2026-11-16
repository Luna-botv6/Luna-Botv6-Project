import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const _lang = new Map();

const DEFAULTS = {
  solo_grupos: '❌ Este comando solo funciona en grupos.',
  solo_admins: '⚠️ Solo los administradores pueden usar este comando.',
  uso: '🔁 *Repetir mensaje*\n\nRespondé a un mensaje con *{prefix}{cmd}* para repetirlo sin etiquetar a nadie.\n\n• *{prefix}{cmd} tu texto* → repite tu texto.\n• Si el mensaje tiene *@alguien*, se etiqueta solo a esa persona.\n• Funciona con texto, imagen, video, audio, sticker y documento.',
  sin_contenido: '❌ Respondé a un mensaje o escribí el texto que querés repetir.',
  viewonce: '⚠️ No puedo repetir contenido de una sola vez. Usá *{prefix}revelar* si necesitás verlo.',
  no_valido: '⚠️ Ese tipo de mensaje no lo puedo repetir.',
  error_descarga: '❌ No pude descargar el archivo de ese mensaje.',
  error: '❌ Error al repetir el mensaje.'
};

function getT(idioma) {
  const lang = idioma || global.defaultLenguaje || 'es';
  if (_lang.has(lang)) return _lang.get(lang);
  let t = {};
  try {
    t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'))?.plugins?.gc_repetir || {};
  } catch {
    try {
      t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'))?.plugins?.gc_repetir || {};
    } catch {}
  }
  const salida = { ...DEFAULTS, ...t };
  _lang.set(lang, salida);
  return salida;
}

function soloDigitos(valor) {
  return String(valor ?? '').split('@')[0].replace(/\D/g, '');
}

function esViewOnce(q, mtype) {
  if (!q) return false;
  if (q.msg?.viewOnce === true) return true;
  if (q.viewOnce === true) return true;
  return /viewOnce/i.test(String(mtype || ''));
}

function tipoDe(q, mtype) {
  if (mtype === 'imageMessage') return 'image';
  if (mtype === 'videoMessage') return 'video';
  if (mtype === 'ptvMessage') return 'ptv';
  if (mtype === 'audioMessage') return 'audio';
  if (mtype === 'stickerMessage') return 'sticker';
  if (mtype === 'documentMessage' || mtype === 'documentWithCaptionMessage') return 'document';
  const mime = String(q?.msg?.mimetype || q?.msg?.documentMessage?.mimetype || '');
  if (/^image\//i.test(mime)) return 'image';
  if (/^video\//i.test(mime)) return 'video';
  if (/^audio\//i.test(mime)) return 'audio';
  if (/webp/i.test(mime)) return 'sticker';
  return 'texto';
}

function textoDe(q) {
  return q?.text || q?.caption || q?.body || q?.msg?.caption || '';
}

function resolverMenciones(texto, participants, fuentes) {
  let salida = String(texto || '');
  const mentions = new Set();
  const agregar = (jid) => {
    if (!jid) return;
    if (String(jid).includes('@lid')) {
      const p = (participants || []).find(x => x.lid === jid || x.id === jid);
      const real = soloDigitos(p?.phoneNumber || p?.id);
      if (p?.id && !String(p.id).includes('@lid')) mentions.add(p.id);
      else if (real) mentions.add(`${real}@s.whatsapp.net`);
      return;
    }
    if (String(jid).includes('@')) mentions.add(jid);
  };
  for (const jid of fuentes || []) agregar(jid);
  const numeros = [...salida.matchAll(/@(\d{6,})/g)].map(x => x[1]);
  for (const num of numeros) {
    const p = (participants || []).find(x =>
      soloDigitos(x.id) === num ||
      soloDigitos(x.lid) === num ||
      soloDigitos(x.phoneNumber) === num
    );
    if (!p) continue;
    const real = soloDigitos(p.phoneNumber || p.id);
    if (real) {
      if (p.id && !String(p.id).includes('@lid')) mentions.add(p.id);
      else mentions.add(`${real}@s.whatsapp.net`);
    }
    if (real && real !== num) salida = salida.replace(new RegExp(`@${num}`, 'g'), `@${real}`);
  }
  return { texto: salida, mentions: [...mentions] };
}

async function descargar(conn, q, tipo) {
  if (typeof q?.download === 'function') return await q.download();
  if (q?.msg && typeof conn?.downloadM === 'function') return await conn.downloadM(q.msg, tipo);
  return null;
}

const handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const t = getT(idioma);

  try {
    if (!m.isGroup) return m.reply(t.solo_grupos);

    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    if (!groupData.isAdmin && !isOwner) return m.reply(t.solo_admins);

    const participantes = groupData.participants || [];
    const q = m.quoted;
    const mtype = q?.mtype || '';
    const textoPedido = String(text || '').trim();

    if (!q && !textoPedido) return m.reply(t.uso.replace(/{prefix}/g, usedPrefix).replace(/{cmd}/g, command));

    if (q && esViewOnce(q, mtype)) {
      return m.reply(t.viewonce.replace(/{prefix}/g, usedPrefix));
    }

    const tipo = q ? tipoDe(q, mtype) : 'texto';
    const fuentes = [
      ...(m.mentionedJid || []),
      ...(q?.msg?.contextInfo?.mentionedJid || []),
      ...(q?.mentionedJid || [])
    ];

    if (tipo === 'texto') {
      const base = textoPedido || textoDe(q);
      if (!base) return m.reply(t.sin_contenido);
      const { texto, mentions } = resolverMenciones(base, participantes, fuentes);
      const contenido = { text: texto };
      if (mentions.length) contenido.mentions = mentions;
      await conn.sendMessage(m.chat, contenido, { quoted: m });
      return;
    }

    if (!q) return m.reply(t.uso.replace(/{prefix}/g, usedPrefix).replace(/{cmd}/g, command));

    const buffer = await descargar(conn, q, tipo);
    if (!buffer || !buffer.length) return m.reply(t.error_descarga);

    const captionBase = textoPedido || textoDe(q);
    const { texto: caption, mentions } = resolverMenciones(captionBase, participantes, fuentes);
    const contenido = {};
    const msg = q.msg || {};

    if (tipo === 'image') {
      contenido.image = buffer;
      if (caption) contenido.caption = caption;
    } else if (tipo === 'video') {
      contenido.video = buffer;
      if (caption) contenido.caption = caption;
      if (msg.gifPlayback === true) contenido.gifPlayback = true;
    } else if (tipo === 'ptv') {
      contenido.video = buffer;
      contenido.ptv = true;
    } else if (tipo === 'audio') {
      contenido.audio = buffer;
      contenido.mimetype = msg.mimetype || 'audio/ogg; codecs=opus';
      if (msg.ptt === true) contenido.ptt = true;
      if (msg.seconds) contenido.seconds = msg.seconds;
    } else if (tipo === 'sticker') {
      contenido.sticker = buffer;
    } else if (tipo === 'document') {
      const doc = msg.documentMessage || msg;
      contenido.document = buffer;
      contenido.mimetype = doc.mimetype || 'application/octet-stream';
      contenido.fileName = String(doc.fileName || 'archivo').split('/').pop();
      if (caption) contenido.caption = caption;
    } else {
      return m.reply(t.no_valido);
    }

    if (mentions.length) contenido.mentions = mentions;
    await conn.sendMessage(m.chat, contenido, { quoted: m });

    if (tipo === 'ptv' && caption) {
      const extra = { text: caption };
      if (mentions.length) extra.mentions = mentions;
      await conn.sendMessage(m.chat, extra, { quoted: m });
    }
  } catch (e) {
    try { await m.reply(t.error); } catch {}
  }
};

handler.help = ['repetir (respondiendo a un mensaje)', 'r <texto>'];
handler.tags = ['group'];
handler.group = true;
handler.command = /^(repetir|repeat|r)$/i;

export default handler;
