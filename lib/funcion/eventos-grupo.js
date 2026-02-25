const eventosProcessados = new Set()
let inicioBotTimestamp = Date.now()

export async function manejarEventosGrupo(conn) {
    
    conn.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            if (Date.now() - inicioBotTimestamp < 10000) return
            
            for (const message of messages) {
                if (!message?.messageStubType) continue
                
                const chatId = message.key?.remoteJid
                if (!chatId?.endsWith('@g.us')) continue
                
                if (!global.db.data.chats[chatId]) {
                    global.db.data.chats[chatId] = { detect: false }
                }
                
                const detectStatus = global.db.data.chats[chatId].detect
                
                if (detectStatus !== true) continue
                
                const { messageStubType, messageStubParameters, key } = message
                const eventoId = `${chatId}-${messageStubType}-${Date.now()}`
                
                if (eventosProcessados.has(eventoId)) continue
                eventosProcessados.add(eventoId)
                
                let text = ''
                let mentions = []
                
                if (messageStubType === 21) {
                    const nuevoNombre = messageStubParameters?.[0] || 'Sin nombre'
                    text = `*[ ℹ️ ] El nombre del grupo ha sido modificado a:*\n"${nuevoNombre}"`
                }
                else if (messageStubType === 24) {
                    text = `*[ ℹ️ ] La descripción del grupo ha sido modificada.*`
                }
                else if (messageStubType === 22) {
                    text = `*[ ℹ️ ] Se ha cambiado la foto de perfil del grupo.*`
                }
                else if (messageStubType === 23) {
                    text = `*[ ℹ️ ] El enlace de invitación al grupo ha sido restablecido.*`
                }
                else if (messageStubType === 25) {
                    const estado = messageStubParameters?.[0] === 'on' ? 'activada' : 'desactivada'
                    text = `*[ ℹ️ ] La restricción de mensajes ha sido ${estado}.*`
                }
                else if (messageStubType === 26) {
                    const estado = messageStubParameters?.[0] === 'on' ? 'activado' : 'desactivado'
                    text = `*[ ℹ️ ] El modo solo admins ha sido ${estado}.*`
                }
                
                if (text) {
                    await conn.sendMessage(chatId, { 
                        text, 
                        mentions: mentions.length > 0 ? mentions : undefined 
                    }).catch(() => {})
                }
            }
        } catch (e) {}
    })
    
    setInterval(() => {
        const arr = Array.from(eventosProcessados)
        if (arr.length > 100) {
            arr.slice(0, 50).forEach(id => eventosProcessados.delete(id))
        }
    }, 300000)
}