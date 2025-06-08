import { romperProteccion, getHackInfo, puedeHackear } from '../lib/romperprote.js'
import { getUserStats } from '../lib/stats.js'

const handler = async (m, { conn, args }) => {
  const sender = m.sender
  let target

  // Obtener información del comando si no hay argumentos
  if (!args[0]) {
    const info = getHackInfo()
    const estado = puedeHackear(sender)
    const user = getUserStats(sender)
    
    let texto = '🔓 **SISTEMA DE ROMPER PROTECCIONES** 🔓\n\n'
    texto += '📋 **Información:**\n'
    texto += `• Costo: ${info.costo} Herramienta de Hackeo\n`
    texto += `• Cooldown: ${info.cooldown} minutos\n`
    texto += `• Penalización por fallo: ${info.penalizaciones.exp} exp + ${info.penalizaciones.diamantes} diamantes\n\n`
    
    texto += '📊 **Probabilidades de éxito:**\n'
    texto += `• Protección 2h: ${info.probabilidades[2]}%\n`
    texto += `• Protección 5h: ${info.probabilidades[5]}%\n`
    texto += `• Protección 12h: ${info.probabilidades[12]}%\n`
    texto += `• Protección 24h: ${info.probabilidades[24]}%\n\n`
    
    texto += '🎒 **Tu inventario:**\n'
    texto += `• Herramientas de Hackeo: ${user.hackTools}\n`
    texto += `• Experiencia: ${user.exp}\n`
    texto += `• Diamantes: ${user.money}\n\n`
    
    if (estado.cooldownRestante > 0) {
      texto += `⏳ **Cooldown activo:** ${estado.cooldownRestante} minutos\n\n`
    }
    
    texto += '💡 **Uso:** /romperprote @usuario\n'
    texto += '⚠️ **Advertencia:** Si fallas, perderás recursos y la protección seguirá activa.'
    
    return m.reply(texto)
  }

  // Obtener objetivo
  if (m.isGroup) {
    target = m.mentionedJid?.[0] || m.quoted?.sender
  } else {
    target = m.chat
  }

  if (!target) {
    return m.reply('❌ Debes mencionar a alguien para hackear su protección.\nUso: /romperprote @usuario')
  }

  if (target === sender) {
    return m.reply('🤨 No puedes hackear tu propia protección.')
  }

  // Intentar romper la protección
  try {
    const resultado = await romperProteccion(sender, target)
    
    let mensaje = resultado.mensaje
    
    // Agregar información adicional según el resultado
    if (resultado.tipo === 'exito') {
      mensaje += `\n\n🎯 Ahora puedes intentar robar a @${target.split('@')[0]}.`
    } else if (resultado.tipo === 'fallo') {
      mensaje += `\n\n💡 Tip: Las protecciones más largas son más difíciles de hackear.`
    }
    
    // Mencionar al objetivo si es relevante
    const mentions = (resultado.tipo === 'exito' || resultado.tipo === 'fallo') ? [target] : []
    
    await conn.sendMessage(m.chat, { 
      text: mensaje 
    }, { 
      quoted: m,
      mentions: mentions 
    })
    
  } catch (error) {
    console.error('Error en romperprote:', error)
    m.reply('❌ Ocurrió un error al intentar hackear la protección.')
  }
}

handler.help = ['romperprote']
handler.tags = ['rpg']
handler.command = /^(romperprote|hackear|romperproteccion)$/i

export default handler