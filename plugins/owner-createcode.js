import fs from 'fs'
import path from 'path'

global.codeCreationSessions = global.codeCreationSessions || {}
global.savedCodes = global.savedCodes || {}

const handler = async (m, { text, conn, isOwner, participants, command }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const isAuthorized = isOwner || global.lidOwners.includes(m.sender)
  if (!isAuthorized) return m.reply('⛔ *Solo los propietarios pueden usar este comando.*')

  const userId = m.sender
  const chatId = m.chat

  switch (command) {
    case 'createcode':
    case 'createadv':
      global.codeCreationSessions[userId] = {
        step: 'message_set',
        chatId,
        advanced: command === 'createadv'
      }
      return m.reply(`🚀 *¡Iniciando creador de comandos ${command === 'createadv' ? 'avanzado' : ''}!*

📝 *Paso 1:* Define el mensaje del comando
Usa: \`/setmessage tu mensaje aquí\``)

    case 'editcode':
      if (!text) {
        if (!Object.keys(global.savedCodes).length) return m.reply('⛔ *No hay comandos creados aún.*')
        let list = '*📋 Lista de comandos creados:*\n'
        for (let key in global.savedCodes) list += `- /${key}\n`
        return m.reply(`${list}\n\n*Usa:* /editcode nombrecomando`)
      }
      const commandName = text.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!global.savedCodes[commandName]) return m.reply(`⛔ *El comando /${commandName} no existe.*`)
      global.codeCreationSessions[userId] = {
        ...global.savedCodes[commandName],
        step: 'message_set',
        chatId,
        editing: true,
        commandName
      }
      return m.reply(`🛠️ *Editando el comando /${commandName}*

Mensaje actual: "${global.savedCodes[commandName].message}"

👉 *Paso 1:* Define el nuevo mensaje con:
\`/setmessage tu mensaje\``)

    case 'setmessage':
      if (!global.codeCreationSessions[userId]) return m.reply('⛔ *Primero usa /createcode o /editcode*')
      if (!text) return m.reply('⛔ *Debes escribir el mensaje.*')
      global.codeCreationSessions[userId].message = text
      global.codeCreationSessions[userId].step = 'tag_set'
      return m.reply(`✅ *Mensaje guardado:*\n"${text}"\n\n🏷️ *Paso 2:* ¿Etiquetar al usuario o a todos?\nUsa: \`/settag si\`, \`/settag no\` o \`/settag todos\``)

    case 'settag':
      if (!global.codeCreationSessions[userId] || global.codeCreationSessions[userId].step !== 'tag_set')
        return m.reply('⛔ *Debes completar los pasos anteriores primero.*')
      if (!text) return m.reply('⛔ *Responde con si / no / todos*')

      const tagResponse = text.toLowerCase()
      global.codeCreationSessions[userId].tagAll = false
      global.codeCreationSessions[userId].tagUser = false
      if (tagResponse === 'todos') global.codeCreationSessions[userId].tagAll = true
      else if (['si', 'sí', 's'].includes(tagResponse)) global.codeCreationSessions[userId].tagUser = true

      global.codeCreationSessions[userId].step = 'image_set'
      return m.reply(`✅ *Etiqueta configurada*\n\n🖼️ *Paso 3:* ¿Añadir imagen?\nUsa: \`/setimage si\` o \`/setimage no\``)

    case 'setimage':
      if (!global.codeCreationSessions[userId] || global.codeCreationSessions[userId].step !== 'image_set')
        return m.reply('⛔ *Debes completar los pasos anteriores primero.*')
      if (!text) return m.reply('⛔ *Responde con si o no.*')

      if (['si', 'sí', 's'].includes(text.toLowerCase())) {
        global.codeCreationSessions[userId].needsImage = true
        global.codeCreationSessions[userId].step = 'upload_image'
        return m.reply(`✅ *Imagen requerida activada*\n\n📸 *Paso 4:* Envía la imagen respondiendo con /uploadimage`)
      } else {
        global.codeCreationSessions[userId].needsImage = false
        global.codeCreationSessions[userId].step = 'command_set'
        return m.reply(`✅ *Sin imagen configurado*\n\n⚡ *Paso 4:* Define el comando con /setcommand nombre`)
      }

    case 'uploadimage':
      if (!global.codeCreationSessions[userId] || global.codeCreationSessions[userId].step !== 'upload_image')
        return m.reply('⛔ *Debes completar los pasos anteriores primero.*')
      if (!m.quoted || m.quoted.mtype !== 'imageMessage') return m.reply('⛔ *Debes responder a una imagen.*')
      try {
        const imageDir = './codeimagenes'
        if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true })
        const media = await m.quoted.download()
        const imageName = `image_${Date.now()}.jpg`
        const imagePath = path.join(imageDir, imageName)
        fs.writeFileSync(imagePath, media)
        global.codeCreationSessions[userId].imagePath = imagePath
        global.codeCreationSessions[userId].imageName = imageName
        global.codeCreationSessions[userId].step = 'command_set'
        return m.reply(`✅ *Imagen guardada*\n\n⚡ *Paso 5:* Define el comando con /setcommand nombre`)
      } catch {
        return m.reply('⛔ *Error al guardar la imagen.*')
      }

    case 'setcommand':
      if (!global.codeCreationSessions[userId] || global.codeCreationSessions[userId].step !== 'command_set')
        return m.reply('⛔ *Debes completar los pasos anteriores primero.*')
      if (!text && !global.codeCreationSessions[userId].editing) return m.reply('⛔ *Debes escribir el nombre del comando.*')

      const finalName = global.codeCreationSessions[userId].editing
        ? global.codeCreationSessions[userId].commandName
        : text.toLowerCase().replace(/[^a-z0-9]/g, '')

      if (!finalName) return m.reply('⛔ *Nombre inválido.*')

      await generateCode(global.codeCreationSessions[userId], finalName, m, conn, participants)
      delete global.codeCreationSessions[userId]
      return

    case 'cancelcode':
      if (global.codeCreationSessions[userId]) {
        delete global.codeCreationSessions[userId]
        return m.reply('⛔ *Proceso cancelado.*')
      } else return m.reply('⛔ *No hay proceso activo.*')
  }
}

