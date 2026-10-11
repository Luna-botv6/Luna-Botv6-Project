import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { addSubOwner, removeSubOwner, listSubOwners } from '../lib/funcion/owners-manager.js';
import { listOwners } from '../lib/funcion/owners-manager.js';

async function resolveSubNumber(m, conn) {
  if (m.mentionedJid?.[0]) {
    const mentioned = m.mentionedJid[0];
    if (!mentioned.includes('@lid')) return mentioned.replace(/[^0-9]/g, '');
    try {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender);
      const real = participants.find(p => p.lid === mentioned)?.id;
      if (real) return real.replace(/[^0-9]/g, '');
    } catch {}
    return mentioned.replace(/[^0-9]/g, '');
  }
  if (m.quoted?.sender) {
    const sender = m.quoted.sender;
    if (!sender.includes('@lid')) return sender.replace(/[^0-9]/g, '');
    try {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender);
      const real = participants.find(p => p.lid === sender)?.id;
      if (real) return real.replace(/[^0-9]/g, '');
    } catch {}
  }
  if (m.text) return m.text.replace(/[^0-9]/g, '');
  return null;
}

const handler = async (m, { conn, args, command, usedPrefix, isROwner }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_subowners || {};
  const cmd = usedPrefix + command;

  if (!isROwner) {
    return conn.reply(m.chat, t.solo_owners || '❌ *Solo los owners pueden usar este comando.*', m);
  }

  if (command === 'agregarsubowner' || command === 'addsubowner') {
    const numero = await resolveSubNumber(m, conn);
    if (!numero) {
      return conn.reply(m.chat, (t.agregar_ayuda || '📋 *AGREGAR SUBOWNER*\n\n*Uso:*\n• `{cmd} @usuario`\n• `{cmd} 5492483466763`').replace(/\{cmd\}/g, cmd), m);
    }
    if (numero.length < 10) {
      return conn.reply(m.chat, t.numero_corto || '❌ *El número debe tener al menos 10 dígitos.*', m);
    }
    if (listOwners().some((o) => o.numero === numero)) {
      return conn.reply(m.chat, t.es_owner || '⚠️ *Este número ya es owner.*', m);
    }
    if (listSubOwners().some((o) => o.numero === numero)) {
      return conn.reply(m.chat, t.ya_subowner || '⚠️ *Este número ya es subowner.*', m);
    }
    const resultado = addSubOwner(numero, 'SUBOWNER-AGREGADO');
    if (resultado.success) {
      conn.reply(m.chat, (t.agregar_exito || '✅ *SUBOWNER AGREGADO*\n\n👤 *Número:* {numero}\n📋 *Total:* {total}')
        .replace('{numero}', numero).replace('{total}', String(resultado.subowners.length)), m);
    } else {
      conn.reply(m.chat, (t.error || '❌ *{mensaje}*').replace('{mensaje}', resultado.error), m);
    }
  }

  else if (command === 'quitarsubowner' || command === 'removesubowner' || command === 'deletesubowner') {
    if (!args[0]) {
      return conn.reply(m.chat, (t.quitar_ayuda || '🗑️ *QUITAR SUBOWNER*\n\n*Uso:* `{cmd} 5492483466763`').replace(/\{cmd\}/g, cmd), m);
    }
    const numero = args[0].replace(/[^0-9]/g, '');
    if (!listSubOwners().some((o) => o.numero === numero)) {
      return conn.reply(m.chat, t.no_registrado || '❌ *Este número no es subowner.*', m);
    }
    const resultado = removeSubOwner(numero);
    if (resultado.success) {
      conn.reply(m.chat, (t.quitar_exito || '✅ *SUBOWNER ELIMINADO*\n\n👤 *Número:* {numero}\n📋 *Restantes:* {total}')
        .replace('{numero}', numero).replace('{total}', String(resultado.subowners.length)), m);
    } else {
      conn.reply(m.chat, (t.error || '❌ *{mensaje}*').replace('{mensaje}', resultado.error), m);
    }
  }

  else if (command === 'listarsubowners' || command === 'listsubowners' || command === 'subownerlist') {
    const subs = listSubOwners();
    if (!subs.length) return conn.reply(m.chat, t.lista_vacia || '📭 *No hay subowners.*', m);
    let mensaje = (t.lista_header || '🤝 *SUBOWNERS ({total}):*\n').replace('{total}', String(subs.length));
    subs.forEach((o, index) => {
      mensaje += (t.lista_item || '{i}. {num} ({nombre})\n').replace('{i}', String(index + 1)).replace('{num}', o.numero).replace('{nombre}', o.nombre || '');
    });
    conn.reply(m.chat, mensaje, m);
  }
};

handler.help = ['agregarsubowner', 'quitarsubowner', 'listarsubowners'];
handler.tags = ['owner'];
handler.command = /^(agregarsubowner|addsubowner|quitarsubowner|removesubowner|deletesubowner|listarsubowners|listsubowners|subownerlist)$/i;
handler.rowner = true;

export default handler;
