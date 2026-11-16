import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js';
import { isOwnerJid, isSubOwnerJid } from '../lib/funcion/system-owners.js';
import {
  agregarInmune,
  quitarInmune,
  listarInmunes,
  esInmune,
  soloDigitos
} from '../lib/funcion/proteccion-grupo.js';

const _lang = new Map();

const DEFAULTS = {
  solo_grupos: '❌ Este comando solo funciona en grupos.',
  solo_admins: '⚠️ Solo los administradores pueden dar o quitar inmunidad.',
  uso: '🛡️ *Inmunidad*\n\n• *{prefix}{cmd} @usuario* → lo protege de mute, advertencias, expulsiones y borrado de mensajes.\n• *{prefix}{cmd} quitar @usuario* → le quita la inmunidad.\n• *{prefix}{cmd} lista* → muestra quiénes tienen inmunidad.',
  lista_titulo: '🛡️ *USUARIOS CON INMUNIDAD*',
  lista_vacia: '🛡️ *INMUNIDAD*\n\nNo hay usuarios con inmunidad en este grupo.',
  agregado: '🛡️ *INMUNIDAD OTORGADA*\n\n👤 *Usuario:* @{tag}\n👮 *Por:* @{por}\n\n_Ya no se le puede dar mute, advertir, expulsar ni borrar sus mensajes._',
  ya_es_inmune: '⚠️ @{tag} ya tiene inmunidad en este grupo.',
  quitado: '✅ *INMUNIDAD QUITADA*\n\n👤 *Usuario:* @{tag}\n\n_Vuelve a estar sujeto a las reglas del grupo._',
  no_era_inmune: '⚠️ @{tag} no tiene inmunidad en este grupo.',
  no_en_grupo: '❌ Ese usuario no está en el grupo.',
  no_numero: '❌ No pude identificar a ese usuario. Mencionalo con *@* o respondé a su mensaje.',
  admin_ya_protegido: '🛡️ @{tag} es administrador: ya está protegido y no se le puede dar mute.',
  owner_ya_protegido: '👑 @{tag} es owner/subowner: ya tiene protección total.',
  error: '❌ Error al procesar la inmunidad.'
};

function getT(idioma) {
  const lang = idioma || global.defaultLenguaje || 'es';
  if (_lang.has(lang)) return _lang.get(lang);
  let t = {};
  try {
    t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'))?.plugins?.gc_inmunidad || {};
  } catch {
    try {
      t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'))?.plugins?.gc_inmunidad || {};
    } catch {}
  }
  const salida = { ...DEFAULTS, ...t };
  _lang.set(lang, salida);
  return salida;
}

function buscarParticipante(participants, raw) {
  if (!raw) return null;
  const d = soloDigitos(raw);
  if (!d) return null;
  return (participants || []).find(p =>
    p.id === raw || p.lid === raw ||
    soloDigitos(p.id) === d ||
    soloDigitos(p.lid) === d ||
    soloDigitos(p.phoneNumber) === d
  ) || null;
}

function jidReal(p, conn) {
  const id = p?.id || p?.phoneNumber || p?.lid || '';
  if (String(id).includes('@lid')) {
    try {
      const tel = resolveJidToPhone(id, conn);
      if (tel) return `${tel}@s.whatsapp.net`;
    } catch {}
  }
  return id;
}

function accionDe(texto) {
  const limpio = String(texto || '').replace(/@\d+/g, ' ').trim().toLowerCase();
  if (/^(quitar|remover|sacar|eliminar|del|off)\b/.test(limpio)) return 'quitar';
  if (/^(lista|listar|ver|mostrar)\b/.test(limpio)) return 'lista';
  return 'agregar';
}

function quitarMutes(chat, numero) {
  const db = global.db?.data?.mutes;
  if (!db || !numero) return;
  for (const key of Object.keys(db)) {
    if (!key.startsWith(chat + '_')) continue;
    const d = key.slice(chat.length + 1).replace(/\D/g, '');
    if (!d) continue;
    if (d === numero || d.endsWith(numero) || numero.endsWith(d)) delete db[key];
  }
}

const handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const t = getT(idioma);

  try {
    if (!m.isGroup) return m.reply(t.solo_grupos);

    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    if (!groupData.isAdmin && !isOwner) return m.reply(t.solo_admins);

    const participants = groupData.participants || [];
    const accion = accionDe(text);
    const raw = m.mentionedJid?.[0] || m.quoted?.sender || null;
    let target = buscarParticipante(participants, raw);

    if (!target && accion === 'agregar') {
      const num = String(text || '').replace(/@\d+/g, ' ').match(/\d{8,15}/)?.[0];
      if (num) target = buscarParticipante(participants, `${num}@s.whatsapp.net`);
    }

    if (accion === 'lista' || (accion === 'agregar' && !target && !raw && !String(text || '').replace(/@\d+/g, '').trim())) {
      const lista = listarInmunes(m.chat);
      if (!lista.length) return m.reply(t.lista_vacia);
      const mentions = [];
      const lineas = lista.map((item, i) => {
        const p = buscarParticipante(participants, `${item.numero}@s.whatsapp.net`);
        const jid = p?.id || `${item.numero}@s.whatsapp.net`;
        mentions.push(jid);
        return `${i + 1}. @${item.numero}${item.nombre ? ` — ${item.nombre}` : ''}`;
      });
      return conn.sendMessage(m.chat, {
        text: `${t.lista_titulo}\n\n${lineas.join('\n')}\n\n_${usedPrefix}${command} quitar @usuario_`,
        mentions: [...new Set(mentions)]
      }, { quoted: m });
    }

    if (!target) return m.reply(t.no_numero);

    const jid = jidReal(target, conn);
    const numero = soloDigitos(jid);
    if (!numero) return m.reply(t.no_numero);

    if (accion !== 'quitar' && (target.admin === 'admin' || target.admin === 'superadmin')) {
      return conn.sendMessage(m.chat, {
        text: t.admin_ya_protegido.replace(/{tag}/g, numero),
        mentions: [jid]
      }, { quoted: m });
    }

    if (accion !== 'quitar' && (isOwnerJid(jid, conn) || isSubOwnerJid(jid, conn))) {
      return conn.sendMessage(m.chat, {
        text: t.owner_ya_protegido.replace(/{tag}/g, numero),
        mentions: [jid]
      }, { quoted: m });
    }

    if (accion === 'quitar') {
      const quitado = quitarInmune(m.chat, numero);
      if (!quitado) {
        return conn.sendMessage(m.chat, {
          text: t.no_era_inmune.replace(/{tag}/g, numero),
          mentions: [jid]
        }, { quoted: m });
      }
      return conn.sendMessage(m.chat, {
        text: t.quitado.replace(/{tag}/g, numero),
        mentions: [jid]
      }, { quoted: m });
    }

    if (esInmune(m.chat, target, conn, participants)) {
      return conn.sendMessage(m.chat, {
        text: t.ya_es_inmune.replace(/{tag}/g, numero),
        mentions: [jid]
      }, { quoted: m });
    }

    agregarInmune(m.chat, { numero, nombre: target.name || '', por: m.sender });
    quitarMutes(m.chat, numero);
    if (target.lid) quitarMutes(m.chat, soloDigitos(target.lid));

    return conn.sendMessage(m.chat, {
      text: t.agregado.replace(/{tag}/g, numero).replace(/{por}/g, soloDigitos(m.sender)),
      mentions: [jid, m.sender]
    }, { quoted: m });
  } catch {
    try { await m.reply(t.error); } catch {}
  }
};

handler.help = ['inmunidad <@usuario>', 'inmunidad quitar <@usuario>', 'inmunidad lista'];
handler.tags = ['group'];
handler.group = true;
handler.command = /^(inmunidad|inmune|inmunes|inmunde|immunity)$/i;

export default handler;
