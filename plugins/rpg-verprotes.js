import fs from 'fs'
import path from 'path'

const dir = './database'
const file = path.join(dir, 'proteccion.json')

// Función para obtener todas las protecciones activas
function obtenerProteccionesActivas() {
    if (!fs.existsSync(file)) return {}
    
    try {
        const data = fs.readFileSync(file, 'utf-8')
        const protecciones = JSON.parse(data)
        const ahora = Date.now()
        const proteccionesActivas = {}
        
        // Filtrar solo las protecciones que no han expirado
        for (const userId in protecciones) {
            if (protecciones[userId].expira > ahora) {
                proteccionesActivas[userId] = protecciones[userId]
            }
        }
        
        return proteccionesActivas
    } catch {
        return {}
    }
}

// Función para formatear tiempo restante
function formatearTiempoRestante(expira) {
    const ahora = Date.now()
    const restante = expira - ahora
    
    if (restante <= 0) return "Expirada"
    
    const horas = Math.floor(restante / (1000 * 60 * 60))
    const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60))
    
    if (horas > 0) {
        return `${horas}h ${minutos}m`
    } else {
        return `${minutos}m`
    }
}

// Función para obtener el nombre/número del usuario
function obtenerNombreUsuario(userId, conn) {
    // Opción 1: Usar etiqueta (@usuario)
    return `@${userId.split('@')[0]}`
    
    // Opción 2: Si quieres obtener el nombre real del contacto (descomenta esta línea)
    // return conn.getName(userId) || `@${userId.split('@')[0]}`
}

// Handler principal
let handler = async (m, { conn }) => {
    try {
        const proteccionesActivas = obtenerProteccionesActivas()
        const userIds = Object.keys(proteccionesActivas)
        
        if (userIds.length === 0) {
            return await m.reply('🛡️ No hay protecciones activas en este momento.')
        }
        
        let mensaje = '🛡️ *PROTECCIONES ACTIVAS*\n\n'
        let mentions = [] // Array para las menciones
        
        userIds.forEach((userId, index) => {
            const proteccion = proteccionesActivas[userId]
            const fechaActivacion = new Date(proteccion.expira - (proteccion.duracion * 60 * 60 * 1000))
            const tiempoRestante = formatearTiempoRestante(proteccion.expira)
            const mention = '@' + userId.split('@')[0] // Crear la mención
            
            mentions.push(userId) // Agregar userId al array de menciones
            
            mensaje += `*${index + 1}.* 👤 *Usuario:* ${mention}\n`
            mensaje += `📅 *Activada:* ${fechaActivacion.toLocaleString()}\n`
            mensaje += `⏰ *Tiempo restante:* ${tiempoRestante}\n`
            mensaje += `🕐 *Duración total:* ${proteccion.duracion}h\n`
            mensaje += `🆔 *ID:* ${userId.split('@')[0]}\n`
            mensaje += '─────────────────\n'
        })
        
        mensaje += `\n📊 *Total:* ${userIds.length} protección(es) activa(s)`
        
        // Enviar mensaje con menciones
        await m.reply(mensaje, null, { mentions })
        
    } catch (error) {
        console.error('Error al obtener protecciones:', error)
        await m.reply('❌ Error al obtener las protecciones activas.')
    }
}

handler.command = ['verprotes', 'verprotecciones']
handler.help = ['verprotes']
handler.tags = ['rpg']

export default handler