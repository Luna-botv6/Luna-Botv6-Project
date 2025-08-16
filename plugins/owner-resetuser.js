import fs from 'fs'
import { getUserStats, setUserStats } from '../lib/stats.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const datas = global
    const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
    const tradutor = _translate.plugins.owner_resetuser

    // Cooldown para evitar spam (5 minutos)
    const cooldownTime = 300000 // 5 minutos
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

    let user = ''
    let userNumber = ''
    let originalMention = ''

    // ✅ SOLUCIÓN: Procesar menciones correctamente
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        // Usar la primera mención
        const mentionedUser = m.mentionedJid[0]
        user = conn.decodeJid(mentionedUser)
        
        // Si es LID, convertir a formato @s.whatsapp.net
        if (user.includes('@lid')) {
            // Buscar en el cache LID -> JID
            const lidToJidCache = global.lidToJidCache || new Map()
            const realJid = lidToJidCache.get(user)
            
            if (realJid) {
                user = realJid
            } else {
                // Si no está en cache, extraer número del LID
                const lidNumber = user.split('@')[0]
                user = lidNumber + '@s.whatsapp.net'
            }
        }
        
        userNumber = user.split('@')[0]
        originalMention = mentionedUser // Guardar mención original para mostrar
    } 
    // Fallback: buscar números en el texto
    else if (text) {
        const numberPattern = /\d+/g
        const numberMatches = text.match(numberPattern)
        if (numberMatches) {
            const number = numberMatches.join('')
            if (number.length >= 10) {
                user = number + '@s.whatsapp.net'
                userNumber = number
                originalMention = user
            } else {
                return conn.sendMessage(m.chat, { 
                    text: `❌ *Número inválido.* Usa: ${usedPrefix}${command} <número>` 
                }, { quoted: m })
            }
        }
    }
    // Fallback: mensaje citado
    else if (m.quoted && m.quoted.sender) {
        user = conn.decodeJid(m.quoted.sender)
        
        // Si es LID, convertir igual que arriba
        if (user.includes('@lid')) {
            const lidToJidCache = global.lidToJidCache || new Map()
            const realJid = lidToJidCache.get(user)
            
            if (realJid) {
                user = realJid
            } else {
                const lidNumber = user.split('@')[0]
                user = lidNumber + '@s.whatsapp.net'
            }
        }
        
        userNumber = user.split('@')[0]
        originalMention = m.quoted.sender
    } 
    else {
        return conn.sendMessage(m.chat, { 
            text: tradutor.texto2 || `📋 *Uso:* ${usedPrefix}${command} <@usuario>\n*Ejemplo:* ${usedPrefix}${command} @usuario` 
        }, { quoted: m })
    }

    console.log(`[DEBUG] User procesado: ${user}`) // Debug

    // ✅ Verificar si el usuario existe en CUALQUIER formato
    let currentStats = getUserStats(user)
    
    // Si no encuentra con @s.whatsapp.net, buscar otras variantes
    if (!currentStats || (currentStats.exp === 0 && currentStats.level === 0 && currentStats.money === 0)) {
        // Buscar en la base de datos global también
        const globalUser = global.db.data.users[user]
        
        // Si no existe en ningún formato, buscar por número sin @
        if (!globalUser) {
            const possibleJids = [
                userNumber + '@s.whatsapp.net',
                userNumber + '@c.us',
                userNumber + '@lid'
            ]
            
            let found = false
            for (const jid of possibleJids) {
                const testStats = getUserStats(jid)
                if (testStats && (testStats.exp > 0 || testStats.level > 0 || testStats.money > 0)) {
                    user = jid
                    currentStats = testStats
                    found = true
                    break
                }
            }
            
            if (!found) {
                return conn.sendMessage(m.chat, { 
                    text: tradutor.texto3?.[0] 
                        ? `${tradutor.texto3[0]} @${userNumber} ${tradutor.texto3[1]}` 
                        : `❌ El usuario @${userNumber} no tiene datos registrados.`,
                    mentions: [originalMention] 
                }, { quoted: m })
            }
        } else {
            // Existe en global.db pero no en stats, crear stats
            currentStats = {
                exp: globalUser.exp || 0,
                level: globalUser.level || 0,
                money: globalUser.money || 0,
                mysticcoins: globalUser.mysticcoins || 0,
                lunaCoins: globalUser.lunaCoins || 0,
                role: globalUser.role || '🧰 Novato',
                limit: globalUser.limit || 10
            }
        }
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
        mentions: [originalMention]
    }, { quoted: m })

    // Esperar confirmación
    const confirmation = await waitForUserResponse(conn, m.chat, m.sender, 30000)
    
    if (!confirmation || !['sí', 'si', 'yes', 'confirmar'].includes(confirmation.toLowerCase())) {
        return conn.sendMessage(m.chat, { 
            text: `❌ *Operación cancelada.*` 
        }, { quoted: m })
    }

    try {
        // Guardar datos anteriores
        const previousStats = {
            exp: currentStats.exp,
            level: currentStats.level,
            money: currentStats.money,
            joincount: currentStats.joincount || 0,
            premiumTime: currentStats.premiumTime || 0,
            mysticcoins: currentStats.mysticcoins,
            lunaCoins: currentStats.lunaCoins,
            role: currentStats.role,
            limit: currentStats.limit
        }

        // Crear backup
        const backupData = {
            userId: user,
            userNumber: userNumber,
            previousStats: previousStats,
            resetBy: m.sender,
            resetDate: now,
            expiresAt: now + (24 * 60 * 60 * 1000)
        }

        if (!global.db.data.backups) global.db.data.backups = {}
        global.db.data.backups[user] = backupData

        // Resetear datos
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

        // También limpiar datos del sistema global
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

        // Mensaje de éxito
        const successMessage = tradutor.texto4?.[0] 
            ? `${tradutor.texto4[0]} @${userNumber} ${tradutor.texto4[1]}\n\n` 
            : `✅ *Datos reseteados exitosamente para @${userNumber}*\n\n`

        const statsMessage = 
            `📊 *DATOS ANTERIORES:*\n` +
            `• Experiencia: ${previousStats.exp.toLocaleString()}\n` +
            `• Nivel: ${previousStats.level}\n` +
            `• Dinero: ${previousStats.money.toLocaleString()}\n` +
            `• Monedas místicas: ${previousStats.mysticcoins.toLocaleString()}\n` +
            `• Luna Coins: ${previousStats.lunaCoins.toLocaleString()}\n\n` +
            
            `🆕 *DATOS ACTUALES:*\n` +
            `• Experiencia: 0\n` +
            `• Nivel: 0\n` +
            `• Dinero: 0\n` +
            `• Monedas místicas: 0\n` +
            `• Luna Coins: 0\n` +
            `• Rol: 🧰 Novato`

        await conn.sendMessage(m.chat, { 
            text: successMessage + statsMessage + `\n\n🔄 *RESTAURACIÓN DISPONIBLE:*\n• Usa \`${usedPrefix}restoreuser @${userNumber}\` para restaurar\n• Backup válido por 24 horas`,
            mentions: [originalMention] 
        }, { quoted: m })

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