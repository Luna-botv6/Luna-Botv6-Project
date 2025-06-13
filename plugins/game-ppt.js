import { addExp, addMoney, removeMoney } from '../lib/stats.js'

// Sistema anti-spam
const userCooldowns = new Map()
const SPAM_THRESHOLD = 5 // máximo 5 comandos
const SPAM_WINDOW = 60000 // en 60 segundos (1 minuto)
const SPAM_PENALTY = 500 // quitar 500 diamantes

// Opciones del juego
const opciones = ['piedra', 'papel', 'tijera']

// Emojis para cada opción
const emojis = {
    'piedra': '🪨',
    'papel': '📄', 
    'tijera': '✂️'
}

// Mensajes graciosos para spam
const mensajesSpam = [
    "🚨 ¡ALERTA DE SPAM! ¿En serio? Te multo por abuso del sistema",
    "😤 ¡Basta de spam! Tu billetera va a sufrir las consecuencias",
    "🕵️‍♂️ Detector de spam activado... ¡PENALIZACIÓN APLICADA!",
    "⚠️ ¡Spam detectado! El bot no es tu esclavo personal",
    "🎭 Drama level: SPAM. Tu cuenta bancaria llora lágrimas de diamantes",
    "🤖 ERROR 404: Paciencia not found. Penalización por spam aplicada",
    "😈 Muahahaha, spammer detected! Tus diamantes son míos ahora",
    "🚫 SPAM POLICE! Has sido multado por abuso de sistema",
    "⭐ Speedrun de spam completado... ¡y penalizado!",
    "🎪 El show del spam ha terminado, paga la entrada: 500 diamantes"
]

// Función para verificar spam
function verificarSpam(userId) {
    const now = Date.now()
    const userHistory = userCooldowns.get(userId) || []
    
    // Filtrar solo los comandos del último minuto
    const recentCommands = userHistory.filter(timestamp => now - timestamp < SPAM_WINDOW)
    
    // Actualizar el historial del usuario
    recentCommands.push(now)
    userCooldowns.set(userId, recentCommands)
    
    // Verificar si excede el límite
    if (recentCommands.length > SPAM_THRESHOLD) {
        return true
    }
    
    return false
}
const mensajesGraciosos = {
    expAlta: [
        "🎉 ¡Increíble jugada! El universo conspira a tu favor",
        "🌟 ¡Wow! Esa fue una jugada de nivel profesional",
        "🚀 ¡Espectacular! Te mereces una medalla",
        "⭐ ¡Genial! Hasta los dioses del PPT están impresionados",
        "🎊 ¡Brutal! Esa jugada vale oro puro"
    ],
    expBaja: [
        "🤔 Hmm... eso fue sospechoso, pero te doy algo por el esfuerzo",
        "😏 ¿Trampa? Nah... solo suerte de principiante",
        "🙄 Bueno, supongo que algo es algo...",
        "😅 Okay, te doy unas migajas por intentarlo",
        "🤷‍♂️ Meh, al menos lo intentaste..."
    ],
    moneyAlta: [
        "💎 ¡JACKPOT! Los diamantes llueven sobre ti",
        "💰 ¡Cha-ching! Tu cuenta bancaria te lo agradece",
        "🤑 ¡Rico! Ahora puedes comprar medio mundo",
        "💸 ¡Lluvia de diamantes! Estás en racha",
        "💵 ¡Boom! Tu billetera acaba de explotar de felicidad"
    ],
    moneyBaja: [
        "💰 Aquí tienes una monedita... gastala bien",
        "🪙 Una moneda por tu valentía (o suerte ciega)",
        "💸 Toma, comprate un chicle con esto",
        "💴 Esto ni para un café alcanza, pero es tuyo",
        "🏦 El banco dice que esto es todo lo que puedo darte"
    ],
    empate: [
        "🤝 ¡Empate épico! Pero no te vayas con las manos vacías",
        "😎 Empate de leyendas, algo tienes que llevarte",
        "🎭 Drama, tensión, empate... ¡y premio!",
        "⚖️ Justicia poética: empate = premio",
        "🎪 ¡Empate circense! Todos ganan algo"
    ],
    pierde: [
        "😢 Perdiste, pero hey... premio de consolación",
        "🍭 Dulce derrota, algo dulce para ti",
        "🎁 Regalo sorpresa por ser buen deportista",
        "🌈 Después de la tormenta viene el arcoíris (y premios)",
        "🎪 ¡El show debe continuar! Y tú te llevas algo"
    ]
}

