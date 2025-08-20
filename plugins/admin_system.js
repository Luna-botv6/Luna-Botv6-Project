import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para leer y modificar el config.js
const updateConfigFile = (type, number) => {
  const configPath = path.join(__dirname, '../config.js'); // Ajusta la ruta según tu estructura
  
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    if (type === 'owner') {
      // Buscar la sección global.owner hasta el primer ]; que encuentra
      const ownerRegex = /global\.owner\s*=\s*\[([\s\S]*?)\];/;
      const match = configContent.match(ownerRegex);
      
      if (match) {
        const currentOwners = match[1];
        // Agregar el nuevo owner con formato estándar, manteniendo la indentación
        const newOwner = `  ['${number}', 'OWNER-AGREGADO', true]`;
        
        // Si ya hay owners, agregar coma al final del último y añadir el nuevo
        let updatedOwners;
        if (currentOwners.trim()) {
          // Eliminar la coma final si existe y agregar la nueva entrada
          const cleanOwners = currentOwners.replace(/,\s*$/, '');
          updatedOwners = cleanOwners + ',\n' + newOwner;
        } else {
          updatedOwners = '\n' + newOwner;
        }
        
        configContent = configContent.replace(
          ownerRegex,
          `global.owner = [${updatedOwners}\n];`
        );
      }
    } else if (type === 'lid') {
      // Buscar la sección global.lidOwners hasta el primer ]; que encuentra
      const lidRegex = /global\.lidOwners\s*=\s*\[([\s\S]*?)\];/;
      const match = configContent.match(lidRegex);
      
      if (match) {
        const currentLids = match[1];
        // Agregar el nuevo LID con formato estándar, manteniendo la indentación
        const newLid = `  "${number}"`;
        
        // Si ya hay LIDs, agregar coma al final del último y añadir el nuevo
        let updatedLids;
        if (currentLids.trim()) {
          // Eliminar la coma final si existe y agregar la nueva entrada
          const cleanLids = currentLids.replace(/,\s*$/, '');
          updatedLids = cleanLids + ',\n' + newLid;
        } else {
          updatedLids = '\n' + newLid;
        }
        
        configContent = configContent.replace(
          lidRegex,
          `global.lidOwners = [${updatedLids}\n];`
        );
      }
    }
    
    // Escribir el archivo actualizado
    fs.writeFileSync(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error al actualizar config.js:', error);
    return false;
  }
};

// Función para limpiar LIDs duplicados (remover owners de la lista de LIDs)
const cleanDuplicateLids = () => {
  const configPath = path.join(__dirname, '../config.js');
  
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Obtener los números de owners actuales
    const ownerNumbers = global.owner.map(([num]) => num);
    
    // Filtrar los LIDs para remover los que son owners normales
    const cleanedLids = global.lidOwners.filter(lid => !ownerNumbers.includes(lid));
    
    // Actualizar el array global
    global.lidOwners = cleanedLids;
    
    // Construir el nuevo contenido para LIDs
    let newLidsContent = '';
    if (cleanedLids.length > 0) {
      newLidsContent = '\n' + cleanedLids.map(lid => `  "${lid}"`).join(',\n') + '\n';
    }
    
    // Reemplazar en el archivo
    const lidRegex = /global\.lidOwners\s*=\s*\[([\s\S]*?)\];/;
    configContent = configContent.replace(
      lidRegex,
      `global.lidOwners = [${newLidsContent}];`
    );
    
    fs.writeFileSync(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error al limpiar LIDs duplicados:', error);
    return false;
  }
};

