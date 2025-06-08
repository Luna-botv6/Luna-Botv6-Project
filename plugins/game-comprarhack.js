import { getUserStats, spendMoney, spendExp, addHackTools } from '../lib/stats.js'

const handler = async (m, { conn, args }) => {
  const userId = m.sender
  const user = getUserStats(userId)

  // Precios de las herramientas de hackeo
  const PRECIOS = {
    1: { diamantes: 150, exp: 1000 },    // 1 herramienta
    3: { diamantes: 400, exp: 2500 },    // 3 herramientas (descuento)
    5: { diamantes: 600, exp: 4000 },    // 5 herramientas (mejor descuento)
    10: { diamantes: 1000, exp: 7000 }   // 10 herramientas (máximo descuento)
  }

  if (!args[0]) {
    let texto = '🔧 **TIENDA DE HERRAMIENTAS DE HACKEO** 🔧\n\n'
    texto += '📦 **Paquetes disponibles:**\n\n'
    
    Object.entries(PRECIOS).forEach(([cantidad, precio]) => {
      const descuento = cantidad > 1 ? ' ⭐' : ''
      texto += `${cantidad} Herramienta${cantidad > 1 ? 's' : ''}${descuento}\n`
      texto += `💎 ${precio.diamantes} diamantes + ✨ ${precio.exp} exp\n\n`
    })
    
    texto += '💰 **Tu inventario actual:**\n'
    // FIX: Asegurar que hackTools nunca sea undefined
    texto += `• Herramientas de Hackeo: ${user.hackTools || 0}\n`
    texto += `• Diamantes: ${user.money || 0}\n`
    texto += `• Experiencia: ${user.exp || 0}\n\n`
    
    texto += '💡 **Uso:** /comprarhack <cantidad>\n'
    texto += 'Ejemplo: /comprarhack 3\n\n'
    texto += '⚠️ Las herramientas se consumen al usar /romperprote'
    
    return conn.sendMessage(m.chat, { text: texto }, { quoted: m })
  }

  const cantidad = parseInt(args[0])
  const precio = PRECIOS[cantidad]

  if (!precio) {
    return conn.sendMessage(m.chat, { 
      text: '❌ Cantidad inválida. Usa el comando sin parámetros para ver las opciones disponibles.' 
    }, { quoted: m })
  }

  // FIX: Asegurar que los valores nunca sean undefined antes de la comparación
  const userMoney = user.money || 0
  const userExp = user.exp || 0

  // Verificar si tiene suficientes recursos
  if (userMoney < precio.diamantes || userExp < precio.exp) {
    let falta = []
    if (userMoney < precio.diamantes) {
      falta.push(`${precio.diamantes - userMoney} diamantes`)
    }
    if (userExp < precio.exp) {
      falta.push(`${precio.exp - userExp} experiencia`)
    }
    
    return conn.sendMessage(m.chat, { 
      text: `❌ No tienes suficientes recursos.\nTe faltan: ${falta.join(' y ')}` 
    }, { quoted: m })
  }

  // Realizar la compra
  spendMoney(userId, precio.diamantes)
  spendExp(userId, precio.exp)
  addHackTools(userId, cantidad)

  // FIX: Obtener las herramientas actualizadas después de la compra
  const updatedUser = getUserStats(userId)
  const totalHerramientas = updatedUser.hackTools || 0

  const mensaje = `✅ ¡Compra exitosa!\n\n` +
                 `🔧 Has obtenido ${cantidad} Herramienta${cantidad > 1 ? 's' : ''} de Hackeo\n` +
                 `💎 Gastaste ${precio.diamantes} diamantes\n` +
                 `✨ Gastaste ${precio.exp} experiencia\n\n` +
                 `🎒 Total de herramientas: ${totalHerramientas}`

  await conn.sendMessage(m.chat, { text: mensaje }, { quoted: m })
}

handler.help = ['comprarhack <cantidad>']
handler.tags = ['econ', 'rpg']
handler.command = /^(comprarhack|comprarherramientas)$/i

export default handler