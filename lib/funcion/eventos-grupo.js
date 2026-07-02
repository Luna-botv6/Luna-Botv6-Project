import fs from 'fs'
import { WAMessageStubType } from '@whiskeysockets/baileys'

const eventosProcessados = new Set()
let inicioBotTimestamp = Date.now()
let _translateCache = null
const _groupNames = new Map()

const BOT = () => global.BotName || 'Luna'

function getTranslate() {
    const idioma = global.defaultLenguaje
    if (_translateCache?._idioma === idioma) return _translateCache
    _translateCache = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`))
    _translateCache._idioma = idioma
    return _translateCache
}

async function getGroupName(chatId) {
    if (_groupNames.has(chatId)) return _groupNames.get(chatId)
    const _gc = global.groupCache?.get(chatId)
    const name = _gc?.data?.groupMetadata?.subject || null
    if (name) { _groupNames.set(chatId, name); return name }
    try {
        const meta = await _conn.groupMetadata(chatId)
        const n = meta?.subject || chatId.split('@')[0]
        if (n) _groupNames.set(chatId, n)
        return n
    } catch {
        return chatId.split('@')[0]
    }
}

let _conn = null

async function _eventosHandler({ messages, type }) {
    try {
        if (Date.now() - inicioBotTimestamp < 10000) return
        for (const message of messages) {
            if (!message?.messageStubType) continue
            const chatId = message.key?.remoteJid
            if (!chatId?.endsWith('@g.us')) continue

            const eventoId = `${message.key.id}-${message.messageStubType}`
            if (eventosProcessados.has(eventoId)) continue
            eventosProcessados.add(eventoId)

            if (!global.db.data.chats[chatId]) {
                global.db.data.chats[chatId] = { detect: false }
            }
            if (global.db.data.chats[chatId].detect !== true) continue

            const { messageStubType, messageStubParameters } = message
            const t = getTranslate()?.functions?.group_detect || {}
            const grupo = await getGroupName(chatId)
            const sep = '━━━━━━━━━━━━━━━━━━━━'
            let text = ''

            if (messageStubType === WAMessageStubType.GROUP_CHANGE_SUBJECT) {
                text = `🏷️ *Nombre del grupo actualizado*\n${sep}\n👥 Grupo: ${grupo}\n📝 Nuevo nombre: *${messageStubParameters?.[0] || t.no_name}*\n🤖 Bot: ${BOT()}`
            } else if (messageStubType === 22) {
                text = `🖼️ *Foto del grupo actualizada*\n${sep}\n👥 Grupo: ${grupo}\n🤖 Bot: ${BOT()}`
            } else if (messageStubType === 23) {
                text = `🔗 *Enlace del grupo restablecido*\n${sep}\n👥 Grupo: ${grupo}\n🤖 Bot: ${BOT()}`
            } else if (messageStubType === 24) {
                text = `📝 *Descripción del grupo modificada*\n${sep}\n👥 Grupo: ${grupo}\n✏️ Nueva: *${messageStubParameters?.[0] || ''}*\n🤖 Bot: ${BOT()}`
            } else if (messageStubType === WAMessageStubType.GROUP_CHANGE_ANNOUNCE) {
                const estado = messageStubParameters?.[0] === 'on' ? t.on : t.off
                text = `📢 *Modo anuncios: ${estado}*\n${sep}\n👥 Grupo: ${grupo}\n🤖 Bot: ${BOT()}`
            } else if (messageStubType === WAMessageStubType.GROUP_CHANGE_RESTRICT) {
                const estado = messageStubParameters?.[0] === 'on' ? t.on_m : t.off_m
                text = `🔒 *Restricción del grupo: ${estado}*\n${sep}\n👥 Grupo: ${grupo}\n🤖 Bot: ${BOT()}`
            }

            if (text) await _conn.sendMessage(chatId, { text }).catch(() => {})
        }
    } catch {}
}

setInterval(() => {
    if (eventosProcessados.size > 100) {
        const iter = eventosProcessados.values()
        for (let i = 0; i < 50; i++) eventosProcessados.delete(iter.next().value)
    }
}, 300000)

export async function manejarEventosGrupo(conn) {
    _conn = conn
    conn.ev.off('messages.upsert', _eventosHandler)
    conn.ev.on('messages.upsert', _eventosHandler)
}