// Función para remover owner o lid
const removeFromConfigFile = (type, identifier) => {
  const configPath = path.join(__dirname, '../config.js');
  
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    if (type === 'owner') {
      const ownerRegex = /global\.owner\s*=\s*\[([\s\S]*?)\];/;
      const match = configContent.match(ownerRegex);
      
      if (match) {
        let currentOwners = match[1];
        // Remover la línea que contiene el número específico
        const lines = currentOwners.split('\n');
        const filteredLines = lines.filter(line => !line.includes(`'${identifier}'`));
        const updatedOwners = filteredLines.join('\n');
        
        configContent = configContent.replace(
          ownerRegex,
          `global.owner = [${updatedOwners}];`
        );
      }
    } else if (type === 'lid') {
      const lidRegex = /global\.lidOwners\s*=\s*\[([\s\S]*?)\];/;
      const match = configContent.match(lidRegex);
      
      if (match) {
        let currentLids = match[1];
        // Remover la línea que contiene el LID específico
        const lines = currentLids.split('\n');
        const filteredLines = lines.filter(line => !line.includes(`"${identifier}"`));
        const updatedLids = filteredLines.join('\n');
        
        configContent = configContent.replace(
          lidRegex,
          `global.lidOwners = [${updatedLids}];`
        );
      }
    }
    
    fs.writeFileSync(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error al remover de config.js:', error);
    return false;
  }
};

