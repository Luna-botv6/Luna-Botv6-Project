import fs from 'fs'
import { setUserStats } from '../lib/stats.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const datas = global
    const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
    
    let tradutor = {}
    try {
        const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
        tradutor = _translate.plugins.owner_restoreuser || {}
    } catch (error) {
        console.error('Error cargando traducción:', error)
        tradutor = {}
    }

    // Cooldown para evitar spam (10 minutos para restauración)
    const cooldownTime = 600000 // 10 minutos
    const lastUsed = global.db.data.users[m.sender].lastRestoreUser || 0
    const now = Date.now()
    
    if (now - lastUsed < cooldownTime) {
        const remainingTime = Math.ceil((cooldownTime - (now - lastUsed)) / 1000)
        const minutes = Math.floor(remainingTime / 60)
        const seconds = remainingTime % 60
        return conn.sendMessage(m.chat, { 
            text: `⏰ *Espera ${minutes}m ${seconds}s antes de usar este comando nuevamente.*` 
        }, { quoted: m })
    }

    const numberPattern = /\d+/g
    let user = ''
    let userNumber = ''

    // Obtener usuario del texto o mensaje citado
    const numberMatches = text?.match(numberPattern)
    if (numberMatches) {
        const number = numberMatches.join('')
        if (number.length >= 10) {
            user = number + '@s.whatsapp.net'
            userNumber = number
        } else {
            return conn.sendMessage(m.chat, { 
                text: `❌ *Número inválido.* Usa: ${usedPrefix}${command} <número>` 
            }, { quoted: m })
        }
    } else if (m.quoted && m.quoted.sender) {
        const quotedNumberMatches = m.quoted.sender.match(numberPattern)
        if (quotedNumberMatches) {
            const number = quotedNumberMatches.join('')
            user = number + '@s.whatsapp.net'
            userNumber = number
        } else {
            return conn.sendMessage(m.chat, { 
                text: `❌ *Error:* Cita un mensaje del usuario o proporciona su número.` 
            }, { quoted: m })
        }
    } else {
        return conn.sendMessage(m.chat, { 
            text: `📋 *Uso:* ${usedPrefix}${command} <número>\n*Ejemplo:* ${usedPrefix}${command} 1234567890\n\n💡 *Este comando restaura los datos de un usuario previamente reseteado.*` 
        }, { quoted: m })
    }

    // Verificar si existe un backup para este usuario
    if (!global.db.data.backups || !global.db.data.backups[user]) {
        return conn.sendMessage(m.chat, { 
            text: `❌ *No hay backup disponible para @${userNumber}*\n\n• El usuario no ha sido reseteado recientemente\n• O el backup ha expirado (>24h)`,
            mentions: [user] 
        }, { quoted: m })
    }

    const backup = global.db.data.backups[user]

    // Verificar si el backup no ha expirado (24 horas)
    if (now > backup.expiresAt) {
        delete global.db.data.backups[user]
        return conn.sendMessage(m.chat, { 
            text: `⏰ *El backup de @${userNumber} ha expirado*\n\n• Los backups son válidos por 24 horas\n• Este backup expiró el: ${new Date(backup.expiresAt).toLocaleString()}`,
            mentions: [user] 
        }, { quoted: m })
    }

    // Mostrar información del backup
    const backupInfo = backup.previousStats
    const timeRemaining = Math.ceil((backup.expiresAt - now) / (1000 * 60 * 60)) // horas restantes
    
    await conn.sendMessage(m.chat, {
        text: `🔄 *¿Restaurar datos de @${userNumber}?*\n\n` +
              `📊 *DATOS A RESTAURAR:*\n` +
              `• Experiencia: ${backupInfo.exp.toLocaleString()}\n` +
              `• Nivel: ${backupInfo.level}\n` +
              `• Dinero: ${backupInfo.money.toLocaleString()}\n` +
              `• Monedas místicas: ${backupInfo.mysticcoins.toLocaleString()}\n` +
              `• Luna Coins: ${backupInfo.lunaCoins.toLocaleString()}\n` +
              `• Rol: ${backupInfo.role}\n\n` +
              `⏰ *INFORMACIÓN DEL BACKUP:*\n` +
              `• Reseteado por: @${backup.resetBy.split('@')[0]}\n` +
              `• Fecha de reset: ${new Date(backup.resetDate).toLocaleString()}\n` +
              `• Expira en: ${timeRemaining} horas\n\n` +
              `*Responde con "restaurar" para confirmar o "cancelar" para cancelar.*`,
        mentions: [user, backup.resetBy]
    }, { quoted: m })

    // Esperar confirmación con timeout más largo
    const confirmation = await waitForUserResponse(conn, m.chat, m.sender, 45000)
    
    if (!confirmation || !['restaurar', 'restore', 'confirmar', 'sí', 'si'].includes(confirmation.toLowerCase())) {
        return conn.sendMessage(m.chat, { 
            text: `❌ *Restauración cancelada.*` 
        }, { quoted: m })
    }

    try {
        // Restaurar datos del usuario
        setUserStats(user, backupInfo)

        // Actualizar cooldown
        global.db.data.users[m.sender].lastRestoreUser = now

        // Eliminar backup usado
        delete global.db.data.backups[user]

        // Mensaje de éxito
        const successMessage = 
            `✅ *¡Datos restaurados exitosamente para @${userNumber}!*\n\n` +
            
            `📊 *DATOS RESTAURADOS:*\n` +
            `• Experiencia: ${backupInfo.exp.toLocaleString()}\n` +
            `• Nivel: ${backupInfo.level}\n` +
            `• Dinero: ${backupInfo.money.toLocaleString()}\n` +
            `• Monedas místicas: ${backupInfo.mysticcoins.toLocaleString()}\n` +
            `• Luna Coins: ${backupInfo.lunaCoins.toLocaleString()}\n` +
            `• Rol: ${backupInfo.role}\n\n` +
            
            `🎉 *El usuario ha recuperado todos sus datos anteriores*\n` +
            `⚠️ *El backup ha sido eliminado (uso único)*`

        await conn.sendMessage(m.chat, { 
            text: successMessage,
            mentions: [user] 
        }, { quoted: m })

        // Log de la acción para auditoría
        console.log(`[RESTORE USER] ${m.sender} restauró los datos de ${user} - ${new Date().toISOString()}`)

    } catch (error) {
        console.error('Error al restaurar usuario:', error)
        await conn.sendMessage(m.chat, { 
            text: `❌ *Error al restaurar los datos del usuario.* Inténtalo nuevamente.` 
        }, { quoted: m })
    }
}

// Función auxiliar para esperar respuesta del usuario
const waitForUserResponse = async (conn, chatId, senderId, timeout = 45000) => {
    return new Promise((resolve) => {
        const responseHandler = (update) => {
            try {
                // Verificar si es el mensaje correcto
                if (update.messages && update.messages.length > 0) {
                    const message = update.messages[0]
                    if (message.key.remoteJid === chatId && 
                        message.key.participant === senderId && 
                        message.message) {
                        
                        const text = message.message.conversation || 
                                   message.message.extendedTextMessage?.text || ''
                        
                        conn.ev.off('messages.upsert', responseHandler)
                        resolve(text.trim())
                    }
                }
            } catch (error) {
                console.error('Error en responseHandler:', error)
            }
        }

        conn.ev.on('messages.upsert', responseHandler)
        
        // Timeout para evitar esperas infinitas
        setTimeout(() => {
            conn.ev.off('messages.upsert', responseHandler)
            resolve(null)
        }, timeout)
    })
}

handler.tags = ['owner']
handler.command = /(restoreuser|restaurardatos|restaurarusuario)$/i
handler.rowner = true
handler.group = false
handler.private = false

export default handler