import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { addOwner, removeOwner } from '../lib/funcion/owners-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const updateConfigFile = (type, number) => {
  const configPath = path.join(__dirname, '../config.js');
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    if (type === 'owner') {
      const ownerRegex = /global\.owner\s*=\s*\[([\s\S]*?)\];/;
      const match = configContent.match(ownerRegex);
      if (match) {
        const newOwner      = `  ['${number}', 'OWNER-AGREGADO', true]`;
        const cleanOwners   = match[1].trim() ? match[1].replace(/,\s*$/, '') : '';
        const updatedOwners = cleanOwners ? cleanOwners + ',\n' + newOwner : '\n' + newOwner;
        configContent = configContent.replace(ownerRegex, `global.owner = [${updatedOwners}\n];`);
      }
    } else if (type === 'lid') {
      const lidRegex = /global\.lidOwners\s*=\s*\[([\s\S]*?)\];/;
      const match = configContent.match(lidRegex);
      if (match) {
        const newLid      = `  "${number}"`;
        const cleanLids   = match[1].trim() ? match[1].replace(/,\s*$/, '') : '';
        const updatedLids = cleanLids ? cleanLids + ',\n' + newLid : '\n' + newLid;
        configContent = configContent.replace(lidRegex, `global.lidOwners = [${updatedLids}\n];`);
      }
    }
    fs.writeFileSync(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error al actualizar config.js:', error);
    return false;
  }
};

