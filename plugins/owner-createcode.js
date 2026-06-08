import fs from 'fs';
import path from 'path';

global.codeCreationSessions = global.codeCreationSessions || {};
global.savedCodes = global.savedCodes || {};

function escapeForTemplate(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

const handler = async (m, { text, conn, isOwner, participants, command }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  const isAuthorized = isOwner || global.lidOwners.includes(m.sender);
  if (!isAuthorized) return m.reply('⛔ *Solo los propietarios pueden usar este comando.*');

  const userId = m.sender;
  const chatId = m.chat;

  switch (command) {
  case 'createcode':
  case 'createadv':
    global.codeCreationSessions[userId] = {
      step: 'message_set',
      chatId,
      advanced: command === 'createadv'
    };
    return m.reply(`🚀 *¡Iniciando creador de comandos ${command === 'createadv' ? 'avanzado' : ''}!*

📝 *Paso 1:* Define el mensaje del comando
Usa: \`/setmessage tu mensaje aquí\``);

  case 'editcode':
    if (!text) {
      if (!Object.keys(global.savedCodes).length) return m.reply('⛔ *No hay comandos creados aún.*');
      let list = '*📋 Lista de comandos creados:*\n';
      for (let key in global.savedCodes) list += `- /${key}\n`;
      return m.reply(`${list}\n\n*Usa:* /editcode nombrecomando`);
    }
    const commandName = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!global.savedCodes[commandName]) return m.reply(`⛔ *El comando /${commandName} no existe.*`);

    const savedCommand = global.savedCodes[commandName];
    let editMenu = `🛠️ *Editando el comando /${commandName}*\n\n`;
    editMenu += `📝 *Mensaje actual:* "${savedCommand.message}"\n`;
    editMenu += `🏷️ *Etiqueta:* ${savedCommand.tagAll ? 'Todos' : savedCommand.tagUser ? 'Usuario' : 'Ninguna'}\n`;
    editMenu += `🖼️ *Imagen:* ${savedCommand.needsImage ? 'Sí' : 'No'}\n\n`;
    editMenu += '*¿Qué quieres editar?*\n';
    editMenu += `• /edit ${commandName} - Cambiar mensaje\n`;
    editMenu += `• /edittag ${commandName} - Cambiar etiqueta\n`;
    editMenu += `• /editimage ${commandName} - Cambiar imagen`;

    return m.reply(editMenu);

  case 'edit':
    if (!text) return m.reply('⛔ *Usa: /edit nombrecomando nuevo mensaje*');
    const parts = text.split(' ');
    const cmdName = parts[0];
    const newMessage = parts.slice(1).join(' ');
    if (!global.savedCodes[cmdName] || !newMessage) return m.reply('⛔ *Comando no encontrado o mensaje vacío.*');

    global.savedCodes[cmdName].message = newMessage;
    await regenerateCode(cmdName, m, conn, participants);
    return m.reply(`✅ *Mensaje del comando /${cmdName} actualizado y recargado exitosamente!*`);

  case 'edittag':
    if (!text) return m.reply('⛔ *Usa: /edittag nombrecomando tipo* (tipos: no, si, todos)');
    const tagParts = text.split(' ');
    const tagCmdName = tagParts[0];
    const tagType = tagParts[1]?.toLowerCase();
    if (!global.savedCodes[tagCmdName] || !tagType) return m.reply('⛔ *Comando no encontrado o tipo inválido.*');

    global.savedCodes[tagCmdName].tagAll = false;
    global.savedCodes[tagCmdName].tagUser = false;
    if (tagType === 'todos') global.savedCodes[tagCmdName].tagAll = true;
    else if (['si', 'sí', 's'].includes(tagType)) global.savedCodes[tagCmdName].tagUser = true;

    await regenerateCode(tagCmdName, m, conn, participants);
    return m.reply(`✅ *Etiqueta del comando /${tagCmdName} actualizada y recargada exitosamente!*`);

  case 'editimage':
    if (!text) return m.reply('⛔ *Usa: /editimage nombrecomando* y responde con una imagen, o /editimage nombrecomando remove');
    const imgParts = text.split(' ');
    const imgCmdName = imgParts[0];
    const imgAction = imgParts[1]?.toLowerCase();
    if (!global.savedCodes[imgCmdName]) return m.reply('⛔ *Comando no encontrado.*');

    if (imgAction === 'remove') {
      global.savedCodes[imgCmdName].needsImage = false;
      global.savedCodes[imgCmdName].imagePath = null;
      global.savedCodes[imgCmdName].imageName = null;
      await regenerateCode(imgCmdName, m, conn, participants);
      return m.reply(`✅ *Imagen del comando /${imgCmdName} eliminada y recargada exitosamente!*`);
    }

    if (!m.quoted || m.quoted.mtype !== 'imageMessage') return m.reply('⛔ *Debes responder a una imagen o usar "remove" para eliminarla.*');

    try {
      const imageDir = './codeimagenes';
      if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
      const media = await m.quoted.download();
      const imageName = `image_${Date.now()}.jpg`;
      const imagePath = path.join(imageDir, imageName);
      fs.writeFileSync(imagePath, media);

      global.savedCodes[imgCmdName].needsImage = true;
      global.savedCodes[imgCmdName].imagePath = imagePath;
      global.savedCodes[imgCmdName].imageName = imageName;

      await regenerateCode(imgCmdName, m, conn, participants);
      return m.reply(`✅ *Imagen del comando /${imgCmdName} actualizada y recargada exitosamente!*`);
    } catch {
      return m.reply('⛔ *Error al guardar la imagen.*');
    }

  case 'setmessage':
    if (!global.codeCreationSessions[userId]) return m.reply('⛔ *Primero usa /createcode o /editcode*');
    if (!text) return m.reply('⛔ *Debes escribir el mensaje.*');
    global.codeCreationSessions[userId].message = text;
    global.codeCreationSessions[userId].step = 'tag_set';
    return m.reply(`✅ *Mensaje guardado:*\n"${text}"\n\n🏷️ *Paso 2:* ¿Etiquetar al usuario o a todos?\nUsa: \`/settag si\`, \`/settag no\` o \`/settag todos\``);

  case 'settag':
    if (!global.codeCreationSessions[userId] || global.codeCreationSessions[userId].step !== 'tag_set')
      return m.reply('⛔ *Debes completar los pasos anteriores primero.*');
    if (!text) return m.reply('⛔ *Responde con si / no / todos*');

    const tagResponse = text.toLowerCase();
    global.codeCreationSessions[userId].tagAll = false;
    global.codeCreationSessions[userId].tagUser = false;
    if (tagResponse === 'todos') global.codeCreationSessions[userId].tagAll = true;
    else if (['si', 'sí', 's'].includes(tagResponse)) global.codeCreationSessions[userId].tagUser = true;

    global.codeCreationSessions[userId].step = 'image_set';
    return m.reply('✅ *Etiqueta configurada*\n\n🖼️ *Paso 3:* ¿Añadir imagen?\nUsa: `/setimage si` o `/setimage no`');

  case 'setimage':
    if (!global.codeCreationSessions[userId] || global.codeCreationSessions[userId].step !== 'image_set')
      return m.reply('⛔ *Debes completar los pasos anteriores primero.*');
    if (!text) return m.reply('⛔ *Responde con si o no.*');

    if (['si', 'sí', 's'].includes(text.toLowerCase())) {
      global.codeCreationSessions[userId].needsImage = true;
      global.codeCreationSessions[userId].step = 'upload_image';
      return m.reply('✅ *Imagen requerida activada*\n\n📸 *Paso 4:* Envía la imagen respondiendo con /uploadimage');
    } else {
      global.codeCreationSessions[userId].needsImage = false;
      global.codeCreationSessions[userId].step = 'command_set';
      return m.reply('✅ *Sin imagen configurado*\n\n⚡ *Paso 4:* Define el comando con /setcommand nombre');
    }

  case 'uploadimage':
    if (!global.codeCreationSessions[userId] || global.codeCreationSessions[userId].step !== 'upload_image')
      return m.reply('⛔ *Debes completar los pasos anteriores primero.*');
    if (!m.quoted || m.quoted.mtype !== 'imageMessage') return m.reply('⛔ *Debes responder a una imagen.*');
    try {
      const imageDir = './codeimagenes';
      if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
      const media = await m.quoted.download();
      const imageName = `image_${Date.now()}.jpg`;
      const imagePath = path.join(imageDir, imageName);
      fs.writeFileSync(imagePath, media);
      global.codeCreationSessions[userId].imagePath = imagePath;
      global.codeCreationSessions[userId].imageName = imageName;
      global.codeCreationSessions[userId].step = 'command_set';
      return m.reply('✅ *Imagen guardada*\n\n⚡ *Paso 5:* Define el comando con /setcommand nombre');
    } catch {
      return m.reply('⛔ *Error al guardar la imagen.*');
    }

  case 'setcommand':
    if (!global.codeCreationSessions[userId] || global.codeCreationSessions[userId].step !== 'command_set')
      return m.reply('⛔ *Debes completar los pasos anteriores primero.*');
    if (!text && !global.codeCreationSessions[userId].editing) return m.reply('⛔ *Debes escribir el nombre del comando.*');

    const finalName = global.codeCreationSessions[userId].editing
      ? global.codeCreationSessions[userId].commandName
      : text.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!finalName) return m.reply('⛔ *Nombre inválido.*');

    await generateCode(global.codeCreationSessions[userId], finalName, m, conn, participants);
    delete global.codeCreationSessions[userId];
    return;

  case 'cancelcode':
    if (global.codeCreationSessions[userId]) {
      delete global.codeCreationSessions[userId];
      return m.reply('⛔ *Proceso cancelado.*');
    } else return m.reply('⛔ *No hay proceso activo.*');
  }
};