// Función para determinar el ganador
function determinarGanador(jugador, bot) {
    if (jugador === bot) {
        return 'empate'
    }
    
    // Reglas del juego
    const reglas = {
        'piedra': 'tijera',    // piedra vence tijera
        'papel': 'piedra',     // papel vence piedra
        'tijera': 'papel'      // tijera vence papel
    }
    
    if (reglas[jugador] === bot) {
        return 'gana'
    } else {
        return 'pierde'
    }
}

// Función para generar recompensas aleatorias
function generarRecompensa(resultado, userId) {
    const random = Math.random()
    let tipoRecompensa, cantidad, mensajeGracioso
    
    if (resultado === 'gana') {
        // Mayor probabilidad de buenas recompensas al ganar
        if (random < 0.8) { // 80% chance de buena recompensa
            tipoRecompensa = random < 0.5 ? 'exp' : 'money'
            
            // Nuevos rangos: EXP 250-1000, Diamantes 125-800
            if (tipoRecompensa === 'exp') {
                cantidad = Math.floor(Math.random() * 751) + 250 // 250-1000 EXP
            } else {
                cantidad = Math.floor(Math.random() * 676) + 125 // 125-800 Diamantes
            }
            
            // Determinar si es recompensa alta o normal
            const esRecompensaAlta = (tipoRecompensa === 'exp' && cantidad >= 700) || 
                                   (tipoRecompensa === 'money' && cantidad >= 600)
            
            if (esRecompensaAlta) {
                mensajeGracioso = tipoRecompensa === 'exp' ? 
                    mensajesGraciosos.expAlta[Math.floor(Math.random() * mensajesGraciosos.expAlta.length)] :
                    mensajesGraciosos.moneyAlta[Math.floor(Math.random() * mensajesGraciosos.moneyAlta.length)]
            } else {
                mensajeGracioso = tipoRecompensa === 'exp' ? 
                    mensajesGraciosos.expBaja[Math.floor(Math.random() * mensajesGraciosos.expBaja.length)] :
                    mensajesGraciosos.moneyBaja[Math.floor(Math.random() * mensajesGraciosos.moneyBaja.length)]
            }
        } else {
            // Recompensas "tramposas" divertidas (20% chance)
            tipoRecompensa = 'exp'
            cantidad = Math.floor(Math.random() * 50) + 10 // 10-59 exp por "trampa"
            mensajeGracioso = "🕵️‍♂️ Mmm... eso olió a trampa, pero toma esto por el intento"
        }
    } else if (resultado === 'empate') {
        // Recompensas moderadas en empate
        tipoRecompensa = Math.random() < 0.5 ? 'exp' : 'money'
        
        if (tipoRecompensa === 'exp') {
            cantidad = Math.floor(Math.random() * 300) + 150 // 150-449 EXP
        } else {
            cantidad = Math.floor(Math.random() * 200) + 75 // 75-274 Diamantes
        }
        
        mensajeGracioso = mensajesGraciosos.empate[Math.floor(Math.random() * mensajesGraciosos.empate.length)]
    } else {
        // Recompensas de consolación al perder
        if (random < 0.6) { // 60% chance de premio de consolación
            tipoRecompensa = Math.random() < 0.7 ? 'exp' : 'money'
            
            if (tipoRecompensa === 'exp') {
                cantidad = Math.floor(Math.random() * 150) + 100 // 100-249 EXP
            } else {
                cantidad = Math.floor(Math.random() * 100) + 50 // 50-149 Diamantes
            }
            
            mensajeGracioso = mensajesGraciosos.pierde[Math.floor(Math.random() * mensajesGraciosos.pierde.length)]
        } else {
            return null // No hay recompensa esta vez
        }
    }
    
    // Aplicar la recompensa
    if (tipoRecompensa === 'exp') {
        addExp(userId, cantidad)
    } else {
        addMoney(userId, cantidad)
    }
    
    return {
        tipo: tipoRecompensa,
        cantidad: cantidad,
        mensaje: mensajeGracioso
    }
}

