import fs from 'fs'
import { loadAFK, saveAFK } from '../lib/afkDB.js'

export function before(m) {
  // Evitar que se ejecute si el mensaje viene del bot
  if (m.fromMe) return true

  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.afk__afk

  const afk = loadAFK()

  // Verificar si el usuario que envía el mensaje está AFK
  if (afk[m.sender]) {
    const userAfk = afk[m.sender]
    m.reply(` ${tradutor.texto2[0]} ${userAfk.reason ? `${tradutor.texto2[1]}` + userAfk.reason : ''}*

*${tradutor.texto2[2]} ${(new Date - userAfk.lastseen).toTimeString()}*`)
    
    delete afk[m.sender]
    saveAFK(afk)
  }

  // Lista de comandos que pueden ejecutarse antes de mostrar el mensaje AFK
  const allowedCommandsBeforeAFK = ['robar', 'robard', '/robar', '/robard']
  
  // Verificar si el comando actual está en la lista de comandos permitidos
  const currentCommand = m.text?.toLowerCase().split(' ')[0]
  const isAllowedCommand = allowedCommandsBeforeAFK.includes(currentCommand)

  const jids = [...new Set([...(m.mentionedJid || []), ...(m.quoted ? [m.quoted.sender] : [])])]
  
  // Evitar que el remitente mismo esté en la lista de destinatarios
  const destinatarios = jids.filter(jid => jid !== m.sender)

  if (isAllowedCommand) {
    // Para comandos permitidos, guardamos la información AFK para mostrarla después
    const afkUsers = []
    
    for (const jid of destinatarios) {
      if (afk[jid]) {
        const target = afk[jid]
        const reason = target.reason || ''
        afkUsers.push({
          jid,
          reason,
          lastseen: target.lastseen
        })
      }
    }
    
    // Guardamos la información AFK en el objeto del mensaje para uso posterior
    if (afkUsers.length > 0) {
      m.afkUsers = afkUsers
    }
    
    // Continuamos con el procesamiento normal del comando
    return true
  } else {
    // Para otros comandos, mostramos el mensaje AFK inmediatamente (solo una vez)
    const processedJids = new Set()
    
    for (const jid of destinatarios) {
      if (afk[jid] && !processedJids.has(jid)) {
        processedJids.add(jid)
        const target = afk[jid]
        const reason = target.reason || ''
        m.reply(`${tradutor.texto1[0]}

*—◉ ${tradutor.texto1[1]}*      
*—◉ ${reason ? `${tradutor.texto1[2]}` + reason : `${tradutor.texto1[3]}`}*
*—◉ ${tradutor.texto1[4]} ${(new Date - target.lastseen).toTimeString()}*`)
      }
    }
  }

  return true
}