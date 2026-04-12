import fs from 'fs'
import path from 'path'

const dir = './database'
const file = path.join(dir, 'proteccion.json')

function obtenerProteccionesActivas() {
    if (!fs.existsSync(file)) return {}
    try {
        const data = fs.readFileSync(file, 'utf-8')
        const protecciones = JSON.parse(data)
        const ahora = Date.now()
        const activas = {}
        for (const userId in protecciones) {
            if (protecciones[userId].expira > ahora) {
                activas[userId] = protecciones[userId]
            }
        }
        return activas
    } catch {
        return {}
    }
}

function formatearTiempoRestante(expira, t) {
    const ahora = Date.now()
    const restante = expira - ahora
    if (restante <= 0) return t.expirada || 'Expirada'
    const horas = Math.floor(restante / (1000 * 60 * 60))
    const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60))
    if (horas > 0) return `${horas}${t.horas || 'h'} ${minutos}${t.minutos || 'm'}`
    return `${minutos}${t.minutos || 'm'}`
}

let handler = async (m, { conn }) => {
    const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es'
    const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf-8'))
    const t = _translate?.functions?.verprotes || {}

    try {
        const proteccionesActivas = obtenerProteccionesActivas()
        const userIds = Object.keys(proteccionesActivas)

        if (userIds.length === 0) {
            return await m.reply(t.sinProtecciones || '🛡️ No hay protecciones activas en este momento.')
        }

        let mensaje = `${t.titulo || '🛡️ *PROTECCIONES ACTIVAS*'}\n\n`
        let mentions = []

        userIds.forEach((userId, index) => {
            const proteccion = proteccionesActivas[userId]
            const fechaActivacion = new Date(proteccion.expira - (proteccion.duracion * 60 * 60 * 1000))
            const tiempoRestante = formatearTiempoRestante(proteccion.expira, t)
            const mention = '@' + userId.split('@')[0]
            mentions.push(userId)

            mensaje += `*${index + 1}.* 👤 *${t.usuario || 'Usuario'}:* ${mention}\n`
            mensaje += `📅 *${t.activada || 'Activada'}:* ${fechaActivacion.toLocaleString()}\n`
            mensaje += `⏰ *${t.restante || 'Tiempo restante'}:* ${tiempoRestante}\n`
            mensaje += `🕐 *${t.duracion || 'Duración total'}:* ${proteccion.duracion}h\n`
            mensaje += `🆔 *ID:* ${userId.split('@')[0]}\n`
            mensaje += '─────────────────\n'
        })

        mensaje += `\n📊 *${t.total || 'Total'}:* ${userIds.length} ${t.activa || 'protección(es) activa(s)'}`

        await m.reply(mensaje, null, { mentions })

    } catch (error) {
        console.error('Error al obtener protecciones:', error)
        await m.reply(t.error || '❌ Error al obtener las protecciones activas.')
    }
}

handler.command = ['verprotes', 'verprotecciones']
handler.help = ['verprotes']
handler.tags = ['rpg']
export default handler
