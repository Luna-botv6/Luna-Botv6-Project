import { getUserStats, addExp, addMoney } from '../lib/stats.js'

let juegosActivos = new Map();

class WordFindGame {
    constructor() {
        this.tamaño = 10;
        this.tiempoLimite = 2 * 60 * 1000; // 2 minutos
        this.recompensas = {
            expPorPalabra: 1000,
            diamantesPorPalabra: 500,
            bonusCompletado: {
                exp: 2500,
                diamantes: 1000
            }
        };
    }

    generarTableroVacio() {
        return Array(this.tamaño).fill().map(() => Array(this.tamaño).fill(''));
    }

    puedeColocarPalabra(tablero, palabra, fila, col, direccion) {
        const direcciones = {
            horizontal: [0, 1],
            vertical: [1, 0],
            diagonal: [1, 1],
            diagonalInversa: [1, -1]
        };

        const [deltaFila, deltaCol] = direcciones[direccion];

        for (let i = 0; i < palabra.length; i++) {
            const nuevaFila = fila + (deltaFila * i);
            const nuevaCol = col + (deltaCol * i);

            if (nuevaFila < 0 || nuevaFila >= this.tamaño || nuevaCol < 0 || nuevaCol >= this.tamaño)
                return false;

            if (tablero[nuevaFila][nuevaCol] !== '' && tablero[nuevaFila][nuevaCol] !== palabra[i])
                return false;
        }
        return true;
    }

    colocarPalabra(tablero, palabra, fila, col, direccion) {
        const direcciones = {
            horizontal: [0, 1],
            vertical: [1, 0],
            diagonal: [1, 1],
            diagonalInversa: [1, -1]
        };

        const [deltaFila, deltaCol] = direcciones[direccion];

        for (let i = 0; i < palabra.length; i++) {
            const nuevaFila = fila + (deltaFila * i);
            const nuevaCol = col + (deltaCol * i);
            tablero[nuevaFila][nuevaCol] = palabra[i];
        }
    }

    llenarEspaciosVacios(tablero) {
        const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < this.tamaño; i++) {
            for (let j = 0; j < this.tamaño; j++) {
                if (tablero[i][j] === '') {
                    tablero[i][j] = letras[Math.floor(Math.random() * letras.length)];
                }
            }
        }
    }

    generarSopaDeLetras(numPalabras = 5) {
        const palabras = [
            'GATO', 'PERRO', 'CASA', 'MESA', 'SILLA', 'AGUA', 'FUEGO', 'TIERRA',
            'AIRE', 'SOL', 'LUNA', 'MAR', 'RIO', 'FLOR', 'ARBOL', 'NARANJA', 
            'UVA', 'LIMON', 'ZAPATO', 'VACA', 'CIELO', 'NUBE', 'ROCA', 'VIENTO'
        ];
        const palabrasUsadas = [];
        const direcciones = ['horizontal', 'vertical', 'diagonal', 'diagonalInversa'];
        const tablero = this.generarTableroVacio();
        const seleccionadas = palabras.sort(() => 0.5 - Math.random()).slice(0, numPalabras);

        for (const palabra of seleccionadas) {
            let colocada = false, intentos = 0;
            while (!colocada && intentos < 100) {
                const dir = direcciones[Math.floor(Math.random() * direcciones.length)];
                const fila = Math.floor(Math.random() * this.tamaño);
                const col = Math.floor(Math.random() * this.tamaño);
                if (this.puedeColocarPalabra(tablero, palabra, fila, col, dir)) {
                    this.colocarPalabra(tablero, palabra, fila, col, dir);
                    palabrasUsadas.push(palabra);
                    colocada = true;
                }
                intentos++;
            }
        }

        this.llenarEspaciosVacios(tablero);
        return { tablero, palabras: palabrasUsadas };
    }

    formatearTablero(tablero) {
        let texto = '🔤 *SOPA DE LETRAS* 🔤\n\n';
        texto += '```\n';
        texto += '    1 2 3 4 5 6 7 8 9 10\n';
        for (let i = 0; i < tablero.length; i++) {
            const numero = (i + 1).toString().padStart(2, ' ');
            texto += `${numero}  ${tablero[i].join(' ')}\n`;
        }
        texto += '```\n';
        return texto;
    }

    verificarPalabra(tablero, palabra, fila1, col1, fila2, col2) {
        try {
            fila1--; col1--; fila2--; col2--;
            if ([fila1, col1, fila2, col2].some(x => x < 0 || x >= this.tamaño)) return false;

            const encontrada = this.extraerPalabraDelTablero(tablero, { fila: fila1, col: col1 }, { fila: fila2, col: col2 });
            return encontrada === palabra || encontrada === palabra.split('').reverse().join('');
        } catch { return false; }
    }

    extraerPalabraDelTablero(tablero, inicio, fin) {
        const deltaFila = fin.fila - inicio.fila;
        const deltaCol = fin.col - inicio.col;
        const longitud = Math.max(Math.abs(deltaFila), Math.abs(deltaCol)) + 1;
        const stepFila = deltaFila === 0 ? 0 : deltaFila / Math.abs(deltaFila);
        const stepCol = deltaCol === 0 ? 0 : deltaCol / Math.abs(deltaCol);

        let palabra = '';
        for (let i = 0; i < longitud; i++) {
            const fila = inicio.fila + (stepFila * i);
            const col = inicio.col + (stepCol * i);
            palabra += tablero[fila][col];
        }

        return palabra;
    }

    obtenerTiempoRestante(inicioTiempo) {
        const tiempoTranscurrido = Date.now() - inicioTiempo;
        const tiempoRestante = this.tiempoLimite - tiempoTranscurrido;
        return Math.max(0, Math.ceil(tiempoRestante / 1000));
    }

    formatearTiempo(segundos) {
        const minutos = Math.floor(segundos / 60);
        const segs = segundos % 60;
        return `${minutos}:${segs.toString().padStart(2, '0')}`;
    }
}