// Función para generar mensajes según el resultado
function generarMensaje(jugador, bot, resultado, recompensa) {
    const emojiJugador = emojis[jugador]
    const emojiBot = emojis[bot]
    
    let mensaje = `🎮 *PIEDRA, PAPEL Y TIJERA* 🎮\n\n`
    mensaje += `👤 *Tú:* ${emojiJugador} ${jugador.toUpperCase()}\n`
    mensaje += `🤖 *Bot:* ${emojiBot} ${bot.toUpperCase()}\n\n`
    
    switch (resultado) {
        case 'gana':
            mensaje += `🎉 *¡GANASTE!* 🎉\n`
            mensaje += `${emojiJugador} ${jugador} vence a ${emojiBot} ${bot}\n\n`
            break
        case 'pierde':
            mensaje += `😅 *¡PERDISTE!* 😅\n`
            mensaje += `${emojiBot} ${bot} vence a ${emojiJugador} ${jugador}\n\n`
            break
        case 'empate':
            mensaje += `🤝 *¡EMPATE!* 🤝\n`
            mensaje += `Ambos eligieron ${emojiJugador} ${jugador}\n\n`
            break
    }
    
    // Agregar mensaje de recompensa si existe
    if (recompensa) {
        mensaje += `💫 *RECOMPENSA:*\n`
        mensaje += `${recompensa.mensaje}\n`
        
        if (recompensa.tipo === 'exp') {
            mensaje += `⚡ +${recompensa.cantidad} EXP`
        } else {
            mensaje += `💎 +${recompensa.cantidad} Diamantes`
        }
    } else if (resultado === 'pierde') {
        const mensajesNoRecompensa = [
            "😈 Esta vez te quedas sin nada... ¡la casa siempre gana!",
            "🎭 El drama de la derrota sin premio... Shakespeare estaría orgulloso",
            "🎪 No todos los shows tienen final feliz, ¡inténtalo otra vez!",
            "🌧️ Día gris sin recompensa, pero mañana saldrá el sol",
            "🎲 Los dados no están de tu lado hoy"
        ]
        mensaje += `\n🚫 ${mensajesNoRecompensa[Math.floor(Math.random() * mensajesNoRecompensa.length)]}`
    }
    
    return mensaje
}

let handler = async (m, { text }) => {
    // Verificar spam ANTES de procesar el comando
    if (verificarSpam(m.sender)) {
        removeMoney(m.sender, SPAM_PENALTY)
        const mensajeSpam = mensajesSpam[Math.floor(Math.random() * mensajesSpam.length)]
        
        return m.reply(`${mensajeSpam}

💸 *PENALIZACIÓN:* -${SPAM_PENALTY} Diamantes
⏰ *Cooldown:* Espera un momento antes de volver a jugar
🎮 *Tip:* La paciencia es una virtud... ¡y te ahorra dinero!

_El spam no paga, amigo..._`)
    }

    // Verificar si se proporcionó una jugada
    if (!text) {
        return m.reply(`🎮 *PIEDRA, PAPEL Y TIJERA* 🎮

🪨 Piedra vence a Tijera
📄 Papel vence a Piedra  
✂️ Tijera vence a Papel

*Uso:* /ppt [opción]
*Ejemplo:* /ppt piedra

*Opciones válidas:*
• piedra 🪨
• papel 📄  
• tijera ✂️

💡 *¡Juega y gana EXP y Diamantes!*
🎁 Recompensas aleatorias te esperan`)
    }
    
    // Limpiar y validar la entrada del usuario
    const jugadaUsuario = text.toLowerCase().trim()
    
    // Verificar si la jugada es válida
    if (!opciones.includes(jugadaUsuario)) {
        return m.reply(`❌ *Opción inválida!*

*Opciones válidas:*
• piedra 🪨
• papel 📄
• tijera ✂️

*Ejemplo:* /ppt papel`)
    }
    
    // El bot elige aleatoriamente
    const jugadaBot = opciones[Math.floor(Math.random() * opciones.length)]
    
    // Determinar el resultado
    const resultado = determinarGanador(jugadaUsuario, jugadaBot)
    
    // Generar recompensa aleatoria
    const recompensa = generarRecompensa(resultado, m.sender)
    
    // Generar y enviar el mensaje
    const mensaje = generarMensaje(jugadaUsuario, jugadaBot, resultado, recompensa)
    
    await m.reply(mensaje)
}

handler.command = ['ppt', 'piedrapapeltijera', 'rockpaperscissors']
handler.help = ['ppt']
handler.tags = ['game']

export default handler