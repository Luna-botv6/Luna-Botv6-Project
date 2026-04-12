import fs from 'fs'

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

                const { messageStubType, messageStubParameters } = message
                const eventoId = `${chatId}-${messageStubType}-${Date.now()}`

                if (eventosProcessados.has(eventoId)) continue
                eventosProcessados.add(eventoId)

                const idioma = global.defaultLenguaje
                const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`))
                const t = _translate.functions.group_detect

                let text = ''

                if (messageStubType === 21) {
                    const nuevoNombre = messageStubParameters?.[0] || t.no_name
                    text = `*[ ℹ️ ] ${t.texto1}*\n"${nuevoNombre}"`
                }
                else if (messageStubType === 24) {
                    text = `*[ ℹ️ ] ${t.texto2}*`
                }
                else if (messageStubType === 22) {
                    text = `*[ ℹ️ ] ${t.texto3}*`
                }
                else if (messageStubType === 23) {
                    text = `*[ ℹ️ ] ${t.texto4}*`
                }
                else if (messageStubType === 25) {
                    const estado = messageStubParameters?.[0] === 'on' ? t.on : t.off
                    text = `*[ ℹ️ ] ${t.texto5} ${estado}.*`
                }
                else if (messageStubType === 26) {
                    const estado = messageStubParameters?.[0] === 'on' ? t.on_m : t.off_m
                    text = `*[ ℹ️ ] ${t.texto6} ${estado}.*`
                }

                if (text) {
                    await conn.sendMessage(chatId, { text }).catch(() => {})
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