const gameInstance = new WordFindGame();

let handler = async (m, { conn, text, usedPrefix }) => {
    const chatId = m.chat;
    const userId = m.sender;

    if (!text) {
        const ayuda = `🔤 *SOPA DE LETRAS* 🔤

📋 *CÓMO JUGAR:*
• Encuentra las palabras ocultas en el tablero
• Las palabras pueden estar en cualquier dirección:
  - Horizontal (→)
  - Vertical (↓)
  - Diagonal (↘ ↙)
• Tienes 2 minutos para encontrar todas

🎮 *COMANDOS:*
• \`${usedPrefix}wordfind nuevo\` - Iniciar juego
• \`${usedPrefix}wordfind PALABRA f1 c1 f2 c2\` - Buscar palabra específica
• \`${usedPrefix}wordfind f c\` - Buscar palabra que inicie en esa posición

📍 *EJEMPLOS:*
• \`${usedPrefix}wordfind GATO 1 1 1 4\` (horizontal)
• \`${usedPrefix}wordfind SOL 3 5 5 7\` (diagonal)
• \`${usedPrefix}wordfind 2 3\` (buscar desde fila 2, col 3)

💎 *RECOMPENSAS:*
• ${gameInstance.recompensas.expPorPalabra} EXP por palabra
• ${gameInstance.recompensas.diamantesPorPalabra} 💎 por palabra
• Bonus: ${gameInstance.recompensas.bonusCompletado.exp} EXP + ${gameInstance.recompensas.bonusCompletado.diamantes} 💎 si completas todo

🌟 *¡Todos pueden participar en el mismo juego!*`;

        return conn.reply(chatId, ayuda, m);
    }

    const args = text.trim().split(/\s+/);
    const comando = args[0].toLowerCase();

    if (comando === 'nuevo') {
        const { tablero, palabras } = gameInstance.generarSopaDeLetras();
        juegosActivos.set(chatId, {
            tablero,
            palabras,
            encontradas: [],
            intentos: 0,
            inicioTiempo: Date.now()
        });

        let respuesta = gameInstance.formatearTablero(tablero);
        respuesta += '\n🎯 *Palabras a encontrar:*\n';
        respuesta += palabras.map(p => `• ${p}`).join('\n');
        respuesta += `\n\n⏰ Tiempo: 2:00 minutos`;
        respuesta += `\n💎 Recompensa: ${gameInstance.recompensas.expPorPalabra} EXP + ${gameInstance.recompensas.diamantesPorPalabra} 💎 por palabra`;
        respuesta += `\n\n🔍 Usa: \`${usedPrefix}wordfind PALABRA f1 c1 f2 c2\` para buscar`;
        return conn.reply(chatId, respuesta, m);
    }

    const juego = juegosActivos.get(chatId);
    if (!juego) {
        return conn.reply(chatId, `❌ No hay juego activo.\nUsa \`${usedPrefix}wordfind nuevo\` para empezar.`, m);
    }

    // Verificar tiempo
    const tiempoRestante = gameInstance.obtenerTiempoRestante(juego.inicioTiempo);
    if (tiempoRestante <= 0) {
        juegosActivos.delete(chatId);
        const faltantes = juego.palabras.filter(p => !juego.encontradas.includes(p));
        let mensaje = `⏰ *¡TIEMPO AGOTADO!*\n\n`;
        mensaje += `✅ Encontraste: ${juego.encontradas.length}/${juego.palabras.length} palabras\n`;
        
        if (juego.encontradas.length > 0) {
            const expGanada = juego.encontradas.length * gameInstance.recompensas.expPorPalabra;
            const diamantesGanados = juego.encontradas.length * gameInstance.recompensas.diamantesPorPalabra;
            
            // No se dan recompensas aquí porque ya se dieron durante el juego
            
            mensaje += `\n🎁 *Recompensas obtenidas durante el juego:*\n`;
            mensaje += `• ${expGanada} EXP\n`;
            mensaje += `• ${diamantesGanados} 💎 Diamantes`;
        }
        
        if (faltantes.length > 0) {
            mensaje += `\n\n❌ *Palabras faltantes:*\n${faltantes.join(', ')}`;
        }
        
        return conn.reply(chatId, mensaje, m);
    }

    // Verificar si el usuario es el mismo que inició el juego
    // Eliminamos esta verificación para permitir que cualquiera juegue

    if (args.length === 5) {
        // Formato: PALABRA f1 c1 f2 c2
        const palabra = args[0].toUpperCase();
        const [f1, c1, f2, c2] = args.slice(1).map(n => parseInt(n));
        
        if (isNaN(f1) || isNaN(c1) || isNaN(f2) || isNaN(c2)) {
            return conn.reply(chatId, '❌ Las coordenadas deben ser números.\nEjemplo: `wordfind GATO 1 1 1 4`', m);
        }

        if (!juego.palabras.includes(palabra)) {
            return conn.reply(chatId, '❌ Esa palabra no está en la lista de palabras a encontrar.', m);
        }

        if (juego.encontradas.includes(palabra)) {
            return conn.reply(chatId, '✅ Ya encontraste esa palabra anteriormente.', m);
        }

        juego.intentos++;
        
        if (gameInstance.verificarPalabra(juego.tablero, palabra, f1, c1, f2, c2)) {
            juego.encontradas.push(palabra);
            
            // Dar recompensas
            addExp(userId, gameInstance.recompensas.expPorPalabra);
            addMoney(userId, gameInstance.recompensas.diamantesPorPalabra);
            
            let mensaje = `🎉 *¡CORRECTO!* ${m.pushName || 'Jugador'} encontró *${palabra}*\n`;
            mensaje += `📊 Progreso: ${juego.encontradas.length}/${juego.palabras.length}\n`;
            mensaje += `🎁 +${gameInstance.recompensas.expPorPalabra} EXP, +${gameInstance.recompensas.diamantesPorPalabra} 💎 para ${m.pushName || 'el jugador'}\n`;
            mensaje += `⏰ Tiempo restante: ${gameInstance.formatearTiempo(tiempoRestante)}`;
            
            // Verificar si completó el juego
            if (juego.encontradas.length === juego.palabras.length) {
                addExp(userId, gameInstance.recompensas.bonusCompletado.exp);
                addMoney(userId, gameInstance.recompensas.bonusCompletado.diamantes);
                
                mensaje += `\n\n🏆 *¡JUEGO COMPLETADO POR ${m.pushName || 'JUGADOR'}!*\n`;
                mensaje += `🎁 Bonus final: +${gameInstance.recompensas.bonusCompletado.exp} EXP, +${gameInstance.recompensas.bonusCompletado.diamantes} 💎`;
                
                juegosActivos.delete(chatId);
            }
            
            return conn.reply(chatId, mensaje, m);
        } else {
            return conn.reply(chatId, `❌ Incorrecto. *${palabra}* no está en esas coordenadas.\n⏰ Tiempo restante: ${gameInstance.formatearTiempo(tiempoRestante)}`, m);
        }
        
    } else if (args.length === 2) {
        // Buscar palabra que empieza en fila,col
        const [f, c] = args.map(n => parseInt(n));
        if (isNaN(f) || isNaN(c)) {
            return conn.reply(chatId, '❌ Usa dos números válidos.\nEjemplo: `wordfind 3 5`', m);
        }
        
        if (f < 1 || f > 10 || c < 1 || c > 10) {
            return conn.reply(chatId, '❌ Las coordenadas deben estar entre 1 y 10.', m);
        }

        const t = juego.tablero;
        juego.intentos++;

        for (const palabra of juego.palabras) {
            if (juego.encontradas.includes(palabra)) continue;
            
            const direcciones = { 
                horizontal: [0,1], 
                vertical: [1,0], 
                diagonal: [1,1], 
                diagonalInversa: [1,-1] 
            };
            
            for (const [dirNombre, [df, dc]] of Object.entries(direcciones)) {
                const f2 = f + df * (palabra.length - 1);
                const c2 = c + dc * (palabra.length - 1);
                
                if (gameInstance.verificarPalabra(t, palabra, f, c, f2, c2)) {
                    juego.encontradas.push(palabra);
                    
                    // Dar recompensas
                    addExp(userId, gameInstance.recompensas.expPorPalabra);
                    addMoney(userId, gameInstance.recompensas.diamantesPorPalabra);
                    
                    let mensaje = `✅ *¡PERFECTO!* ${m.pushName || 'Jugador'} encontró: *${palabra}* (${dirNombre})\n`;
                    mensaje += `📊 Progreso: ${juego.encontradas.length}/${juego.palabras.length}\n`;
                    mensaje += `🎁 +${gameInstance.recompensas.expPorPalabra} EXP, +${gameInstance.recompensas.diamantesPorPalabra} 💎 para ${m.pushName || 'el jugador'}\n`;
                    mensaje += `⏰ Tiempo restante: ${gameInstance.formatearTiempo(tiempoRestante)}`;
                    
                    // Verificar si completó el juego
                    if (juego.encontradas.length === juego.palabras.length) {
                        addExp(userId, gameInstance.recompensas.bonusCompletado.exp);
                        addMoney(userId, gameInstance.recompensas.bonusCompletado.diamantes);
                        
                        mensaje += `\n\n🏆 *¡JUEGO COMPLETADO POR ${m.pushName || 'JUGADOR'}!*\n`;
                        mensaje += `🎁 Bonus final: +${gameInstance.recompensas.bonusCompletado.exp} EXP, +${gameInstance.recompensas.bonusCompletado.diamantes} 💎`;
                        
                        juegosActivos.delete(chatId);
                    }
                    
                    return conn.reply(chatId, mensaje, m);
                }
            }
        }

        return conn.reply(chatId, `❌ No hay ninguna palabra comenzando en (${f}, ${c})\n⏰ Tiempo restante: ${gameInstance.formatearTiempo(tiempoRestante)}`, m);
        
    } else {
        return conn.reply(chatId, `❌ Formato incorrecto.\n\n*Opciones:*\n• \`${usedPrefix}wordfind PALABRA f1 c1 f2 c2\`\n• \`${usedPrefix}wordfind f c\`\n• \`${usedPrefix}wordfind nuevo\``, m);
    }
};

handler.command = /^(wordfind|sopa|soup)$/i;
handler.tags = ['game'];
handler.help = ['wordfind'];

export default handler;