const cleanDuplicateLids = () => {
  const configPath = path.join(__dirname, '../config.js');
  try {
    let configContent   = fs.readFileSync(configPath, 'utf8');
    const ownerNumbers  = global.owner.map(([num]) => num);
    const cleanedLids   = global.lidOwners.filter(lid => !ownerNumbers.includes(lid));
    global.lidOwners    = cleanedLids;
    const newLidsContent = cleanedLids.length > 0
      ? '\n' + cleanedLids.map(lid => `  "${lid}"`).join(',\n') + '\n'
      : '';
    const lidRegex = /global\.lidOwners\s*=\s*\[([\s\S]*?)\];/;
    configContent = configContent.replace(lidRegex, `global.lidOwners = [${newLidsContent}];`);
    fs.writeFileSync(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error al limpiar LIDs duplicados:', error);
    return false;
  }
};

const removeFromConfigFile = (type, identifier) => {
  const configPath = path.join(__dirname, '../config.js');
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    if (type === 'owner') {
      const ownerRegex = /global\.owner\s*=\s*\[([\s\S]*?)\];/;
      const match = configContent.match(ownerRegex);
      if (match) {
        const filteredLines = match[1].split('\n').filter(line => !line.includes(`'${identifier}'`));
        configContent = configContent.replace(ownerRegex, `global.owner = [${filteredLines.join('\n')}];`);
      }
    } else if (type === 'lid') {
      const lidRegex = /global\.lidOwners\s*=\s*\[([\s\S]*?)\];/;
      const match = configContent.match(lidRegex);
      if (match) {
        const filteredLines = match[1].split('\n').filter(line => !line.includes(`"${identifier}"`));
        configContent = configContent.replace(lidRegex, `global.lidOwners = [${filteredLines.join('\n')}];`);
      }
    }
    fs.writeFileSync(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error al remover de config.js:', error);
    return false;
  }
};

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

async function resolveLidRaw(m, conn) {
  if (m.mentionedJid?.[0]) {
    const mentioned = m.mentionedJid[0];
    if (mentioned.includes('@lid')) return mentioned.replace(/[^0-9]/g, '');
    try {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender);
      const pEntry = participants.find(p => p.id === mentioned);
      if (pEntry?.lid) return pEntry.lid.replace(/[^0-9]/g, '');
    } catch {}
    return mentioned.replace(/[^0-9]/g, '');
  }
  if (m.quoted?.sender) {
    const sender = m.quoted.sender;
    if (sender.includes('@lid')) return sender.replace(/[^0-9]/g, '');
    try {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender);
      const pEntry = participants.find(p => p.id === sender);
      if (pEntry?.lid) return pEntry.lid.replace(/[^0-9]/g, '');
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

    if (global.owner.some(([num]) => num === numero)) {
      return conn.reply(m.chat, t.numero_ya_owner || '⚠️ *Este número ya es owner.*', m);
    }

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});

    const resultado = addOwner(numero, 'OWNER-AGREGADO');
    if (resultado.success) {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
      conn.reply(m.chat, (t.agregarowner_exito || '✅ *OWNER AGREGADO EXITOSAMENTE*\n\n👤 *Número:* {numero}\n📋 *Total de owners:* {total}\n\n*El cambio se ha guardado permanentemente en config.js*')
        .replace('{numero}', numero).replace('{total}', global.owner.length), m);
    } else {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, (t.error_resultado || '❌ *{mensaje}*').replace('{mensaje}', resultado.error), m);
    }
  }

  else if (command === 'agregarlid' || command === 'addlid') {
    const lid = await resolveLidRaw(m, conn);

    if (!lid) {
      return conn.reply(m.chat, (t.agregarlid_ayuda || '📋 *AGREGAR LID OWNER*\n\n*Uso correcto:*\n• `{cmd} @usuario`\n• `{cmd} 535353553636`\n\n*¿Qué es un LID?*\n• Los LID son identificadores especiales de WhatsApp\n• Se usan para cuentas empresariales o en ciertos casos específicos').replace(/\{cmd\}/g, cmd), m);
    }

    if (lid.length < 10) {
      return conn.reply(m.chat, t.lid_corto || '❌ *El LID debe tener al menos 10 dígitos.*', m);
    }

    if (global.lidOwners.includes(lid)) {
      return conn.reply(m.chat, t.lid_ya_registrado || '⚠️ *Este LID ya está registrado como owner.*', m);
    }

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});

    try {
      global.lidOwners.push(lid);
      const success = updateConfigFile('lid', lid);
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, (t.agregarlid_exito || '✅ *LID OWNER AGREGADO EXITOSAMENTE*\n\n🆔 *LID:* {lid}\n📋 *Total de LID owners:* {total}\n\n*El cambio se ha guardado permanentemente en config.js*')
          .replace('{lid}', lid).replace('{total}', global.lidOwners.length), m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, t.error_guardar_config || '❌ *Error al guardar en el archivo de configuración.*', m);
      }
    } catch (error) {
      console.error('Error en agregarlid:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, t.error_agregar_lid || '❌ *Error al agregar el LID.*', m);
    }
  }

  else if (command === 'removerowner' || command === 'removeowner') {
    if (!args[0]) {
      return conn.reply(m.chat, (t.removerowner_ayuda || '🗑️ *REMOVER OWNER*\n\n*Uso correcto:*\n• `{cmd} 5492483466763`').replace(/\{cmd\}/g, cmd), m);
    }
    const numero = args[0].replace(/[^0-9]/g, '');
    const ownerIndex = global.owner.findIndex(([num]) => num === numero);
    if (ownerIndex === -1) return conn.reply(m.chat, t.numero_no_registrado || '❌ *Este número no está registrado como owner.*', m);
    if (global.owner.length === 1) return conn.reply(m.chat, t.no_quitar_ultimo || '⚠️ *No puedes quitar el último owner.*', m);

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    const resultado = removeOwner(numero);
    if (resultado.success) {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
      conn.reply(m.chat, (t.removerowner_exito || '✅ *OWNER REMOVIDO EXITOSAMENTE*\n\n👤 *Número:* {numero}\n📋 *Total de owners restantes:* {total}')
        .replace('{numero}', numero).replace('{total}', global.owner.length), m);
    } else {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, (t.error_resultado || '❌ *{mensaje}*').replace('{mensaje}', resultado.error), m);
    }
  }

  else if (command === 'removerlid' || command === 'removelid') {
    if (!args[0]) {
      return conn.reply(m.chat, (t.removerlid_ayuda || '🗑️ *REMOVER LID OWNER*\n\n*Uso correcto:*\n• `{cmd} 535353553636`').replace(/\{cmd\}/g, cmd), m);
    }
    const lid = args[0].replace(/[^0-9]/g, '');
    const lidIndex = global.lidOwners.indexOf(lid);
    if (lidIndex === -1) return conn.reply(m.chat, t.lid_no_registrado || '❌ *Este LID no está registrado como owner.*', m);

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    try {
      global.lidOwners.splice(lidIndex, 1);
      const success = removeFromConfigFile('lid', lid);
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, (t.removerlid_exito || '✅ *LID OWNER REMOVIDO EXITOSAMENTE*\n\n🆔 *LID:* {lid}\n📋 *Total de LID owners:* {total}')
          .replace('{lid}', lid).replace('{total}', global.lidOwners.length), m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, t.error_guardar_config || '❌ *Error al guardar en el archivo de configuración.*', m);
      }
    } catch (error) {
      console.error('Error en removerlid:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, t.error_remover_lid || '❌ *Error al remover el LID.*', m);
    }
  }

  else if (command === 'quitarowner' || command === 'deleteowner') {
    if (!args[0]) {
      return conn.reply(m.chat, (t.quitarowner_ayuda || '🗑️ *QUITAR OWNER*\n\n*Uso correcto:*\n• `{cmd} 5492483466763`').replace(/\{cmd\}/g, cmd), m);
    }
    const numero     = args[0].replace(/[^0-9]/g, '');
    const ownerIndex = global.owner.findIndex(([num]) => num === numero);
    if (ownerIndex === -1) return conn.reply(m.chat, t.numero_no_registrado || '❌ *Este número no está registrado como owner.*', m);
    if (global.owner.length === 1) return conn.reply(m.chat, t.no_quitar_ultimo_extendido || '⚠️ *No puedes quitar el último owner. Debe haber al menos uno.*', m);

    const ownerAntes = global.owner.find(([num]) => num === numero);

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    const resultado = removeOwner(numero);
    if (resultado.success) {
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
      conn.reply(m.chat, (t.quitarowner_exito || '✅ *OWNER ELIMINADO EXITOSAMENTE*\n\n👤 *Número:* {numero}\n🏷️ *Nombre:* {nombre}\n📋 *Total de owners restantes:* {total}\n\n*El cambio se ha guardado permanentemente en config.js*')
        .replace('{numero}', numero).replace('{nombre}', ownerAntes?.[1] || '').replace('{total}', global.owner.length), m);
    } else {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, (t.error_resultado || '❌ *{mensaje}*').replace('{mensaje}', resultado.error), m);
    }
  }

  else if (command === 'quitarlid' || command === 'deletelid') {
    if (!args[0]) {
      return conn.reply(m.chat, (t.quitarlid_ayuda || '🗑️ *QUITAR LID OWNER*\n\n*Uso correcto:*\n• `{cmd} 535353553636`').replace(/\{cmd\}/g, cmd), m);
    }
    const lid      = args[0].replace(/[^0-9]/g, '');
    const lidIndex = global.lidOwners.indexOf(lid);
    if (lidIndex === -1) return conn.reply(m.chat, t.lid_no_registrado || '❌ *Este LID no está registrado como owner.*', m);

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    try {
      global.lidOwners.splice(lidIndex, 1);
      const success = removeFromConfigFile('lid', lid);
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, (t.quitarlid_exito || '✅ *LID OWNER ELIMINADO EXITOSAMENTE*\n\n🆔 *LID:* {lid}\n📋 *Total de LID owners restantes:* {total}\n\n*El cambio se ha guardado permanentemente en config.js*')
          .replace('{lid}', lid).replace('{total}', global.lidOwners.length), m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, t.error_guardar_config || '❌ *Error al guardar en el archivo de configuración.*', m);
      }
    } catch (error) {
      console.error('Error en quitarlid:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, t.error_quitar_lid || '❌ *Error al quitar el LID.*', m);
    }
  }

  else if (command === 'listaradmins' || command === 'listadmins' || command === 'adminlist') {
    cleanDuplicateLids();
    let mensaje = (t.listaradmins_header || '📋 *ADMINISTRADORES DEL BOT*\n\n👑 *OWNERS ({total}):*\n').replace('{total}', global.owner.length);
    global.owner.forEach(([num, name], index) => {
      mensaje += (t.listaradmins_item || '{i}. {num} ({nombre})\n').replace('{i}', index + 1).replace('{num}', num).replace('{nombre}', name);
    });
    mensaje += (t.listaradmins_lid_header || '\n🆔 *LID OWNERS ÚNICOS ({total}):*\n').replace('{total}', global.lidOwners.length);
    if (global.lidOwners.length > 0) {
      global.lidOwners.forEach((lid, index) => {
        mensaje += (t.listaradmins_lid_item || '{i}. {lid}\n').replace('{i}', index + 1).replace('{lid}', lid);
      });
    } else {
      mensaje += t.listaradmins_sin_lids || '*No hay LID owners específicos (solo se usan owners normales)*\n';
    }
    mensaje += t.listaradmins_footer || '\n💡 *Nota:* Los owners normales tienen acceso automático como LID owners.';
    conn.reply(m.chat, mensaje, m);
  }

  else if (command === 'limpiarlids' || command === 'cleanlids') {
    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    try {
      const ownerNumbers  = global.owner.map(([num]) => num);
      const lidsAntes     = global.lidOwners.length;
      const lidsDuplicados = global.lidOwners.filter(lid => ownerNumbers.includes(lid));
      const success       = cleanDuplicateLids();
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        const detalle = lidsDuplicados.length > 0
          ? (t.limpiarlids_lista_header || '📋 *LIDs removidos:*\n') + lidsDuplicados.map((lid, i) => `${i + 1}. ${lid}`).join('\n')
          : '';
        conn.reply(m.chat, (t.limpiarlids_exito || '✅ *LIMPIEZA DE LIDS COMPLETADA*\n\n🔢 *LIDs antes:* {antes}\n🔢 *LIDs después:* {despues}\n🗑️ *LIDs removidos (duplicados):* {removidos}\n\n{detalle}\n\n*Los owners normales siguen teniendo acceso automático.*')
          .replace('{antes}', lidsAntes).replace('{despues}', global.lidOwners.length).replace('{removidos}', lidsDuplicados.length).replace('{detalle}', detalle), m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, t.error_limpiar_lids || '❌ *Error al limpiar los LIDs.*', m);
      }
    } catch (error) {
      console.error('Error en limpiarlids:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, t.error_limpiar_lids || '❌ *Error al limpiar los LIDs.*', m);
    }
  }
};

handler.help = ['agregarowner', 'agregarlid', 'quitarowner', 'quitarlid', 'removerowner', 'removerlid', 'listaradmins', 'limpiarlids'];
handler.tags = ['owner'];
handler.command = /^(agregarowner|addowner|agregarlid|addlid|quitarowner|deleteowner|quitarlid|deletelid|removerowner|removeowner|removerlid|removelid|listaradmins|listadmins|adminlist|limpiarlids|cleanlids)$/i;
handler.owner = true;

export default handler;
