import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const DB_PATH  = './database/cumples.json';
const GIF_URL  = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/InShot_20260315_144951431.mp4';

const MESES = {
  enero:1, ene:1, january:1, jan:1,
  febrero:2, feb:2, february:2,
  marzo:3, mar:3, maezo:3, marso:3, march:3,
  abril:4, abr:4, april:4,
  mayo:5, may:5,
  junio:6, jun:6, june:6,
  julio:7, jul:7, july:7,
  agosto:8, ago:8, august:8,
  septiembre:9, sep:9, sept:9, setiembre:9, september:9,
  octubre:10, oct:10, october:10,
  noviembre:11, nov:11, november:11,
  diciembre:12, dic:12, december:12,
};

const MESES_NOMBRE = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function loadDB() {
  try {
    if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true });
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}');
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch { return {}; }
}

function saveDB(data) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); } catch {}
}

function parseDate(text) {
  const norm = text.toLowerCase().replace(/[^a-záéíóúñ0-9\s]/g, '').trim();
  const match = norm.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)/);
  if (!match) return null;
  const dia = parseInt(match[1]);
  const mes = MESES[match[2]];
  if (!mes || dia < 1 || dia > 31) return null;
  return { dia, mes };
}

function resolveJid(target, participants) {
  if (!target.includes('@lid')) return target;
  const found = participants.find(p => p.lid === target || p.id === target);
  if (found) {
    if (found.id && !found.id.includes('@lid')) return found.id;
    if (found.lid === target && found.id) return found.id;
  }
  return target;
}

const HELP_CUMPLE = `🌙 *Luna-Botv6-Project*

🎂 *Comando: Cumpleaños*

*Agregar uno o varios:*
_.cumple @tag 11 de marzo_
_.cumple @tag1 5 de mayo @tag2 20 de junio_

*Ver lista del grupo:*
_.cumple lista_

*Backup:*
_.cumple backup_`;

const HELP_SET = `🌙 *Luna-Botv6-Project*

✏️ *Editar cumpleaños*

_Usá el comando así:_
_.setcumple @tag 25 de diciembre_

_O para borrar:_
_.delcumple @tag_`;

const handler = async (m, { conn, usedPrefix, command, args }) => {
  const jid      = m.chat;
  const sender   = m.sender;
  const isGroup  = m.isGroup;

  const ownerNums = (global.owner || []).map(o => String(Array.isArray(o) ? o[0] : o).replace(/\D/g, ''));
  const lidOwners = (global.lidOwners || []).map(o => String(o).replace(/\D/g, ''));
  const isOwner   = ownerNums.includes(sender.replace(/\D/g, '')) || lidOwners.includes(sender.replace(/\D/g, ''));
  let   isAdmin   = false;
  let   participants = [];

  if (isGroup) {
    try {
      const groupData = await getGroupDataForPlugin(conn, jid, sender);
      participants = groupData.participants || [];
      isAdmin = groupData.isAdmin;
    } catch {}
  }

  if (!isOwner && !isAdmin) return m.reply('🌙 *Luna-Botv6-Project*\n\n❌ Solo admins y el owner pueden usar este comando.');

  const db = loadDB();
  if (!db[jid]) db[jid] = {};

  const cmd = command.toLowerCase();

  if (cmd === 'setcumple' || cmd === 'editcumple') {
    if (!m.mentionedJid?.length) return m.reply(HELP_SET);
    const raw = args.join(' ');

    for (const target of m.mentionedJid) {
      const realJid = resolveJid(target, participants);
      const tagNum  = realJid.split('@')[0];
      const textAfter = raw.replace(new RegExp(`@${target.split('@')[0]}\\b`), '').trim();
      const fecha = parseDate(textAfter);

      if (!fecha) {
        await conn.sendMessage(jid, {
          text: `🌙 *Luna-Botv6-Project*\n\n❓ No entendí la fecha para @${tagNum}\n\n_Ejemplo: .setcumple @tag 25 de diciembre_`,
          mentions: [realJid]
        }, { quoted: m });
        continue;
      }

      db[jid][realJid] = { dia: fecha.dia, mes: fecha.mes, editadoPor: sender, editadoEn: Date.now() };
      saveDB(db);
      await conn.sendMessage(jid, {
        text: `🌙 *Luna-Botv6-Project*\n\n✅ Cumpleaños de @${tagNum} actualizado\n📅 ${fecha.dia} de ${MESES_NOMBRE[fecha.mes]}`,
        mentions: [realJid]
      }, { quoted: m });
    }
    return;
  }

  if (cmd === 'delcumple') {
    if (!m.mentionedJid?.length) return m.reply('🌙 *Luna-Botv6-Project*\n\n_Usá: .delcumple @tag_');
    for (const target of m.mentionedJid) {
      const realJid = resolveJid(target, participants);
      const tagNum  = realJid.split('@')[0];
      if (db[jid][realJid]) {
        delete db[jid][realJid];
        saveDB(db);
        await conn.sendMessage(jid, {
          text: `🌙 *Luna-Botv6-Project*\n\n🗑️ Cumpleaños de @${tagNum} eliminado`,
          mentions: [realJid]
        }, { quoted: m });
      } else {
        await conn.sendMessage(jid, {
          text: `🌙 *Luna-Botv6-Project*\n\n❓ @${tagNum} no tiene cumpleaños registrado`,
          mentions: [realJid]
        }, { quoted: m });
      }
    }
    return;
  }

  if (args[0]?.toLowerCase() === 'lista') {
    const entradas = Object.entries(db[jid] || {});
    if (!entradas.length) return m.reply('🌙 *Luna-Botv6-Project*\n\n📋 No hay cumpleaños registrados en este grupo.');

    const mentions = entradas.map(([j]) => j);
    let txt = '🌙 *Luna-Botv6-Project*\n\n🎂 *Cumpleaños del grupo*\n\n';
    for (const [ujid, data] of entradas.sort((a, b) => a[1].mes - b[1].mes || a[1].dia - b[1].dia)) {
      txt += `🎈 @${ujid.split('@')[0]} — ${data.dia} de ${MESES_NOMBRE[data.mes]}\n`;
    }
    return conn.sendMessage(jid, { text: txt, mentions }, { quoted: m });
  }

  if (args[0]?.toLowerCase() === 'backup') {
    const backupPath = `./database/cumples_backup_${Date.now()}.json`;
    fs.copyFileSync(DB_PATH, backupPath);
    return m.reply(`🌙 *Luna-Botv6-Project*\n\n💾 Backup creado: _${backupPath}_`);
  }

  if (!m.mentionedJid?.length) return m.reply(HELP_CUMPLE);

  const raw = args.join(' ');
  const registrados = [];
  const errores = [];

  for (const target of m.mentionedJid) {
    const realJid  = resolveJid(target, participants);
    const tagNum   = realJid.split('@')[0];
    const tagClean = `@${target.split('@')[0]}`;
    const idx      = raw.indexOf(tagClean);
    if (idx === -1) continue;

    const afterTag = raw.slice(idx + tagClean.length).trim();
    const nextAt   = afterTag.indexOf('@');
    const fechaTxt = nextAt === -1 ? afterTag : afterTag.slice(0, nextAt).trim();
    const fecha    = parseDate(fechaTxt);

    if (!fecha) {
      errores.push(tagNum);
      continue;
    }

    db[jid][realJid] = { dia: fecha.dia, mes: fecha.mes, agregadoPor: sender, agregadoEn: Date.now() };
    registrados.push({ jid: realJid, tagNum, dia: fecha.dia, mes: fecha.mes });
  }

  if (registrados.length > 0) {
    saveDB(db);
    const mentions = registrados.map(r => r.jid);
    let txt = '🌙 *Luna-Botv6-Project*\n\n🎂 *Cumpleaños registrados!*\n\n';
    for (const r of registrados) {
      txt += `👤 @${r.tagNum} — 📅 ${r.dia} de ${MESES_NOMBRE[r.mes]}\n`;
    }
    await conn.sendMessage(jid, { text: txt, mentions }, { quoted: m });
  }

  for (const tagNum of errores) {
    await conn.sendMessage(jid, {
      text: `🌙 *Luna-Botv6-Project*\n\n❓ No entendí la fecha para @${tagNum}\n_Ejemplo: .cumple @tag 11 de marzo_`,
      mentions: []
    }, { quoted: m });
  }
};

