import fs from 'fs'
import { obtenerMenuIuman, verificarMenuIuman } from '../src/assets/images/menu/languages/es/menu-img.js'
import { cargarOGenerarAPIKey } from '../src/libraries/api/apiKeyManager.js'

const configContent = fs.readFileSync('./config.js', 'utf-8')
if (!configContent.includes('Luna-Botv6')) throw new Error('Handler bloqueado')
try { verificarMenuIuman() } catch { throw new Error('Archivo de configuracion faltante o invalido') }

const BOT = () => global.BotName || 'Luna'

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
    const t = _tr?.plugins?.canalid || {};
    const inviteCode = text?.trim()

    if (!inviteCode) {
        return conn.reply(m.chat, t.uso?.replace('{prefix}', usedPrefix + command) || `Usá: *${usedPrefix}${command} <invite_code>*\n\nEjemplo:\n${usedPrefix}${command} 0029VbANyNuLo4hedEWlvJ3Y\n\nEl código lo encontrás al final del link del canal:\nhttps://www.whatsapp.com/channel/*<código>*`, m)
    }

    await conn.sendPresenceUpdate('composing', m.chat)

    try {
        const info = await conn.newsletterMetadata('invite', inviteCode)

        const jid = info?.id || (t.jidNo || 'No disponible')
        const nombre = info?.name || (t.sinNombre || 'Sin nombre')
        const descripcion = info?.description || (t.sinDescripcion || 'Sin descripción')
        const suscriptores = info?.subscribers ?? '?'

        const msg = (t.info?.replace('{nombre}', nombre).replace('{jid}', jid).replace('{suscriptores}', suscriptores).replace('{descripcion}', descripcion).replace('{bot}', BOT()) || `📡 *Información del Canal*\n\n` +
            `*Nombre:* ${nombre}\n` +
            `*JID:* \`${jid}\`\n` +
            `*Suscriptores:* ${suscriptores}\n` +
            `*Descripción:* ${descripcion}\n\n` +
            `Para configurarlo en tu bot agregá al *.env*:\n` +
            `\`NEWSLETTER_ID=${jid}\`\n` +
            `\`NEWSLETTER_NAME=${nombre}\`\n\n` +
            `🌙 ${BOT()}`)

        conn.reply(m.chat, msg, m)
    } catch (e) {
        conn.reply(m.chat, t.error?.replace('{error}', e?.message || e) || `❌ No se pudo obtener la información del canal.\n\nVerificá que el código sea correcto.\n\nError: ${e?.message || e}`, m)
    }
}

handler.help = ['canalid <invite_code>']
handler.tags = ['owner']
handler.command = /^canalid$/i
handler.owner = true

export default handler