import fs from 'fs';
import { getUserStats, setUserStats } from '../lib/stats.js';
import { getGroupDataForPlugin, buscarNombreEnParticipantes, resolveRealJidDeLid } from '../lib/funcion/pluginHelper.js';

const items = ['exp', 'money'];
const confirmation = {};

function cargarIdioma(m) {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  try {
    return JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'));
  } catch {
    try { return JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch { return {}; }
  }
}

function nf(n) {
  return Number(n || 0).toLocaleString();
}

function fechaActual() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function render(tpl, fallback, valores) {
  let out = tpl || fallback;
  for (const [k, v] of Object.entries(valores)) out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  return out;
}

async function participantesDe(conn, m) {
  if (!m.isGroup) return [];
  try {
    const gd = await getGroupDataForPlugin(conn, m.chat, m.sender);
    return gd.participants || [];
  } catch {
    return [];
  }
}

async function nombreDe(conn, jid, participants) {
  const delGrupo = buscarNombreEnParticipantes(participants, jid);
  if (delGrupo) return delGrupo;
  const real = resolveRealJidDeLid(jid);
  if (!String(real).includes('@lid')) {
    for (const getter of ['getName', 'getDisplayName']) {
      if (typeof conn[getter] !== 'function') continue;
      try {
        const nombre = await conn[getter](real);
        if (nombre && !/^[\d\s@.:+-]+$/.test(String(nombre))) return String(nombre).slice(0, 40);
      } catch {}
    }
  }
  return '';
}

async function etiquetaDe(conn, jid, participants) {
  const nombre = await nombreDe(conn, jid, participants);
  const real = resolveRealJidDeLid(jid);
  if (!String(real).includes('@lid')) {
    return { tag: `@${real.split('@')[0]}`, mention: real };
  }
  return { tag: nombre ? `*${nombre}*` : 'desconocido', mention: null };
}

async function handler(m, { conn, args, usedPrefix }) {
  const _t = cargarIdioma(m);
  const tradutor = _t.plugins?.rpg_transferir || {};

  if (confirmation[m.sender]) {
    return conn.sendMessage(m.chat, { text: `⏳ ${tradutor.texto1 || '*Tienes una transferencia pendiente.* Responde *Si* o *No* para continuar.'}` }, { quoted: m });
  }

  const user = getUserStats(m.sender);
  const type = (args[0] || '').toLowerCase();
  const countArg = args[1];
  const whoMention = m.mentionedJid && m.mentionedJid[0];

  const moneda = type === 'money' ? (tradutor.texto3 || 'diamantes') : 'EXP';
  const emoji = type === 'money' ? '💎' : '⭐';

  const ayuda = render(tradutor.card_ayuda, '💸  *T R A N S F E R I R*  💸\n━━━━━━━━━━━━━━━━━━\n\n📋 Enviá recursos a otro usuario.\n\n⭐ EXP   ➜  {usedPrefix}transferir exp 100 @usuario\n💎 Diam  ➜  {usedPrefix}transferir money 50 @usuario\n\n⚠️ Tenés que mencionar al destinatario.', { usedPrefix });

  if (!items.includes(type) || !countArg || !whoMention) {
    return conn.sendMessage(m.chat, { text: ayuda }, { quoted: m });
  }

  const count = Math.max(1, parseInt(countArg) || 1);

  if (user[type] < count) {
    return conn.sendMessage(m.chat, { text: `❌ ${tradutor.texto4 || 'No tienes suficientes'} *${emoji} ${moneda}* ${tradutor.texto5 || 'para transferir'}.` }, { quoted: m });
  }

  const participants = await participantesDe(conn, m);
  const from = await etiquetaDe(conn, m.sender, participants);
  const to = await etiquetaDe(conn, whoMention, participants);

  const confirmMessage = render(tradutor.card_confirmar, '💸  *C O N F I R M A R*  💸\n━━━━━━━━━━━━━━━━━━\n\n   {fromTag}  ➜  {toTag}\n\n   {emoji} *{cantidad}* {moneda}\n\n   💰 {fromTag}: *{saldoFrom}*\n   💰 {toTag}: *{saldoTo}*\n\n──────────────────\nRespondé *{confirmar}* para confirmar\no *{cancelar}* para cancelar', {
    fromTag: from.tag,
    toTag: to.tag,
    emoji,
    cantidad: nf(count),
    moneda,
    saldoFrom: nf(user[type]),
    saldoTo: nf(getUserStats(whoMention)[type] || 0),
    confirmar: tradutor.confirmar || 'Si',
    cancelar: tradutor.cancelar || 'No'
  });

  const mentions = [from.mention, to.mention].filter(Boolean);
  await conn.sendMessage(m.chat, mentions.length ? { text: confirmMessage, mentions } : { text: confirmMessage }, { quoted: m });

  confirmation[m.sender] = {
    sender: m.sender,
    to: whoMention,
    type,
    count,
    fromTag: from.tag,
    toTag: to.tag,
    mentionFrom: from.mention,
    mentionTo: to.mention,
    message: m,
    timeout: setTimeout(() => {
      conn.sendMessage(m.chat, { text: `⌛️ *${tradutor.texto7 || 'Tiempo agotado, transferencia cancelada.'}*` }, { quoted: m });
      delete confirmation[m.sender];
    }, 60 * 1000)
  };
}

handler.before = async (m, { conn }) => {
  if (!confirmation[m.sender]) return;
  if (!m.text) return;

  const _t = cargarIdioma(m);
  const tradutor = _t.plugins?.rpg_transferir || {};

  const { sender, to, type, count, timeout, message, fromTag, toTag, mentionFrom, mentionTo } = confirmation[m.sender];

  if (m.id === message.id) return;

  if (new RegExp(`^${tradutor.cancelar || 'No'}$`, 'i').test(m.text)) {
    clearTimeout(timeout);
    delete confirmation[sender];
    return conn.sendMessage(m.chat, { text: `❌ *${tradutor.texto8 || 'Transferencia cancelada.'}*` }, { quoted: m });
  }

  if (new RegExp(`^${tradutor.confirmar || 'Si'}$`, 'i').test(m.text)) {
    const senderStats = getUserStats(sender);
    const receiverStats = getUserStats(to);
    const moneda = type === 'money' ? (tradutor.texto3 || 'diamantes') : 'EXP';
    const emoji = type === 'money' ? '💎' : '⭐';

    if (senderStats[type] < count) {
      clearTimeout(timeout);
      delete confirmation[sender];
      return conn.sendMessage(m.chat, { text: `❌ ${tradutor.texto9 || 'Ya no tienes suficientes'} *${emoji} ${moneda}* ${tradutor.texto5 || 'para transferir'}.` }, { quoted: m });
    }

    senderStats[type] -= count;
    receiverStats[type] += count;

    setUserStats(sender, senderStats);
    setUserStats(to, receiverStats);

    clearTimeout(timeout);
    delete confirmation[sender];

    const exito = render(tradutor.card_exito, '✅  *T R A N S F E R I D O*\n━━━━━━━━━━━━━━━━━━\n\n   {fromTag}  ➜  {toTag}\n\n   {emoji} *{cantidad}* {moneda}\n   🕒 {fecha}\n\n   💰 {fromTag}: *{saldoFrom}*\n   💰 {toTag}: *{saldoTo}*', {
      fromTag: fromTag || 'yo',
      toTag: toTag || 'destino',
      emoji,
      cantidad: nf(count),
      moneda,
      fecha: fechaActual(),
      saldoFrom: nf(senderStats[type]),
      saldoTo: nf(receiverStats[type])
    });

    const mentions = [mentionFrom, mentionTo].filter(Boolean);
    return conn.sendMessage(m.chat, mentions.length ? { text: exito, mentions } : { text: exito }, { quoted: m });
  }
};

handler.help = ['transferir <exp|money> <cantidad> @usuario'];
handler.tags = ['economia', 'xp'];
handler.command = ['transferir', 'dar', 'darxp', 'dardiamantes'];

export default handler;
