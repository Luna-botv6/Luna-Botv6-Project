import fs from 'fs';
import { getConfig, getConfigChatIds } from '../funcConfig.js';
import { getGroupDataForPlugin, buscarNombreEnParticipantes } from './pluginHelper.js';
import { marcarMotivo } from './leave-reason.js';
import { getOwnerNumbers } from './system-owners.js';
import { resolveJidToPhone } from './lid-resolver.js';

const ETIQUETAS = ['@luna'];
const COOLDOWN_MS = 15 * 1000;
const _translateCache = new Map();
const _reciente = new Map();

function textoDe(m) {
  const msg = m.message || {};
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.buttonsResponseMessage?.selectedButtonId ||
    msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
}

function getTranslate(idioma) {
  const lang = idioma || global.defaultLenguaje || 'es';
  if (_translateCache.has(lang)) return _translateCache.get(lang);
  let t = {};
  try {
    t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'));
  } catch {
    try {
      t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'));
    } catch {}
  }
  _translateCache.set(lang, t);
  return t;
}

function digitos(jid) {
  return String(jid || '').split('@')[0].replace(/\D/g, '');
}

function esParticipante(jid, participants) {
  const objetivo = digitos(jid);
  if (!objetivo) return false;
  return participants.some((p) => {
    const pid = digitos(p.id || '');
    const plid = digitos(p.lid || '');
    return (pid && pid === objetivo) || (plid && plid === objetivo);
  });
}

function tieneEtiqueta(texto) {
  if (!texto) return false;
  const t = String(texto);
  return ETIQUETAS.some((e) => {
    const token = String(e).replace(/@/g, '').trim();
    if (!token) return false;
    const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`@\\s*${esc}`, 'i').test(t);
  });
}

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function procesarEnGrupo(conn, chatId, autor, autorPhone, texto) {
  try {
    const clave = `${chatId}_${autorPhone}`;
    const previo = _reciente.get(clave);
    if (previo && Date.now() - previo < COOLDOWN_MS) return;
    _reciente.set(clave, Date.now());
    if (_reciente.size > 300) _reciente.delete(_reciente.keys().next().value);

    const g = await getGroupDataForPlugin(conn, chatId, autor);
    if (!g?.participants?.length) return;
    if (g.isAdmin) return;
    if (!esParticipante(autor, g.participants)) return;
    if (!esParticipante(conn.user?.jid, g.participants)) return;

    const idioma = global?.db?.data?.chats?.[chatId]?.language || global.defaultLenguaje || 'es';
    const t = getTranslate(idioma)?.functions?.antitag || {};
    const nombre = buscarNombreEnParticipantes(g.participants, autor) || autorPhone.slice(-4);
    const adminJids = g.participants
      .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
      .map((p) => p.id || p.lid)
      .filter(Boolean);

    if (g.isBotAdmin) {
      const aviso = (t.tag_detectado || '⚠️ *ETIQUETA NO PERMITIDA*\n\n@{user} mencionó al grupo en su estado.\n\n*¡Adiós!*')
        .replace('@{user}', '@' + autorPhone);
      try {
        await conn.sendMessage(chatId, { text: aviso, mentions: [autor] });
      } catch {}
      await esperar(500);
      marcarMotivo(chatId, [autor], { tipo: 'tag', autor, autorNombre: nombre });
      await conn.groupParticipantsUpdate(chatId, [autor], 'remove');
    } else {
      const alerta = (t.tag_sin_bot_admin || '⚠️ *ETIQUETA NO PERMITIDA*\n\n@{user} mencionó al grupo en su estado.\n❌ No soy administrador/a, no pude expulsarlo.')
        .replace('@{user}', '@' + autorPhone);
      await conn.sendMessage(chatId, { text: alerta, mentions: [...new Set([autor, ...adminJids])] });
    }
  } catch {
    _reciente.delete(`${chatId}_${autorPhone}`);
  }
}

async function procesarAntitag(conn, autor, autorLid, texto) {
  if (!tieneEtiqueta(texto)) return;

  const grupos = getConfigChatIds().filter((id) => {
    if (!/@g\.us$/.test(id)) return false;
    try {
      return !!getConfig(id).antitag;
    } catch {
      return false;
    }
  });
  if (!grupos.length) return;

  const ownerNums = getOwnerNumbers() || [];
  const autorPhone = resolveJidToPhone(autor, conn) || resolveJidToPhone(autorLid, conn) || digitos(autor);
  if (ownerNums.includes(autorPhone)) return;

  for (const chatId of grupos) {
    await procesarEnGrupo(conn, chatId, autor, autorPhone, texto);
  }
}

export function manejarStatusSniffer(conn) {
  conn.ev.on('messages.upsert', async ({ messages }) => {
    try {
      for (const m of messages || []) {
        const key = m.key;
        if (key?.remoteJid !== 'status@broadcast') continue;
        if (key.fromMe) continue;
        const autor = key.remoteJidAlt || key.participant || '';
        if (!autor) continue;
        await procesarAntitag(conn, autor, key.participant || '', textoDe(m));
      }
    } catch {}
  });
}