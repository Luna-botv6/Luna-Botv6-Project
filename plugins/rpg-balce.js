import fs from 'fs';
import { getUserStats } from '../lib/stats.js';
import { getGroupDataForPlugin, buscarNombreEnParticipantes, resolveRealJidDeLid } from '../lib/funcion/pluginHelper.js';

function nf(n) {
  return Number(n || 0).toLocaleString();
}

function render(tpl, valores) {
  let out = tpl;
  for (const [k, v] of Object.entries(valores)) out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  return out;
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

const handler = async (m, { conn, usedPrefix }) => {
  const who = m.isGroup ? (m.mentionedJid?.[0] || m.sender) : m.sender;

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let _t = {};
  try { _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8')); }
  catch { try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch {} }
  const t = _t.plugins?.rpg_balance || {};

  const stats = getUserStats(who);

  let participants = [];
  if (m.isGroup) {
    try {
      const gd = await getGroupDataForPlugin(conn, m.chat, m.sender);
      participants = gd.participants || [];
    } catch {}
  }
  const yo = await etiquetaDe(conn, who, participants);

  let texto;
  if (t.card_balance) {
    texto = render(t.card_balance, {
      nombre: yo.tag,
      money: nf(stats.money),
      exp: nf(stats.exp),
      nivel: nf(stats.level),
      mystic: nf(stats.mysticcoins),
      luna: nf(stats.lunaCoins),
      usedPrefix
    });
  } else {
    texto = `
${t.texto1[0]}
${t.texto1[1]} ${yo.tag}
${t.texto1[2]} ${nf(stats.money)}💎
${t.texto1[3]}
${t.texto1[4]}
${t.texto1[5]}
❏ *${usedPrefix}buy ${t.texto1[6]}
❏ *${usedPrefix}buyall*`;
  }

  const mentions = yo.mention ? [yo.mention] : [];
  return conn.sendMessage(m.chat, mentions.length ? { text: texto, mentions } : { text: texto }, { quoted: m });
};

handler.help = ['bal'];
handler.tags = ['xp'];
handler.command = ['bal', 'diamantes', 'diamond', 'balance'];

export default handler;
