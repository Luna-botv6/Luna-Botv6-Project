import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { isLidJid, resolveJidToPhone } from '../lib/funcion/lid-resolver.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = './database/fantasmas_tracker.json';

const asegurarArchivo = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}', 'utf8');
};

const cargarDB = () => {
  try {
    asegurarArchivo();
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {};
  }
};

const guardarDB = (data) => {
  try {
    asegurarArchivo();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
};

const activos = new Map();

const cargarEnMemoria = () => {
  const data = cargarDB();
  for (const [groupId, usuarios] of Object.entries(data)) {
    activos.set(groupId, new Map(Object.entries(usuarios).map(([k, v]) => [k, v])));
  }
};

const persistir = () => {
  const data = {};
  for (const [groupId, usuarios] of activos.entries()) {
    data[groupId] = Object.fromEntries(usuarios);
  }
  guardarDB(data);
};

cargarEnMemoria();

function safeSetInterval(fn, delay) {
  const MAX = 2147483647;
  if (delay > MAX) {
    setTimeout(() => { fn(); safeSetInterval(fn, delay); }, MAX);
  } else {
    setInterval(fn, delay);
  }
}

safeSetInterval(() => {
  activos.clear();
  guardarDB({});
}, 30 * 24 * 60 * 60 * 1000);

setInterval(persistir, 5 * 60 * 1000);

const handler = async (m, { isOwner, conn, text, usedPrefix }) => {
  if (usedPrefix === 'a' || usedPrefix === 'A') return;
  if (!m.isGroup) return;

  const chatId = m.chat;
  const now = Date.now();
  const cooldownTime = 2 * 60 * 1000;

  const { participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin && !isOwner)
    return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.');

  if (!handler._cooldowns) handler._cooldowns = new Map();

  if (handler._cooldowns.has(chatId)) {
    const exp = handler._cooldowns.get(chatId) + cooldownTime;
    if (now < exp) {
      const left = Math.ceil((exp - now) / 1000);
      return m.reply(`⏰ Espera ${Math.floor(left / 60)}m ${left % 60}s`);
    }
  }

  handler._cooldowns.set(chatId, now);

  const limit = parseInt(text) || participants.length;
  const grupoActivos = activos.get(chatId) || new Map();

  const fantasmas = participants
    .slice(0, limit)
    .filter(u => {
      if (u.admin) return false;
      const numero = (u.id || '').split('@')[0];
      const data = grupoActivos.get(numero);
      return !data || !data.count || data.count === 0;
    })
    .map(u => {
      const numero = u.id.split('@')[0];
      const data = grupoActivos.get(numero);
      return {
        jid: u.id,
        numero,
        count: data?.count || 0
      };
    });

  if (fantasmas.length === 0)
    return conn.sendMessage(m.chat, { text: '✅ No hay fantasmas en el grupo.', mentions: [] }, { quoted: m });

  const groupName = await conn.getName(m.chat);

  const lista = fantasmas
    .map((f, i) => `> ${i + 1}. @${f.numero}  ➜  inactivo  ✦  ${f.count} msg`)
    .join('\n');

  const texto =
    `👻 *REPORTE DE FANTASMAS*\n` +
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
    `🏛️ *Grupo:* ${groupName}\n` +
    `👥 *Total revisados:* ${limit}\n` +
    `🕸️ *Fantasmas:* ${fantasmas.length}\n` +
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n\n` +
    `${lista}\n\n` +
    `_📢 Estos usuarios no han enviado mensajes._`;

  conn.sendMessage(m.chat, { text: texto, mentions: fantasmas.map(f => f.jid) }, { quoted: m });
};

handler.all = async function (m) {
  try {
    if (!m.isGroup || !m.sender) return;

    let numero;
    if (isLidJid(m.sender)) {
      const resolved = await resolveJidToPhone(m.sender, this, m.chat);
      if (!resolved) return;
      numero = resolved;
    } else {
      numero = m.sender.split('@')[0];
    }

    if (!activos.has(m.chat)) activos.set(m.chat, new Map());

    const grupoActivos = activos.get(m.chat);
    const prev = grupoActivos.get(numero);
    grupoActivos.set(numero, {
      count: (prev?.count || 0) + 1,
      last: Date.now()
    });
  } catch {}
};

handler.command = /^(verfantasmas|fantasmas|sider)$/i;
handler.tags = ['group'];
handler.group = true;
export default handler;