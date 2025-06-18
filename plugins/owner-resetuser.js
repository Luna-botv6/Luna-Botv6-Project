import fs from 'fs'
import { getUserStats, setUserStats } from '../lib/stats.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const datas = global
    const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
    const tradutor = _translate.plugins.owner_resetuser

    // Cooldown para evitar spam (5 minutos)
    const cooldownTime = 300000 // 5 minutos en lugar de 30 segundos
    const lastUsed = global.db.data.users[m.sender].lastResetUser || 0
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
        if (number.length >= 10) { // Validar que sea un número válido
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
                text: tradutor.texto1 || `❌ *Error:* Cita un mensaje del usuario o proporciona su número.` 
            }, { quoted: m })
        }
    } else {
        return conn.sendMessage(m.chat, { 
            text: tradutor.texto2 || `📋 *Uso:* ${usedPrefix}${command} <número>\n*Ejemplo:* ${usedPrefix}${command} 1234567890` 
        }, { quoted: m })
    }

    // Verificar si el usuario existe en la base de datos
    const currentStats = getUserStats(user)
    if (!currentStats || (currentStats.exp === 0 && currentStats.level === 0 && currentStats.money === 0)) {
        return conn.sendMessage(m.chat, { 
            text: tradutor.texto3?.[0] 
                ? `${tradutor.texto3[0]} @${userNumber} ${tradutor.texto3[1]}` 
                : `❌ El usuario @${userNumber} no tiene datos registrados.`,
            mentions: [user] 
        }, { quoted: m })
    }

    // Confirmar acción antes de proceder
    const confirmationMsg = await conn.sendMessage(m.chat, {
        text: `⚠️ *¿Estás seguro de resetear todos los datos de @${userNumber}?*\n\n` +
              `📊 *Datos actuales:*\n` +
              `• Experiencia: ${currentStats.exp}\n` +
              `• Nivel: ${currentStats.level}\n` +
              `• Dinero: ${currentStats.money}\n` +
              `• Monedas místicas: ${currentStats.mysticcoins}\n` +
              `• Luna Coins: ${currentStats.lunaCoins}\n\n` +
              `*Responde con "sí" para confirmar o "no" para cancelar.*`,
        mentions: [user]
    }, { quoted: m })

    // Esperar confirmación con timeout más largo
    const confirmation = await waitForUserResponse(conn, m.chat, m.sender, 30000)
    
    if (!confirmation || !['sí', 'si', 'yes', 'confirmar'].includes(confirmation.toLowerCase())) {
        return conn.sendMessage(m.chat, { 
            text: `❌ *Operación cancelada.*` 
        }, { quoted: m })
    }

    try {
        // Guardar datos anteriores para mostrar lo que se perdió
        const previousStats = {
            exp: currentStats.exp,
            level: currentStats.level,
            money: currentStats.money,
            joincount: currentStats.joincount,
            premiumTime: currentStats.premiumTime,
            mysticcoins: currentStats.mysticcoins,
            lunaCoins: currentStats.lunaCoins,
            role: currentStats.role,
            limit: currentStats.limit
        }

        // Crear backup para posible restauración (válido por 24 horas)
        const backupData = {
            userId: user,
            userNumber: userNumber,
            previousStats: previousStats,
            resetBy: m.sender,
            resetDate: now,
            expiresAt: now + (24 * 60 * 60 * 1000) // 24 horas
        }

        // Guardar backup en base de datos global
        if (!global.db.data.backups) global.db.data.backups = {}
        global.db.data.backups[user] = backupData

        // Resetear datos del usuario usando stats.js
        const resetData = {
            exp: 0,
            level: 0,
            money: 0,
            joincount: 0,
            premiumTime: 0,
            mysticcoins: 0,
            lunaCoins: 0,
            role: '🧰 Novato',
            limit: 10
        }

        setUserStats(user, resetData)

        // También limpiar datos del sistema global si existen
        if (global.db.data.users[user]) {
            const essentialData = {
                language: global.db.data.users[user].language || global.defaultLenguaje,
                banned: global.db.data.users[user].banned || false,
                premium: global.db.data.users[user].premium || false,
                lastResetUser: 0
            }
            global.db.data.users[user] = essentialData
        }

        // Actualizar cooldown
        global.db.data.users[m.sender].lastResetUser = now

        // Calcular pérdidas
        const losses = {
            exp: previousStats.exp - 0,
            level: previousStats.level - 0,
            money: previousStats.money - 0,
            mysticcoins: previousStats.mysticcoins - 0,
            lunaCoins: previousStats.lunaCoins - 0
        }

        // Mensaje de éxito detallado
        const successMessage = tradutor.texto4?.[0] 
            ? `${tradutor.texto4[0]} @${userNumber} ${tradutor.texto4[1]}\n\n` 
            : `✅ *Datos reseteados exitosamente para @${userNumber}*\n\n`

        const statsMessage = 
            `📊 *DATOS ANTERIORES:*\n` +
            `• Experiencia: ${previousStats.exp.toLocaleString()}\n` +
            `• Nivel: ${previousStats.level}\n` +
            `• Dinero: ${previousStats.money.toLocaleString()}\n` +
            `• Monedas místicas: ${previousStats.mysticcoins.toLocaleString()}\n` +
            `• Luna Coins: ${previousStats.lunaCoins.toLocaleString()}\n` +
            `• Rol: ${previousStats.role}\n\n` +
            
            `💥 *PÉRDIDAS TOTALES:*\n` +
            `• Experiencia perdida: -${losses.exp.toLocaleString()}\n` +
            `• Niveles perdidos: -${losses.level}\n` +
            `• Dinero perdido: -${losses.money.toLocaleString()}\n` +
            `• Monedas místicas perdidas: -${losses.mysticcoins.toLocaleString()}\n` +
            `• Luna Coins perdidas: -${losses.lunaCoins.toLocaleString()}\n\n` +
            
            `🆕 *DATOS ACTUALES:*\n` +
            `• Experiencia: 0\n` +
            `• Nivel: 0\n` +
            `• Dinero: 0\n` +
            `• Monedas místicas: 0\n` +
            `• Luna Coins: 0\n` +
            `• Rol: 🧰 Novato`

        await conn.sendMessage(m.chat, { 
            text: successMessage + statsMessage + `\n\n🔄 *RESTAURACIÓN DISPONIBLE:*\n• Usa \`${usedPrefix}restoreuser @${userNumber}\` para restaurar datos\n• Backup válido por 24 horas\n• Solo el owner puede restaurar`,
            mentions: [user] 
        }, { quoted: m })

        // Log de la acción para auditoría
        console.log(`[RESET USER] ${m.sender} reseteó los datos de ${user} - ${new Date().toISOString()}`)

    } catch (error) {
        console.error('Error al resetear usuario:', error)
        await conn.sendMessage(m.chat, { 
            text: `❌ *Error al resetear los datos del usuario.* Inténtalo nuevamente.` 
        }, { quoted: m })
    }
}

// Función auxiliar para esperar respuesta del usuario
const waitForUserResponse = async (conn, chatId, senderId, timeout = 30000) => {
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
handler.command = /(restablecerdatos|deletedatauser|resetuser)$/i
handler.rowner = true
handler.group = false
handler.private = false

export default handler