async function generateCode(session, commandName, m, conn, participants) {
  const { message, tagUser, tagAll, needsImage, imagePath, imageName } = session
  let code = `import fs from 'fs'\n\n`
  code += `const handler = async (m, { conn, participants }) => {
  let responseText = \`${message}\`\n`
  if (tagUser) code += `  responseText = "@" + m.sender.split("@")[0] + "\\n" + responseText\n`
  if (tagAll) {
    code += `  let mentions = participants.map(p => p.id)\n`
    code += `  responseText = mentions.map(v => "@" + v.split("@")[0]).join(" ") + "\\n" + responseText\n`
  }
  if (needsImage && imagePath) {
    code += `  const imagePath = './codeimagenes/${imageName}'\n`
    code += `  if (fs.existsSync(imagePath)) {
    const imageBuffer = fs.readFileSync(imagePath)
    await conn.sendMessage(m.chat, { image: imageBuffer, caption: responseText, mentions: ${tagAll ? 'participants.map(p => p.id)' : tagUser ? '[m.sender]' : '[]'} }, { quoted: m })
  } else {
    m.reply(responseText, null, { mentions: ${tagAll ? 'participants.map(p => p.id)' : tagUser ? '[m.sender]' : '[]'} })
  }`
  } else {
    code += `  m.reply(responseText, null, { mentions: ${tagAll ? 'participants.map(p => p.id)' : tagUser ? '[m.sender]' : '[]'} })`
  }
  code += `\n}\n\nhandler.help = ['${commandName}']\nhandler.tags = ['custom']\nhandler.command = /^${commandName}$/i\nexport default handler`

  const customDir = './custom-commands'
  if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true })
  const fileName = `${commandName}.js`
  const filePath = `./custom-commands/${fileName}`
  fs.writeFileSync(filePath, code)
  global.savedCodes[commandName] = session

  let msg = `✅ *¡Comando ${session.editing ? 'editado' : 'creado'} exitosamente!*\n📄 *Archivo:* ${fileName}\n⚡ *Comando:* /${commandName}`
  if (tagAll) msg += `\n👥 *Etiqueta:* Todos`
  else if (tagUser) msg += `\n🏷️ *Etiqueta:* Usuario`

  msg += `\n\n✏️ *Si quieres editar este comando más tarde usa:* /editcode ${commandName}`

  m.reply(msg)
}

handler.help = ['createcode', 'createadv', 'editcode', 'setmessage', 'settag', 'setimage', 'uploadimage', 'setcommand', 'cancelcode']
handler.tags = ['owner']
handler.command = /^(createcode|createadv|editcode|setmessage|settag|setimage|uploadimage|setcommand|cancelcode)$/i
handler.owner = true

export default handler