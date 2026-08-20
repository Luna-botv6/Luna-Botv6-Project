import { customCommandsStore } from '../lib/funcion/custom-commands-store.js';
import { customCommandsCodegen } from '../lib/funcion/custom-commands-codegen.js';
import fs from 'fs';
import path from 'path';

global.codeCreationSessions = global.codeCreationSessions || {};

const handler = async (m, { text, conn, isOwner, participants, command }) => {
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
      const lista = customCommandsStore.listar();
      if (!lista.length) return m.reply('⛔ *No hay comandos creados aún.*');
      let list = '*📋 Lista de comandos creados:*\n';
      for (const c of lista) list += `- /${c.nombre}\n`;
      return m.reply(`${list}\n\n*Usa:* /editcode nombrecomando`);
    }
    const commandName = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const savedCommand = customCommandsStore.obtener(commandName);
    if (!savedCommand) return m.reply(`⛔ *El comando /${commandName} no existe.*`);

    let editMenu = `🛠️ *Editando el comando /${commandName}*\n\n`;
    editMenu += `📝 *Mensaje actual:* "${savedCommand.message}"\n`;
    editMenu += `🏷️ *Etiqueta:* ${savedCommand.tagAll ? 'Todos' : savedCommand.tagUser ? 'Usuario' : 'Ninguna'}\n`;
    editMenu += `🖼️ *Imagen:* ${savedCommand.needsImage ? 'Sí' : 'No'}\n\n`;
    editMenu += '*¿Qué quieres editar?*\n';
    editMenu += `• /edit ${commandName} - Cambiar mensaje\n`;
    editMenu += `• /edittag ${commandName} - Cambiar etiqueta\n`;
    editMenu += `• /editimage ${commandName} - Cambiar imagen`;

    return m.reply(editMenu);

  case 'edit': {
    if (!text) return m.reply('⛔ *Usa: /edit nombrecomando nuevo mensaje*');
    const parts = text.split(' ');
    const cmdName = parts[0];
    const newMessage = parts.slice(1).join(' ');
    const existente = customCommandsStore.obtener(cmdName);
    if (!existente || !newMessage) return m.reply('⛔ *Comando no encontrado o mensaje vacío.*');

    const sesion = { ...existente, message: newMessage };
    await customCommandsCodegen.generarOActualizarComando(cmdName, sesion);
    return m.reply(`✅ *Mensaje del comando /${cmdName} actualizado y recargado exitosamente!*`);
  }

  case 'edittag': {
    if (!text) return m.reply('⛔ *Usa: /edittag nombrecomando tipo* (tipos: no, si, todos)');
    const tagParts = text.split(' ');
    const tagCmdName = tagParts[0];
    const tagType = tagParts[1]?.toLowerCase();
    const existente = customCommandsStore.obtener(tagCmdName);
    if (!existente || !tagType) return m.reply('⛔ *Comando no encontrado o tipo inválido.*');

    const sesion = { ...existente, tagAll: false, tagUser: false };
    if (tagType === 'todos') sesion.tagAll = true;
    else if (['si', 'sí', 's'].includes(tagType)) sesion.tagUser = true;

    await customCommandsCodegen.generarOActualizarComando(tagCmdName, sesion);
    return m.reply(`✅ *Etiqueta del comando /${tagCmdName} actualizada y recargada exitosamente!*`);
  }

  case 'editimage': {
    if (!text) return m.reply('⛔ *Usa: /editimage nombrecomando* y responde con una imagen, o /editimage nombrecomando remove');
    const imgParts = text.split(' ');
    const imgCmdName = imgParts[0];
    const imgAction = imgParts[1]?.toLowerCase();
    const existente = customCommandsStore.obtener(imgCmdName);
    if (!existente) return m.reply('⛔ *Comando no encontrado.*');

    if (imgAction === 'remove') {
      if (existente.imagePath && fs.existsSync(existente.imagePath)) {
        try { fs.unlinkSync(existente.imagePath); } catch {}
      }
      const sesion = { ...existente, needsImage: false, imagePath: null, imageName: null };
      await customCommandsCodegen.generarOActualizarComando(imgCmdName, sesion);
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

      if (existente.imagePath && fs.existsSync(existente.imagePath)) {
        try { fs.unlinkSync(existente.imagePath); } catch {}
      }

      const sesion = { ...existente, needsImage: true, imagePath, imageName };
      await customCommandsCodegen.generarOActualizarComando(imgCmdName, sesion);
      return m.reply(`✅ *Imagen del comando /${imgCmdName} actualizada y recargada exitosamente!*`);
    } catch {
      return m.reply('⛔ *Error al guardar la imagen.*');
    }
  }

  case 'setmessage':
    if (!global.codeCreationSessions[userId]) return m.reply('⛔ *Primero usa /createcode o /editcode*');
    if (!text) return m.reply('⛔ *Debes escribir el mensaje.*');
    global.codeCreationSessions[userId].message = text;
    global.codeCreationSessions[userId].step = 'tag_set';
    return m.reply(`✅ *Mensaje guardado:*\n"${text}"\n\n🏷️ *Paso 2:* ¿Etiquetar al usuario o a todos?\nUsa: \`/setctag si\`, \`/setctag no\` o \`/setctag todos\``);

  case 'setctag':
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

  case 'setcommand': {
    const sesionActual = global.codeCreationSessions[userId];
    if (!sesionActual || sesionActual.step !== 'command_set')
      return m.reply('⛔ *Debes completar los pasos anteriores primero.*');
    if (!text && !sesionActual.editing) return m.reply('⛔ *Debes escribir el nombre del comando.*');

    const finalName = sesionActual.editing
      ? sesionActual.commandName
      : text.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!finalName) return m.reply('⛔ *Nombre inválido.*');

    const yaExiste = customCommandsStore.obtener(finalName);
    if (!yaExiste) {
      const colision = customCommandsCodegen.nombreColisiona(finalName);
      if (colision) {
        delete global.codeCreationSessions[userId];
        return m.reply(`⛔ *El nombre "${finalName}" ya lo usa otro comando del bot.*\nProbá con otro nombre distinto.`);
      }
    }

    await customCommandsCodegen.generarOActualizarComando(finalName, sesionActual);
    delete global.codeCreationSessions[userId];

    let msg = `✅ *¡Comando ${yaExiste ? 'editado' : 'creado'} exitosamente!*\n📄 *Archivo:* ${finalName}.js\n⚡ *Comando:* /${finalName}`;
    if (sesionActual.tagAll) msg += '\n💥 *Etiqueta:* Todos';
    else if (sesionActual.tagUser) msg += '\n🏷️ *Etiqueta:* Usuario';
    msg += `\n\n✏️ *Si quieres editar este comando más tarde usa:* /editcode ${finalName}`;

    return m.reply(msg);
  }

  case 'cancelcode':
    if (global.codeCreationSessions[userId]) {
      delete global.codeCreationSessions[userId];
      return m.reply('⛔ *Proceso cancelado.*');
    } else return m.reply('⛔ *No hay proceso activo.*');
  }
};

handler.help = ['createcode', 'createadv', 'editcode', 'edit', 'edittag', 'editimage', 'setmessage', 'setctag', 'setimage', 'uploadimage', 'setcommand', 'cancelcode'];
handler.tags = ['owner'];
handler.command = /^(createcode|createadv|editcode|edit|edittag|editimage|setmessage|setctag|setimage|uploadimage|setcommand|cancelcode)$/i;
handler.owner = true;

export default handler;
