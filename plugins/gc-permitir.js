import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { resolveJidToPhone } from '../lib/funcion/lid-resolver.js';
import {
  agregarPermitido,
  quitarPermitido,
  listarPermitidos,
  esNumeroPermitido,
  numerosDeJid,
  soloDigitos
} from '../lib/funcion/proteccion-grupo.js';

const _lang = new Map();

const DEFAULTS = {
  solo_grupos: '❌ Este comando solo funciona en grupos.',
  solo_admins: '⚠️ Solo los administradores pueden permitir números en el grupo.',
  uso: '✅ *Permitir número (anti números / anti árabes)*\n\n• *{prefix}{cmd} @usuario* o *{prefix}{cmd} 5491123456789* → ese número puede estar y escribir en el grupo aunque su prefijo esté bloqueado.\n• *{prefix}{cmd} quitar @usuario* → le quita el permiso.\n• *{prefix}{cmd} lista* → muestra los números permitidos.\n\n_Sirve para los filtros *antinumero* y *antiarabes*._',
  lista_titulo: '✅ *NÚMEROS PERMITIDOS*',
  lista_vacia: '✅ *NÚMEROS PERMITIDOS*\n\nNo hay números permitidos en este grupo.',
  agregado: '✅ *NÚMERO PERMITIDO*\n\n📱 *Número:* {numero}\n👮 *Por:* @{por}\n\n_Ese número ya puede estar y escribir en el grupo aunque su prefijo esté bloqueado._',
  agregado_fuera: '✅ *NÚMERO PERMITIDO*\n\n📱 *Número:* {numero}\n👮 *Por:* @{por}\n\n_No está en el grupo todavía, pero cuando entre no lo va a expulsar._',
  ya_permitido: '⚠️ El número {numero} ya está permitido.',
  quitado: '✅ *PERMISO QUITADO*\n\n📱 *Número:* {numero}\n\n_Vuelve a estar sujeto a los filtros de números._',
  no_estaba: '⚠️ El número {numero} no estaba permitido.',
  numero_invalido: '❌ Número inválido. Mandá el número completo con código de país, ej: *5491123456789*.',
  no_numero: '❌ Mencioná al usuario, respondé a su mensaje o escribí el número completo.',
  error: '❌ Error al procesar el permiso.'
};

function getT(idioma) {
  const lang = idioma || global.defaultLenguaje || 'es';
  if (_lang.has(lang)) return _lang.get(lang);
  let t = {};
  try {
    t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'))?.plugins?.gc_permitir || {};
  } catch {
    try {
      t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'))?.plugins?.gc_permitir || {};
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

function numeroDeTexto(texto) {
  const limpio = String(texto || '')
    .replace(/@\d+/g, ' ')
    .replace(/^(quitar|remover|sacar|eliminar|del|off|lista|listar|ver|mostrar)\b/i, ' ')
    .trim();
  const digitos = limpio.replace(/\D/g, '');
  return digitos || null;
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
    const target = buscarParticipante(participants, raw);
    const jidObjetivo = target ? jidReal(target, conn) : raw;
    let numero = jidObjetivo ? soloDigitos(jidObjetivo) : '';
    if (!numero) numero = numeroDeTexto(text) || '';
    const aliases = [...numerosDeJid(target || jidObjetivo || raw, conn, participants)];

    if (accion === 'lista' || (!numero && accion === 'agregar')) {
      const lista = listarPermitidos(m.chat);
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

    if (!numero) return m.reply(t.no_numero);
    const objetivoEsLid = target && (String(target.id || '').includes('@lid') || String(target.lid || '').includes('@lid'));
    const maxNumero = objetivoEsLid ? 20 : 15;
    if (numero.length < 8 || numero.length > maxNumero) return m.reply(t.numero_invalido);

    const jidMencion = target?.id || `${numero}@s.whatsapp.net`;

    if (accion === 'quitar') {
      const quitado = quitarPermitido(m.chat, numero);
      if (!quitado) {
        return conn.sendMessage(m.chat, {
          text: t.no_estaba.replace(/{numero}/g, numero),
          mentions: [jidMencion, m.sender]
        }, { quoted: m });
      }
      return conn.sendMessage(m.chat, {
        text: t.quitado.replace(/{numero}/g, numero),
        mentions: [jidMencion, m.sender]
      }, { quoted: m });
    }

    if (esNumeroPermitido(m.chat, target || jidMencion, conn, participants)) {
      return conn.sendMessage(m.chat, {
        text: t.ya_permitido.replace(/{numero}/g, numero),
        mentions: [jidMencion, m.sender]
      }, { quoted: m });
    }

    agregarPermitido(m.chat, { numero, nombre: target?.name || '', por: m.sender, aliases });
    const clave = target ? 'agregado' : 'agregado_fuera';

    return conn.sendMessage(m.chat, {
      text: t[clave].replace(/{numero}/g, numero).replace(/{por}/g, soloDigitos(m.sender)),
      mentions: [jidMencion, m.sender]
    }, { quoted: m });
  } catch {
    try { await m.reply(t.error); } catch {}
  }
};

handler.help = ['permitir <número|@usuario>', 'permitir quitar <número|@usuario>', 'permitir lista'];
handler.tags = ['group'];
handler.group = true;
handler.command = /^(permitir|permitirnumero|permitirn|allow)$/i;

export default handler;