handler.help    = ['cumple', 'setcumple', 'delcumple'];
handler.tags    = ['grupos'];
handler.command = /^(cumple(años?)?|setcumple|editcumple|delcumple)$/i;
export default handler;

const CHECKER_STATE_PATH = './database/cumple_checker.json';

function loadCheckerState() {
  try {
    if (fs.existsSync(CHECKER_STATE_PATH))
      return JSON.parse(fs.readFileSync(CHECKER_STATE_PATH, 'utf8'));
  } catch {}
  return { lastChecked: null };
}

function saveCheckerState(state) {
  try { fs.writeFileSync(CHECKER_STATE_PATH, JSON.stringify(state)); } catch {}
}

let _checkerStarted = false;

export function startBirthdayChecker(conn) {
  if (_checkerStarted) return;
  _checkerStarted = true;

  setInterval(async () => {
    const nowUTC = new Date();
    const nowAR  = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000);
    const today  = `${nowAR.getDate()}-${nowAR.getMonth() + 1}`;
    const h      = nowAR.getHours();

    if (h < 8) return;

    const state = loadCheckerState();
    if (state.lastChecked === today) return;

    state.lastChecked = today;
    saveCheckerState(state);
    const db = loadDB();

    for (const [groupJid, members] of Object.entries(db)) {
      const cumples = Object.entries(members).filter(([, d]) => d.dia === nowAR.getDate() && d.mes === nowAR.getMonth() + 1);
      if (!cumples.length) continue;

      try {
        let meta;
        try { meta = await conn.groupMetadata(groupJid); } catch { continue; }
        const allParticipants = meta.participants.map(p => p.id);
        const birthdayJids    = cumples.map(([j]) => j);

        const cantCumple = birthdayJids.length;
        const hidetag = '\u200e'.repeat(850) + allParticipants.map(p => ` @${p.split('@')[0]}`).join('');

        const nombresCumple = birthdayJids.map(j => `@${j.split('@')[0]}`).join(', ')

const msg =
'🎂 *FELIZ CUMPLEAÑOS* 🎂\n' +
`🎉 Hoy celebramos el cumpleaños de ${nombresCumple}! 🎂\n\n` +
'🥳 Que tengas un día increíble lleno de alegría,\n' +
'   amor y muchas sorpresas. Lo merecés todo! 💜\n\n' +
'🎈🎁🎊🌟✨🎆🎇🪅🎠\n' +
hidetag;

        const gifBuffer = await fetch(GIF_URL).then(r => r.arrayBuffer()).then(b => Buffer.from(b));

        await conn.sendMessage(groupJid, {
          video:       gifBuffer,
          caption:     msg,
          mentions:    [...allParticipants, ...birthdayJids],
          gifPlayback: true
        });

      } catch (e) {
        console.error('cumple-checker error:', e.message);
      }
    }
  }, 60 * 1000);
}