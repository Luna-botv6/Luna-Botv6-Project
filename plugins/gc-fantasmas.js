import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
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
  } catch (e) {
    return {};
  }
};

const guardarDB = (data) => {
  try {
    asegurarArchivo();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
};

const activos = new Map();

const cargarEnMemoria = () => {
  const data = cargarDB();
  for (const [groupId, usuarios] of Object.entries(data)) {
    activos.set(groupId, new Map(Object.entries(usuarios)));
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

setInterval(() => {
  activos.clear();
  guardarDB({});
}, 30 * 24 * 60 * 60 * 1000);

setInterval(persistir, 5 * 60 * 1000);

const tiempoInactivo = (ms) => {
  const minutos = Math.floor(ms / 60000);
  const horas = Math.floor(ms / 3600000);
  const dias = Math.floor(ms / 86400000);
  const meses = Math.floor(ms / 2592000000);
  if (meses >= 1) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  if (dias >= 1) return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  if (horas >= 1) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  if (minutos >= 1) return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  return 'hace un momento';
};

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
    .filter(u => !u.admin && !grupoActivos.has(u.id.split('@')[0]))
    .map(u => ({
      jid: u.id,
      numero: u.id.split('@')[0],
      ultimaVez: grupoActivos.get(u.id.split('@')[0]) || null
    }));

  if (fantasmas.length === 0)
    return conn.sendMessage(m.chat, { text: '✅ No hay fantasmas en el grupo.', mentions: [] }, { quoted: m });

  const lista = fantasmas.map(f => {
    const tiempo = f.ultimaVez ? `hace ${tiempoInactivo(now - f.ultimaVez)}` : 'sin actividad registrada';
    return `  👉🏻 @${f.numero} (${tiempo})`;
  }).join('\n');

  const texto = `👻 *Fantasmas en ${await conn.getName(m.chat)}*\n📊 Revisados: ${limit}\n\n${lista}`;

  conn.sendMessage(m.chat, { text: texto, mentions: fantasmas.map(f => f.jid) }, { quoted: m });
};

handler.all = async function (m) {
  try {
    if (!m.isGroup || !m.sender) return;
    const numero = m.sender.split('@')[0];
    if (!activos.has(m.chat)) activos.set(m.chat, new Map());
    activos.get(m.chat).set(numero, Date.now());
  } catch (e) {}
};

handler.command = /^(verfantasmas|fantasmas|sider)$/i;
handler.tags = ['group'];
handler.group = true;
export default handler;
