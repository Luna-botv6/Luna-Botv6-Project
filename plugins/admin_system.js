import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { addOwner, removeOwner, listOwners } from '../lib/funcion/owners-manager.js';

async function resolveOwnerNumber(m, conn) {
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

const handler = async (m, { conn, args, command, usedPrefix, isOwner }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.admin_system || {};
  const cmd = usedPrefix + command;

  if (!isOwner) {
    return conn.reply(m.chat, t.solo_owners || '❌ *Solo los owners pueden usar este comando.*', m);
  }

  if (command === 'agregarowner' || command === 'addowner') {
    const numero = await resolveOwnerNumber(m, conn);

    if (!numero) {
      return conn.reply(m.chat, (t.agregarowner_ayuda || '📋 *AGREGAR OWNER*\n\n*Uso correcto:*\n• `{cmd} @usuario`\n• `{cmd} 5492483466763`\n\n*Nota:* El número debe incluir el código de país sin el símbolo +').replace(/\{cmd\}/g, cmd), m);
    }

    if (numero.length < 10) {
      return conn.reply(m.chat, t.numero_corto || '❌ *El número debe tener al menos 10 dígitos.*', m);
    }

    if (listOwners().some((o) => o.numero === numero)) {
      return conn.reply(m.chat, t.numero_ya_owner || '⚠️ *Este número ya es owner.*', m);
    }

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});

    const resultado = addOwner(numero, 'OWNER-AGREGADO');
    if (resultado.success) {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
      conn.reply(m.chat, (t.agregarowner_exito || '✅ *OWNER AGREGADO EXITOSAMENTE*\n\n👤 *Número:* {numero}\n📋 *Total de owners:* {total}\n\n*El cambio se ha guardado permanentemente en system-owner.json*')
        .replace('{numero}', numero).replace('{total}', String(resultado.owners.length)), m);
    } else {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, (t.error_resultado || '❌ *{mensaje}*').replace('{mensaje}', resultado.error), m);
    }
  }

  else if (command === 'agregarlid' || command === 'addlid') {
    return conn.reply(m.chat, t.lid_retirado || 'ℹ️ *El sistema de LID owners fue retirado.*\n\nYa no hace falta pedir ningún LID: agregá solo el número real con `{cmd}` y el bot lo reconoce solo, venga como JID normal o LID.'.replace(/\{cmd\}/g, usedPrefix + 'agregarowner'), m);
  }

  else if (command === 'removerowner' || command === 'removeowner') {
    if (!args[0]) {
      return conn.reply(m.chat, (t.removerowner_ayuda || '🗑️ *REMOVER OWNER*\n\n*Uso correcto:*\n• `{cmd} 5492483466763`').replace(/\{cmd\}/g, cmd), m);
    }
    const numero = args[0].replace(/[^0-9]/g, '');
    if (!listOwners().some((o) => o.numero === numero)) return conn.reply(m.chat, t.numero_no_registrado || '❌ *Este número no está registrado como owner.*', m);
    if (listOwners().length === 1) return conn.reply(m.chat, t.no_quitar_ultimo || '⚠️ *No puedes quitar el último owner.*', m);

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    const resultado = removeOwner(numero);
    if (resultado.success) {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
      conn.reply(m.chat, (t.removerowner_exito || '✅ *OWNER REMOVIDO EXITOSAMENTE*\n\n👤 *Número:* {numero}\n📋 *Total de owners restantes:* {total}')
        .replace('{numero}', numero).replace('{total}', String(resultado.owners.length)), m);
    } else {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, (t.error_resultado || '❌ *{mensaje}*').replace('{mensaje}', resultado.error), m);
    }
  }

  else if (command === 'removerlid' || command === 'removelid') {
    return conn.reply(m.chat, t.lid_retirado || 'ℹ️ *El sistema de LID owners fue retirado.*\n\nYa no hace falta pedir ningún LID: agregá solo el número real con `{cmd}` y el bot lo reconoce solo, venga como JID normal o LID.'.replace(/\{cmd\}/g, usedPrefix + 'agregarowner'), m);
  }

  else if (command === 'quitarowner' || command === 'deleteowner') {
    if (!args[0]) {
      return conn.reply(m.chat, (t.quitarowner_ayuda || '🗑️ *QUITAR OWNER*\n\n*Uso correcto:*\n• `{cmd} 5492483466763`').replace(/\{cmd\}/g, cmd), m);
    }
    const numero = args[0].replace(/[^0-9]/g, '');
    const owners = listOwners();
    if (!owners.some((o) => o.numero === numero)) return conn.reply(m.chat, t.numero_no_registrado || '❌ *Este número no está registrado como owner.*', m);
    if (owners.length === 1) return conn.reply(m.chat, t.no_quitar_ultimo_extendido || '⚠️ *No puedes quitar el último owner. Debe haber al menos uno.*', m);

    const ownerAntes = owners.find((o) => o.numero === numero);

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    const resultado = removeOwner(numero);
    if (resultado.success) {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
      conn.reply(m.chat, (t.quitarowner_exito || '✅ *OWNER ELIMINADO EXITOSAMENTE*\n\n👤 *Número:* {numero}\n🏷️ *Nombre:* {nombre}\n📋 *Total de owners restantes:* {total}\n\n*El cambio se ha guardado permanentemente en system-owner.json*')
        .replace('{numero}', numero).replace('{nombre}', ownerAntes?.nombre || '').replace('{total}', String(resultado.owners.length)), m);
    } else {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, (t.error_resultado || '❌ *{mensaje}*').replace('{mensaje}', resultado.error), m);
    }
  }

  else if (command === 'quitarlid' || command === 'deletelid') {
    return conn.reply(m.chat, t.lid_retirado || 'ℹ️ *El sistema de LID owners fue retirado.*\n\nYa no hace falta pedir ningún LID: agregá solo el número real con `{cmd}` y el bot lo reconoce solo, venga como JID normal o LID.'.replace(/\{cmd\}/g, usedPrefix + 'agregarowner'), m);
  }

  else if (command === 'listaradmins' || command === 'listadmins' || command === 'adminlist') {
    const owners = listOwners();
    let mensaje = (t.listaradmins_header || '📋 *ADMINISTRADORES DEL BOT*\n\n👑 *OWNERS ({total}):*\n').replace('{total}', String(owners.length));
    owners.forEach((o, index) => {
      mensaje += (t.listaradmins_item || '{i}. {num} ({nombre})\n').replace('{i}', String(index + 1)).replace('{num}', o.numero).replace('{nombre}', o.nombre);
    });
    mensaje += t.listaradmins_footer || '\n💡 *Nota:* el bot reconoce al owner venga como JID normal o LID, sin configurar nada más.';
    conn.reply(m.chat, mensaje, m);
  }

  else if (command === 'limpiarlids' || command === 'cleanlids') {
    return conn.reply(m.chat, t.lid_retirado || 'ℹ️ *El sistema de LID owners fue retirado.*\n\nYa no hace falta pedir ningún LID: agregá solo el número real con `{cmd}` y el bot lo reconoce solo, venga como JID normal o LID.'.replace(/\{cmd\}/g, usedPrefix + 'agregarowner'), m);
  }
};

handler.help = ['agregarowner', 'quitarowner', 'removerowner', 'listaradmins'];
handler.tags = ['owner'];
handler.command = /^(agregarowner|addowner|agregarlid|addlid|quitarowner|deleteowner|quitarlid|deletelid|removerowner|removeowner|removerlid|removelid|listaradmins|listadmins|adminlist|limpiarlids|cleanlids)$/i;
handler.owner = true;

export default handler;
