import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

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
  if (!isOwner) {
    return conn.reply(m.chat, '❌ *Solo los owners pueden usar este comando.*', m);
  }

  if (command === 'agregarowner' || command === 'addowner') {
    const numero = await resolveOwnerNumber(m, conn);

    if (!numero) {
      return conn.reply(m.chat, `
📋 *AGREGAR OWNER*

*Uso correcto:*
• \`${usedPrefix + command} @usuario\`
• \`${usedPrefix + command} 5492483466763\`

*Nota:* El número debe incluir el código de país sin el símbolo +
`, m);
    }

    if (numero.length < 10) {
      return conn.reply(m.chat, '❌ *El número debe tener al menos 10 dígitos.*', m);
    }

    if (global.owner.some(([num]) => num === numero)) {
      return conn.reply(m.chat, '⚠️ *Este número ya es owner.*', m);
    }

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});

    try {
      global.owner.push([numero, 'OWNER-AGREGADO', true]);
      const success = updateConfigFile('owner', numero);
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, `
✅ *OWNER AGREGADO EXITOSAMENTE*

👤 *Número:* ${numero}
📋 *Total de owners:* ${global.owner.length}

*El cambio se ha guardado permanentemente en config.js*
`, m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, '❌ *Error al guardar en el archivo de configuración.*', m);
      }
    } catch (error) {
      console.error('Error en agregarowner:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, '❌ *Error al agregar el owner.*', m);
    }
  }

  else if (command === 'agregarlid' || command === 'addlid') {
    const lid = await resolveLidRaw(m, conn);

    if (!lid) {
      return conn.reply(m.chat, `
📋 *AGREGAR LID OWNER*

*Uso correcto:*
• \`${usedPrefix + command} @usuario\`
• \`${usedPrefix + command} 535353553636\`

*¿Qué es un LID?*
• Los LID son identificadores especiales de WhatsApp
• Se usan para cuentas empresariales o en ciertos casos específicos
`, m);
    }

    if (lid.length < 10) {
      return conn.reply(m.chat, '❌ *El LID debe tener al menos 10 dígitos.*', m);
    }

    if (global.lidOwners.includes(lid)) {
      return conn.reply(m.chat, '⚠️ *Este LID ya está registrado como owner.*', m);
    }

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});

    try {
      global.lidOwners.push(lid);
      const success = updateConfigFile('lid', lid);
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, `
✅ *LID OWNER AGREGADO EXITOSAMENTE*

🆔 *LID:* ${lid}
📋 *Total de LID owners:* ${global.lidOwners.length}

*El cambio se ha guardado permanentemente en config.js*
`, m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, '❌ *Error al guardar en el archivo de configuración.*', m);
      }
    } catch (error) {
      console.error('Error en agregarlid:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, '❌ *Error al agregar el LID.*', m);
    }
  }

  else if (command === 'removerowner' || command === 'removeowner') {
    if (!args[0]) {
      return conn.reply(m.chat, `
🗑️ *REMOVER OWNER*

*Uso correcto:*
• \`${usedPrefix + command} 5492483466763\`
`, m);
    }
    const numero = args[0].replace(/[^0-9]/g, '');
    const ownerIndex = global.owner.findIndex(([num]) => num === numero);
    if (ownerIndex === -1) return conn.reply(m.chat, '❌ *Este número no está registrado como owner.*', m);
    if (global.owner.length === 1) return conn.reply(m.chat, '⚠️ *No puedes quitar el último owner.*', m);

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    try {
      global.owner.splice(ownerIndex, 1);
      const success = removeFromConfigFile('owner', numero);
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, `
✅ *OWNER REMOVIDO EXITOSAMENTE*

👤 *Número:* ${numero}
📋 *Total de owners restantes:* ${global.owner.length}
`, m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, '❌ *Error al guardar en el archivo de configuración.*', m);
      }
    } catch (error) {
      console.error('Error en removerowner:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, '❌ *Error al remover el owner.*', m);
    }
  }

  else if (command === 'removerlid' || command === 'removelid') {
    if (!args[0]) {
      return conn.reply(m.chat, `
🗑️ *REMOVER LID OWNER*

*Uso correcto:*
• \`${usedPrefix + command} 535353553636\`
`, m);
    }
    const lid = args[0].replace(/[^0-9]/g, '');
    const lidIndex = global.lidOwners.indexOf(lid);
    if (lidIndex === -1) return conn.reply(m.chat, '❌ *Este LID no está registrado como owner.*', m);

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    try {
      global.lidOwners.splice(lidIndex, 1);
      const success = removeFromConfigFile('lid', lid);
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, `
✅ *LID OWNER REMOVIDO EXITOSAMENTE*

🆔 *LID:* ${lid}
📋 *Total de LID owners:* ${global.lidOwners.length}
`, m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, '❌ *Error al guardar en el archivo de configuración.*', m);
      }
    } catch (error) {
      console.error('Error en removerlid:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, '❌ *Error al remover el LID.*', m);
    }
  }

  else if (command === 'quitarowner' || command === 'deleteowner') {
    if (!args[0]) {
      return conn.reply(m.chat, `
🗑️ *QUITAR OWNER*

*Uso correcto:*
• \`${usedPrefix + command} 5492483466763\`
`, m);
    }
    const numero     = args[0].replace(/[^0-9]/g, '');
    const ownerIndex = global.owner.findIndex(([num]) => num === numero);
    if (ownerIndex === -1) return conn.reply(m.chat, '❌ *Este número no está registrado como owner.*', m);
    if (global.owner.length === 1) return conn.reply(m.chat, '⚠️ *No puedes quitar el último owner. Debe haber al menos uno.*', m);

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    try {
      const removedOwner = global.owner[ownerIndex];
      global.owner.splice(ownerIndex, 1);
      const success = removeFromConfigFile('owner', numero);
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, `
✅ *OWNER ELIMINADO EXITOSAMENTE*

👤 *Número:* ${numero}
🏷️ *Nombre:* ${removedOwner[1]}
📋 *Total de owners restantes:* ${global.owner.length}

*El cambio se ha guardado permanentemente en config.js*
`, m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, '❌ *Error al guardar en el archivo de configuración.*', m);
      }
    } catch (error) {
      console.error('Error en quitarowner:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, '❌ *Error al quitar el owner.*', m);
    }
  }

  else if (command === 'quitarlid' || command === 'deletelid') {
    if (!args[0]) {
      return conn.reply(m.chat, `
🗑️ *QUITAR LID OWNER*

*Uso correcto:*
• \`${usedPrefix + command} 535353553636\`
`, m);
    }
    const lid      = args[0].replace(/[^0-9]/g, '');
    const lidIndex = global.lidOwners.indexOf(lid);
    if (lidIndex === -1) return conn.reply(m.chat, '❌ *Este LID no está registrado como owner.*', m);

    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    try {
      global.lidOwners.splice(lidIndex, 1);
      const success = removeFromConfigFile('lid', lid);
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, `
✅ *LID OWNER ELIMINADO EXITOSAMENTE*

🆔 *LID:* ${lid}
📋 *Total de LID owners restantes:* ${global.lidOwners.length}

*El cambio se ha guardado permanentemente en config.js*
`, m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, '❌ *Error al guardar en el archivo de configuración.*', m);
      }
    } catch (error) {
      console.error('Error en quitarlid:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, '❌ *Error al quitar el LID.*', m);
    }
  }

  else if (command === 'listaradmins' || command === 'listadmins' || command === 'adminlist') {
    cleanDuplicateLids();
    let mensaje = `
📋 *ADMINISTRADORES DEL BOT*

👑 *OWNERS (${global.owner.length}):*
`;
    global.owner.forEach(([num, name], index) => {
      mensaje += `${index + 1}. ${num} (${name})\n`;
    });
    mensaje += `\n🆔 *LID OWNERS ÚNICOS (${global.lidOwners.length}):*\n`;
    if (global.lidOwners.length > 0) {
      global.lidOwners.forEach((lid, index) => {
        mensaje += `${index + 1}. ${lid}\n`;
      });
    } else {
      mensaje += `*No hay LID owners específicos (solo se usan owners normales)*\n`;
    }
    mensaje += `\n💡 *Nota:* Los owners normales tienen acceso automático como LID owners.`;
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
        conn.reply(m.chat, `
✅ *LIMPIEZA DE LIDS COMPLETADA*

🔢 *LIDs antes:* ${lidsAntes}
🔢 *LIDs después:* ${global.lidOwners.length}
🗑️ *LIDs removidos (duplicados):* ${lidsDuplicados.length}

${lidsDuplicados.length > 0 ? `📋 *LIDs removidos:*\n${lidsDuplicados.map((lid, i) => `${i + 1}. ${lid}`).join('\n')}` : ''}

*Los owners normales siguen teniendo acceso automático.*
`, m);
      } else {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
        conn.reply(m.chat, '❌ *Error al limpiar los LIDs.*', m);
      }
    } catch (error) {
      console.error('Error en limpiarlids:', error);
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }});
      conn.reply(m.chat, '❌ *Error al limpiar los LIDs.*', m);
    }
  }
};

handler.help = ['agregarowner', 'agregarlid', 'quitarowner', 'quitarlid', 'removerowner', 'removerlid', 'listaradmins', 'limpiarlids'];
handler.tags = ['owner'];
handler.command = /^(agregarowner|addowner|agregarlid|addlid|quitarowner|deleteowner|quitarlid|deletelid|removerowner|removeowner|removerlid|removelid|listaradmins|listadmins|adminlist|limpiarlids|cleanlids)$/i;
handler.owner = true;

export default handler;