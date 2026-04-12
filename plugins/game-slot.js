import { getUserStats, addExp, removeExp, getExp } from '../lib/stats.js';
import fs from 'fs';

const cooldownUsuario = 10 * 1000; // 10 segundos
const MIN_APUESTA = 100;
const MAX_APUESTA = 10000; // Límite máximo para prevenir apuestas excesivas
const emojis = ['🍒', '🍋', '🍊', '🍉', '🔔', '⭐', '💎']; 


const slotFile = './database/slot.json';

async function readSlot() {
  try {
    const data = await fs.promises.readFile(slotFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeSlot(data) {
  await fs.promises.writeFile(slotFile, JSON.stringify(data, null, 2));
}

async function canPlay(userId) {
  const slotData = await readSlot();
  const lastPlay = slotData[userId]?.lastPlay || 0;
  return (Date.now() - lastPlay) > cooldownUsuario;
}

async function setCooldown(userId) {
  const slotData = await readSlot();
  slotData[userId] = { lastPlay: Date.now() };
  await writeSlot(slotData);
}

const handler = async (m, { args, usedPrefix, command }) => {
  try {
    // Validación de base de datos del usuario
    if (!global.db.data.users[m.sender]) {
      global.db.data.users[m.sender] = {};
    }
    
    const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje;
    
    let _translate, tradutor;
    try {
      _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
      tradutor = _translate.plugins.game?.slot || _translate.plugins?.game_slot || {
        texto1: "🎰 *SLOT MACHINE*",
        texto2: "Usa el comando con una apuesta:",
        texto3: ["Espera", "para volver a jugar"],
        texto4: "La apuesta mínima es 100 XP",
        texto5: "No tienes suficiente XP",
        texto6: "¡JACKPOT! Ganaste",
        texto7: "¡Bien! Ganaste",
        texto8: "Perdiste"
      };
    } catch (langError) {
      console.error('Error cargando idioma:', langError);
      // Fallback a español por defecto
      tradutor = {
        texto1: "🎰 *SLOT MACHINE*",
        texto2: "Usa el comando con una apuesta:",
        texto3: ["Espera", "para volver a jugar"],
        texto4: "La apuesta mínima es 100 XP",
        texto5: "No tienes suficiente XP",
        texto6: "¡JACKPOT! Ganaste",
        texto7: "¡Bien! Ganaste",
        texto8: "Perdiste"
      };
    }
    
    const mensajeUso = `
${tradutor.texto1}
${tradutor.texto2}
*${usedPrefix + command} 100*
📊 Apuesta mínima: ${MIN_APUESTA} XP
📊 Apuesta máxima: ${MAX_APUESTA} XP`.trim();

    // Validación de argumentos
    if (!args[0]) throw mensajeUso;
    if (isNaN(args[0])) throw `❌ Debes ingresar un número válido\n\n${mensajeUso}`;
    
    const apuesta = parseInt(args[0]);
    
    // Validaciones de apuesta
    if (apuesta <= 0) throw `❌ La apuesta debe ser un número positivo`;
    if (apuesta < MIN_APUESTA) throw `❌ ${tradutor.texto4}\nApuesta mínima: ${MIN_APUESTA} XP`;
    if (apuesta > MAX_APUESTA) throw `❌ Apuesta máxima permitida: ${MAX_APUESTA} XP`;

    // Anti-spam individual
    const puedeJugar = await canPlay(m.sender);
    if (!puedeJugar) {
      const restante = await tiempoRestante(m.sender);
      throw `⏰ ${tradutor.texto3[0]} ${restante} ${tradutor.texto3[1]}`;
    }

    // Verificar saldo
    const expActual = getExp(m.sender);
    if (expActual < apuesta) {
      throw `💰 ${tradutor.texto5}\nTu saldo: ${expActual} XP\nApuesta: ${apuesta} XP`;
    }

    // Generar 3x3 slots
    const randomEmoji = () => emojis[Math.floor(Math.random() * emojis.length)];
    const x = [randomEmoji(), randomEmoji(), randomEmoji()];
    const y = [randomEmoji(), randomEmoji(), randomEmoji()];
    const z = [randomEmoji(), randomEmoji(), randomEmoji()];

    // Línea central determina el resultado
    const lineaCentral = [x[1], y[1], z[1]];
    const [a, b, c] = lineaCentral;
    
    let resultado;
    let ganancia = 0;

    if (a === b && b === c) {
      // Triple - Gana el doble
      ganancia = apuesta;
      addExp(m.sender, ganancia);
      resultado = `🎉 ${tradutor.texto6} +${ganancia} XP`;
    } else if (a === b || a === c || b === c) {
      // Doble - Gana poco
      ganancia = 10;
      addExp(m.sender, ganancia);
      resultado = `🎊 ${tradutor.texto7} +${ganancia} XP`;
    } else {
      // Sin coincidencias - Pierde
      ganancia = -apuesta;
      removeExp(m.sender, apuesta);
      resultado = `💸 ${tradutor.texto8} ${ganancia} XP`;
    }

    // Establecer cooldown
    await setCooldown(m.sender);

    // Obtener saldo actualizado
    const nuevoSaldo = getExp(m.sender);

    // Respuesta mejorada
    const respuesta = `🎰 | SLOTS
━━━━━━━━━━━
${x.join(' : ')}
${y.join(' : ')} ← Línea ganadora
${z.join(' : ')}
━━━━━━━━━━━
🎰 | ${resultado}
💰 | Saldo actual: ${nuevoSaldo} XP`;

    await m.reply(respuesta);

  } catch (error) {
    // Manejo de errores mejorado
    if (typeof error === 'string') {
      // Error controlado (throw personalizado)
      await m.reply(error);
    } else {
      // Error inesperado del sistema
      console.error('Error en comando slot:', error);
      await m.reply('❌ Ocurrió un error interno. Intenta nuevamente.');
    }
  }
};

handler.help = ['slot <apuesta>'];
handler.tags = ['game'];
handler.command = ['slot'];

export default handler;

// Función auxiliar para calcular tiempo restante
async function tiempoRestante(user) {
  try {
    const db = JSON.parse(await fs.promises.readFile('./database/slot.json', 'utf8'));
    const last = db[user]?.lastPlay || 0;
    const ms = cooldownUsuario - (Date.now() - last);
    return ms > 0 ? msToTime(ms) : '0s';
  } catch (error) {
    console.error('Error leyendo cooldown:', error);
    return '0s';
  }
}

// Función auxiliar para convertir ms a tiempo legible
function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
