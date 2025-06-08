import fs from 'fs'
import path from 'path'
import { getUserStats, removeHackTools, addMoney, removeExp } from './stats.js'
import { eliminarProteccion, tieneProteccion } from './usarprote.js'

// Configuración del sistema de hackeo
const HACK_CONFIG = {
  // Costo base por intento de hackeo
  costoPorIntento: 1, // 1 hackTool por intento
  
  // Probabilidades de éxito según duración de protección
  probabilidades: {
    2: 70,   // 70% éxito para protección de 2 horas
    5: 50,   // 50% éxito para protección de 5 horas  
    12: 30,  // 30% éxito para protección de 12 horas
    24: 15   // 15% éxito para protección de 24 horas
  },
  
  // Penalizaciones por fallo
  penalizacionExp: 500,     // Pierdes 500 exp si fallas
  penalizacionDiamantes: 50, // Pierdes 50 diamantes si fallas
  
  // Cooldown después de hackear (exitoso o no)
  cooldown: 60 * 60 * 1000 // 60 minutos (1 hora)
}

const HACK_COOLDOWN_FILE = './database/hackCooldown.json'

function loadHackCooldowns() {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database')
  if (!fs.existsSync(HACK_COOLDOWN_FILE)) fs.writeFileSync(HACK_COOLDOWN_FILE, '{}')
  
  try {
    return JSON.parse(fs.readFileSync(HACK_COOLDOWN_FILE))
  } catch {
    return {}
  }
}

function saveHackCooldowns(data) {
  fs.writeFileSync(HACK_COOLDOWN_FILE, JSON.stringify(data, null, 2))
}

// Función principal para romper protección
export async function romperProteccion(hackerId, targetId) {
  const hacker = getUserStats(hackerId)
  const cooldowns = loadHackCooldowns()
  
  // Verificar cooldown
  const now = Date.now()
  const lastHack = cooldowns[hackerId] || 0
  if (now < lastHack + HACK_CONFIG.cooldown) {
    const timeLeft = Math.ceil((lastHack + HACK_CONFIG.cooldown - now) / (1000 * 60))
    return {
      exito: false,
      mensaje: `⏳ Debes esperar ${timeLeft} minutos antes de intentar hackear otra vez.`,
      tipo: 'cooldown'
    }
  }
  
  // Verificar si el objetivo tiene protección usando la función de usarprote.js
  const proteccionStatus = tieneProteccion(targetId)
  if (!proteccionStatus.activa) {
    return {
      exito: false,
      mensaje: '❌ El objetivo no tiene protección activa.',
      tipo: 'sin_proteccion'
    }
  }
  
  // Verificar si el hacker tiene herramientas suficientes
  if (hacker.hackTools < HACK_CONFIG.costoPorIntento) {
    return {
      exito: false,
      mensaje: '❌ No tienes suficientes Herramientas de Hackeo. Necesitas al menos 1.',
      tipo: 'sin_herramientas'
    }
  }
  
  // Verificar recursos para penalización
  if (hacker.exp < HACK_CONFIG.penalizacionExp || hacker.money < HACK_CONFIG.penalizacionDiamantes) {
    return {
      exito: false,
      mensaje: '❌ No tienes suficientes recursos para arriesgar este hackeo (necesitas al menos 500 exp y 50 diamantes).',
      tipo: 'recursos_insuficientes'
    }
  }
  
  // Consumir herramienta
  removeHackTools(hackerId, HACK_CONFIG.costoPorIntento)
  
  // Establecer cooldown
  cooldowns[hackerId] = now
  saveHackCooldowns(cooldowns)
  
  // Calcular probabilidad de éxito usando la duración de la protección actual
  const duracionHoras = proteccionStatus.duracionHoras || 2
  const probabilidadExito = HACK_CONFIG.probabilidades[duracionHoras] || 20
  
  // Intentar hackeo
  const exito = Math.random() * 100 < probabilidadExito
  
  if (exito) {
    // Éxito: Eliminar protección usando la función de usarprote.js
    const eliminado = eliminarProteccion(targetId)
    
    if (eliminado) {
      return {
        exito: true,
        mensaje: `✅ ¡Hackeo exitoso! Has roto la protección de ${duracionHoras} horas del objetivo.`,
        tipo: 'exito',
        duracionHackeada: duracionHoras
      }
    } else {
      return {
        exito: false,
        mensaje: '❌ Error interno al eliminar la protección.',
        tipo: 'error'
      }
    }
  } else {
    // Fallo: Aplicar penalizaciones
    removeExp(hackerId, HACK_CONFIG.penalizacionExp)
    addMoney(hackerId, -HACK_CONFIG.penalizacionDiamantes)
    
    return {
      exito: false,
      mensaje: `❌ Hackeo fallido. Perdiste ${HACK_CONFIG.penalizacionExp} exp y ${HACK_CONFIG.penalizacionDiamantes} diamantes. La protección sigue activa.`,
      tipo: 'fallo',
      penalizaciones: {
        exp: HACK_CONFIG.penalizacionExp,
        diamantes: HACK_CONFIG.penalizacionDiamantes
      }
    }
  }
}

// Función para obtener información sobre el sistema
export function getHackInfo() {
  return {
    costo: HACK_CONFIG.costoPorIntento,
    probabilidades: HACK_CONFIG.probabilidades,
    penalizaciones: {
      exp: HACK_CONFIG.penalizacionExp,
      diamantes: HACK_CONFIG.penalizacionDiamantes
    },
    cooldown: HACK_CONFIG.cooldown / (1000 * 60) // en minutos
  }
}

// Función para verificar si alguien puede hackear
export function puedeHackear(hackerId) {
  const hacker = getUserStats(hackerId)
  const cooldowns = loadHackCooldowns()
  const now = Date.now()
  const lastHack = cooldowns[hackerId] || 0
  
  return {
    puedeHackear: now >= lastHack + HACK_CONFIG.cooldown,
    tieneHerramientas: hacker.hackTools >= HACK_CONFIG.costoPorIntento,
    tieneRecursos: hacker.exp >= HACK_CONFIG.penalizacionExp && hacker.money >= HACK_CONFIG.penalizacionDiamantes,
    cooldownRestante: Math.max(0, Math.ceil((lastHack + HACK_CONFIG.cooldown - now) / (1000 * 60)))
  }
}