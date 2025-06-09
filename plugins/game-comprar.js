import { getUserStats, spendMoney, spendExp, setUserStats } from '../lib/stats.js'
import { activarProteccion } from '../lib/usarprote.js'

const handler = async (m, { conn, args }) => {
  const userId = m.sender
  const user = getUserStats(userId)

  const opcionesProte = [
    { horas: 2, costoDiamantes: 200, costoExp: 800, gananciaMysticcoins: 10 },
    { horas: 5, costoDiamantes: 300, costoExp: 1200, gananciaMysticcoins: 20 },
    { horas: 12, costoDiamantes: 400, costoExp: 1500, gananciaMysticcoins: 30 },
    { horas: 24, costoDiamantes: 450, costoExp: 2000, gananciaMysticcoins: 50 }
  ]

  if (!args[0]) {
    let texto = '🛡️ Opciones de Protección disponibles:\n\n'
    opcionesProte.forEach(op => {
      texto += `- ${op.horas} horas → 💎 ${op.costoDiamantes} diamantes + ✨ ${op.costoExp} Exp\n`
    })
    texto += '\nPara comprar usa:\n/comprarprote <horas>\nEjemplo: /comprarprote 5'
    await conn.sendMessage(m.chat, { text: texto }, { quoted: m })
    return
  }

  const horas = parseInt(args[0])
  const prote = opcionesProte.find(op => op.horas === horas)

  if (!prote) {
    return conn.sendMessage(m.chat, { text: '❌ Opción inválida. Usa el comando sin parámetros para ver las opciones disponibles.' }, { quoted: m })
  }

  if (user.money < prote.costoDiamantes || user.exp < prote.costoExp) {
    let falta = []
    if (user.money < prote.costoDiamantes) falta.push('💎 diamantes')
    if (user.exp < prote.costoExp) falta.push('✨ experiencia')
    return conn.sendMessage(m.chat, { text: `❌ No tienes suficientes: ${falta.join(' y ')}` }, { quoted: m })
  }

  // DEBUG: Mostrar stats antes de la compra
  console.log('ANTES - Money:', user.money, 'Exp:', user.exp, 'Mysticcoins:', user.mysticcoins)

  try {
    // Descontar diamantes y exp
    spendMoney(userId, prote.costoDiamantes)
    spendExp(userId, prote.costoExp)

    // Obtener stats actualizados después de los gastos
    const userDespuesGasto = getUserStats(userId)
    console.log('DESPUÉS GASTO - Money:', userDespuesGasto.money, 'Exp:', userDespuesGasto.exp)

    // Sumar mysticcoins
    userDespuesGasto.mysticcoins = (userDespuesGasto.mysticcoins || 0) + prote.gananciaMysticcoins
    setUserStats(userId, userDespuesGasto)

    // Verificar que se guardaron los cambios
    const userFinal = getUserStats(userId)
    console.log('FINAL - Money:', userFinal.money, 'Exp:', userFinal.exp, 'Mysticcoins:', userFinal.mysticcoins)

    // Activar protección
    await activarProteccion(m, conn, horas.toString())

    // Confirmar compra y ganancia con stats actuales
    await conn.sendMessage(m.chat, { 
      text: `✅ Protección comprada por ${horas} horas.
💎 Diamantes gastados: ${prote.costoDiamantes}
✨ Exp gastada: ${prote.costoExp}
🪙 Mysticcoins ganados: ${prote.gananciaMysticcoins}

💰 Diamantes restantes: ${userFinal.money}
⭐ Exp restante: ${userFinal.exp}
🪙 Mysticcoins totales: ${userFinal.mysticcoins}` 
    }, { quoted: m })

  } catch (error) {
    console.error('Error en compra protección:', error)
    await conn.sendMessage(m.chat, { text: '❌ Error al procesar la compra. Intenta nuevamente.' }, { quoted: m })
  }
}

handler.help = ['comprarprote <horas>']
handler.tags = ['econ']
handler.command = /^comprarprote$/i

export default handler