async function generateCode(session, commandName, m, conn, participants) {
  const { message, tagUser, tagAll, needsImage, imagePath, imageName } = session;
  let code = 'import fs from \'fs\'\n\n';
  code += `const handler = async (m, { conn, participants }) => {
  let responseText = \`${escapeForTemplate(message)}\`\n`;
  if (tagUser) code += '  responseText = "@" + m.sender.split("@")[0] + "\\n" + responseText\n';
  if (tagAll) {
    code += '  let mentions = participants.map(p => p.id)\n';
    code += '  responseText = mentions.map(v => "@" + v.split("@")[0]).join(" ") + "\\n" + responseText\n';
  }
  if (needsImage && imagePath) {
    code += `  const imagePath = './codeimagenes/${imageName}'\n`;
    code += `  if (fs.existsSync(imagePath)) {
    const imageBuffer = fs.readFileSync(imagePath)
    await conn.sendMessage(m.chat, { image: imageBuffer, caption: responseText, mentions: ${tagAll ? 'participants.map(p => p.id)' : tagUser ? '[m.sender]' : '[]'} }, { quoted: m })
  } else {
    m.reply(responseText, null, { mentions: ${tagAll ? 'participants.map(p => p.id)' : tagUser ? '[m.sender]' : '[]'} })
  }`;
  } else {
    code += `  m.reply(responseText, null, { mentions: ${tagAll ? 'participants.map(p => p.id)' : tagUser ? '[m.sender]' : '[]'} })`;
  }
  code += `\n}\n\nhandler.help = ['${commandName}']\nhandler.tags = ['custom']\nhandler.command = /^${commandName}$/i\nexport default handler`;

  const customDir = './custom-commands';
  if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });
  const fileName = `${commandName}.js`;
  const filePath = `./custom-commands/${fileName}`;
  fs.writeFileSync(filePath, code);
  global.savedCodes[commandName] = session;

  try {
    delete global.plugins[`custom-commands/${commandName}.js`];
    const fullPath = path.resolve(filePath);
    const module = await import(`file://${fullPath}?t=${Date.now()}`);
    global.plugins[`custom-commands/${commandName}.js`] = module.default || module;

    if (global.customCommandsCache) {
      global.customCommandsCache.set(fileName, module.default || module);
    }
  } catch (e) {
    console.log('Error cargando comando:', e.message);
  }

  let msg = `✅ *¡Comando ${session.editing ? 'editado' : 'creado'} exitosamente!*\n📄 *Archivo:* ${fileName}\n⚡ *Comando:* /${commandName}`;
  if (tagAll) msg += '\n💥 *Etiqueta:* Todos';
  else if (tagUser) msg += '\n🏷️ *Etiqueta:* Usuario';

  msg += `\n\n✏️ *Si quieres editar este comando más tarde usa:* /editcode ${commandName}`;

  m.reply(msg);
}