// Handler principal
const handler = async (m, { conn, args, command, usedPrefix, isOwner }) => {
  
  // Verificar si el usuario es owner
  if (!isOwner) {
    return conn.reply(m.chat, '❌ *Solo los owners pueden usar este comando.*', m);
  }

  if (command === 'agregarowner' || command === 'addowner') {
    // Verificar si se proporcionó un número
    if (!args[0]) {
      return conn.reply(m.chat, `
📋 *AGREGAR OWNER*

*Uso correcto:*
• \`${usedPrefix + command} 5492483466763\`

*Ejemplo para grupos normales:*
• Si quieres agregar el número 5492483466763 como owner:
• \`${usedPrefix + command} 5492483466763\`

*Nota:* El número debe incluir el código de país sin el símbolo +
`, m);
    }
    
    // Limpiar el número (solo números)
    const numero = args[0].replace(/[^0-9]/g, '');
    
    if (numero.length < 10) {
      return conn.reply(m.chat, '❌ *El número debe tener al menos 10 dígitos.*', m);
    }
    
    // Verificar si ya existe
    if (global.owner.some(([num]) => num === numero)) {
      return conn.reply(m.chat, '⚠️ *Este número ya es owner.*', m);
    }
    
    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    
    try {
      // Agregar al array global actual
      global.owner.push([numero, 'OWNER-AGREGADO', true]);
      
      // Actualizar el archivo config.js
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
    // Verificar si se proporcionó un número
    if (!args[0]) {
      return conn.reply(m.chat, `
📋 *AGREGAR LID OWNER*

*Uso correcto:*
• \`${usedPrefix + command} 535353553636\`

*Ejemplo:*
• Si quieres agregar el número 535353553636 como LID owner:
• \`${usedPrefix + command} 535353553636\`

*¿Qué es un LID?*
• Los LID (Local ID) son identificadores especiales de WhatsApp
• Se usan para cuentas empresariales o en ciertos casos específicos
• Tienen un formato numérico largo único
`, m);
    }
    
    // Limpiar el LID (solo números)
    const lid = args[0].replace(/[^0-9]/g, '');
    
    if (lid.length < 10) {
      return conn.reply(m.chat, '❌ *El LID debe tener al menos 10 dígitos.*', m);
    }
    
    // Verificar si ya existe
    if (global.lidOwners.includes(lid)) {
      return conn.reply(m.chat, '⚠️ *Este LID ya está registrado como owner.*', m);
    }
    
    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    
    try {
      // Agregar al array global actual
      global.lidOwners.push(lid);
      
      // Actualizar el archivo config.js
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

*Nota:* El número debe incluir el código de país sin el símbolo +
`, m);
    }
    
    const numero = args[0].replace(/[^0-9]/g, '');
    
    // Verificar si existe
    const ownerIndex = global.owner.findIndex(([num]) => num === numero);
    if (ownerIndex === -1) {
      return conn.reply(m.chat, '❌ *Este número no está registrado como owner.*', m);
    }
    
    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    
    try {
      // Remover del array global
      global.owner.splice(ownerIndex, 1);
      
      // Actualizar el archivo config.js
      const success = removeFromConfigFile('owner', numero);
      
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, `
✅ *OWNER REMOVIDO EXITOSAMENTE*

👤 *Número:* ${numero}
📋 *Total de owners:* ${global.owner.length}

*El cambio se ha guardado permanentemente en config.js*
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
    
    // Verificar si existe
    const lidIndex = global.lidOwners.indexOf(lid);
    if (lidIndex === -1) {
      return conn.reply(m.chat, '❌ *Este LID no está registrado como owner.*', m);
    }
    
    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    
    try {
      // Remover del array global
      global.lidOwners.splice(lidIndex, 1);
      
      // Actualizar el archivo config.js
      const success = removeFromConfigFile('lid', lid);
      
      if (success) {
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }});
        conn.reply(m.chat, `
✅ *LID OWNER REMOVIDO EXITOSAMENTE*

🆔 *LID:* ${lid}
📋 *Total de LID owners:* ${global.lidOwners.length}

*El cambio se ha guardado permanentemente en config.js*
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

*Ejemplo:*
• Si quieres quitar el número 5492483466763 de los owners:
• \`${usedPrefix + command} 5492483466763\`

*Nota:* El número debe incluir el código de país sin el símbolo +
`, m);
    }
    
    const numero = args[0].replace(/[^0-9]/g, '');
    
    // Verificar si existe
    const ownerIndex = global.owner.findIndex(([num]) => num === numero);
    if (ownerIndex === -1) {
      return conn.reply(m.chat, '❌ *Este número no está registrado como owner.*', m);
    }
    
    // Verificar que no sea el último owner (opcional, para seguridad)
    if (global.owner.length === 1) {
      return conn.reply(m.chat, '⚠️ *No puedes quitar el último owner. Debe haber al menos un owner.*', m);
    }
    
    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    
    try {
      // Remover del array global
      const removedOwner = global.owner[ownerIndex];
      global.owner.splice(ownerIndex, 1);
      
      // Actualizar el archivo config.js
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

*Ejemplo:*
• Si quieres quitar el LID 535353553636 de los owners:
• \`${usedPrefix + command} 535353553636\`

*Nota:* Solo números, sin espacios ni símbolos
`, m);
    }
    
    const lid = args[0].replace(/[^0-9]/g, '');
    
    // Verificar si existe
    const lidIndex = global.lidOwners.indexOf(lid);
    if (lidIndex === -1) {
      return conn.reply(m.chat, '❌ *Este LID no está registrado como owner.*', m);
    }
    
    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    
    try {
      // Remover del array global
      global.lidOwners.splice(lidIndex, 1);
      
      // Actualizar el archivo config.js
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
    // Limpiar LIDs duplicados antes de mostrar la lista
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
    if (!isOwner) {
      return conn.reply(m.chat, '❌ *Solo los owners pueden usar este comando.*', m);
    }
    
    await conn.sendMessage(m.chat, { react: { text: '⏱️', key: m.key }});
    
    try {
      const ownerNumbers = global.owner.map(([num]) => num);
      const lidsAntes = global.lidOwners.length;
      const lidsDuplicados = global.lidOwners.filter(lid => ownerNumbers.includes(lid));
      
      // Limpiar duplicados
      const success = cleanDuplicateLids();
      
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

// Configuración del comando
handler.help = ['agregarowner', 'agregarlid', 'quitarowner', 'quitarlid', 'removerowner', 'removerlid', 'listaradmins', 'limpiarlids'];
handler.tags = ['owner'];
handler.command = /^(agregarowner|addowner|agregarlid|addlid|quitarowner|deleteowner|quitarlid|deletelid|removerowner|removeowner|removerlid|removelid|listaradmins|listadmins|adminlist|limpiarlids|cleanlids)$/i;
handler.owner = true;

export default handler;