async function regenerateCode(commandName, m, conn, participants) {
  const session = global.savedCodes[commandName];
  const { message, tagUser, tagAll, needsImage, imagePath, imageName } = session;

  const cacheKey = `custom-${commandName}.js`;
  if (global.customCommandsCache) {
    global.customCommandsCache.delete(cacheKey);
  }

  let code = 'import fs from \'fs\'\n\n';
  code += `const handler = async (m, { conn, participants }) => {
  let responseText = \`${escapeForTemplate(message)}\`\n`;
  if (tagUser) code += '  responseText = "@" + m.sender.split("@")[0] + "\\n" + responseText\n';
  if (tagAll) {
    code += '  let mentions = participants.map(p => p.id)\n';
    code += '  responseText = mentions.map(v => "@" + v.split("@")[0]).join(" ") + "\\n" + responseText\n';
  }
  if (needsImage && imagePath) {
    code += `  const imagePath = './codeimagenes/${imageName}'\n`;
    code += `  if (fs.existsSync(imagePath)) {
    const imageBuffer = fs.readFileSync(imagePath)
    await conn.sendMessage(m.chat, { image: imageBuffer, caption: responseText, mentions: ${tagAll ? 'participants.map(p => p.id)' : tagUser ? '[m.sender]' : '[]'} }, { quoted: m })
  } else {
    m.reply(responseText, null, { mentions: ${tagAll ? 'participants.map(p => p.id)' : tagUser ? '[m.sender]' : '[]'} })
  }`;
  } else {
    code += `  m.reply(responseText, null, { mentions: ${tagAll ? 'participants.map(p => p.id)' : tagUser ? '[m.sender]' : '[]'} })`;
  }
  code += `\n}\n\nhandler.help = ['${commandName}']\nhandler.tags = ['custom']\nhandler.command = /^${commandName}$/i\nexport default handler`;

  const customDir = './custom-commands';
  if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });
  const filePath = `./custom-commands/${commandName}.js`;
  fs.writeFileSync(filePath, code);

  try {
    delete global.plugins[`custom-commands/${commandName}.js`];
    const fullPath = path.resolve(filePath);
    const module = await import(`file://${fullPath}?t=${Date.now()}`);
    global.plugins[`custom-commands/${commandName}.js`] = module.default || module;

    if (global.customCommandsCache) {
      global.customCommandsCache.set(`${commandName}.js`, module.default || module);
    }
  } catch (e) {
    console.log('Error recargando comando:', e.message);
  }
}

handler.help = ['createcode', 'createadv', 'editcode', 'edit', 'edittag', 'editimage', 'setmessage', 'settag', 'setimage', 'uploadimage', 'setcommand', 'cancelcode'];
handler.tags = ['owner'];
handler.command = /^(createcode|createadv|editcode|edit|edittag|editimage|setmessage|settag|setimage|uploadimage|setcommand|cancelcode)$/i;
handler.owner = true;

export default handler;
