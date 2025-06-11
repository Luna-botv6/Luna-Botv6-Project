import { loadAntiSpam, saveAntiSpam } from '../lib/antispamDB.js'

// Configuración más permisiva
const SPAM_THRESHOLD = 12      // Aumentado de 6 a 12 mensajes
const INTERVAL_MS = 30 * 1000  // Aumentado de 20 a 30 segundos
const MESSAGE_LENGTH_LIMIT = 6000  // Aumentado de 4000 a 6000 caracteres
const WARNINGS_BEFORE_BAN = 5  // Aumentado de 3 a 5 advertencias
const WARNING_COOLDOWN = 2 * 60 * 1000  // 2 minutos de cooldown entre advertencias

global.antispamActivo = true

const frasesOwnerSpam = [
  '🤖 *Jajaja casi te bloqueo...* Te salvaste por ser *owner*, si no ya estarías en la lista negra. Te estoy vigilando... 👀🔥',
  '⚠️ ¡Cuidado, humano poderoso! Si no fueras el jefe ya estarías frito...',
  '😏 ¿Spameando, eh? Menos mal que sos el dueñ@... si no te daba ban directo.',
  '😂 ¡Otro mensaje más y te bloqueo por accidente! Mentira... ¿o no?',
  '🧐 Estás abusando del poder, mi rey. Como no eres un simple mortal, te perdono esta vez.',
  '👽 Los bots también tenemos límites... ¡pero tú eres intocable!',
]

export async function before(m, { isCommand, conn }) {
  if (!global.antispamActivo || !m.sender || m.isBaileys || m.fromMe || !m.text) return
  
  const sender = m.sender
  const senderNum = sender.split('@')[0]
  const isOwner = global.owner.some(([num]) => senderNum === num) || global.lidOwners.includes(senderNum)
  const now = Date.now()
  const isLargo = m.text.length > MESSAGE_LENGTH_LIMIT
  
  const antispam = loadAntiSpam()
  antispam[sender] = antispam[sender] || { 
    count: 0, 
    lastTime: 0, 
    warns: 0, 
    lastWarnTime: 0,
    totalMessages: 0
  }
  const data = antispam[sender]
  
  // Solo contar mensajes que empiecen con / o que sean largos, ignorar el resto
  if (!m.text.startsWith('/') && !isLargo) return
  
  // Incrementar contador total de mensajes para estadísticas
  data.totalMessages += 1
  
  // Si estamos dentro del intervalo, incrementar conteo, sino resetear a 1
  if (now - data.lastTime < INTERVAL_MS) {
    data.count += 1
  } else {
    data.count = 1
  }
  data.lastTime = now
  
  // Manejo especial para owners
  if (isOwner) {
    if (data.count > SPAM_THRESHOLD || isLargo) {
      const frase = frasesOwnerSpam[Math.floor(Math.random() * frasesOwnerSpam.length)]
      await conn.sendMessage(sender, { text: frase })
    }
    saveAntiSpam(antispam)
    return
  }
  
  // Sistema de advertencias más permisivo
  if (data.count > SPAM_THRESHOLD || isLargo) {
    // Verificar cooldown de advertencias (no advertir muy seguido)
    if (now - data.lastWarnTime < WARNING_COOLDOWN) {
      saveAntiSpam(antispam)
      return // No dar advertencia si está en cooldown
    }
    
    data.warns += 1
    data.lastWarnTime = now
    
    if (data.warns >= WARNINGS_BEFORE_BAN) {
      // Bloqueo y ban después de más advertencias
      const [ownerJid] = global.owner[0]
      const ownerFullJid = `${ownerJid}@s.whatsapp.net`
      
      // Aplicar BAN al usuario
      const users = global.db.data.users
      if (!users[sender]) {
        users[sender] = {}
      }
      users[sender].banned = true
      
      // Notificar al owner con más información
      await conn.sendMessage(ownerFullJid, {
        text: `🚨 Anti-Spam Activado\n\nEl usuario @${senderNum} fue bloqueado y baneado por spam.\nID: ${sender}\n\n📊 Estadísticas:\n• Advertencias: ${data.warns}/${WARNINGS_BEFORE_BAN}\n• Mensajes totales detectados: ${data.totalMessages}\n• Último conteo: ${data.count} mensajes en ${INTERVAL_MS/1000}s\n\n⚠️ El usuario ya no podrá usar comandos del bot.`,
        mentions: [sender]
      })
      
      // Notificar al usuario
      await conn.sendMessage(sender, {
        text: `⛔ Has sido bloqueado y baneado por enviar demasiados comandos seguidos.\n\n❌ Recibiste ${data.warns} advertencias y ya no podrás usar los comandos del bot.\n\n📋 Motivo: Exceso de comandos (${data.count} comandos en ${INTERVAL_MS/1000} segundos)\n\nSi crees que fue un error, contacta con el owner:\n📱 wa.me/${ownerJid}`
      })
      
      // Bloquear al usuario
      await conn.updateBlockStatus(sender, 'block')
      
      // Guardar en la base de datos de baneados
      global.db.data.baneados = global.db.data.baneados || {}
      global.db.data.baneados[sender] = {
        motivo: 'spam automatico',
        fecha: Date.now(),
        bloqueadoPor: 'antispam',
        advertencias: data.warns,
        mensajesTotales: data.totalMessages,
        ultimoConteo: data.count
      }
      
      // Limpiar datos del antispam para este usuario
      delete antispam[sender]
      saveAntiSpam(antispam)
      return !0
      
    } else {
      // Advertencia más informativa
      const tiempoRestante = Math.ceil((WARNING_COOLDOWN - (now - data.lastWarnTime)) / 1000)
      await conn.sendMessage(sender, {
        text: `🚨 Advertencia ${data.warns}/${WARNINGS_BEFORE_BAN} de spam\n\n⚠️ Detectamos ${data.count} comandos en ${INTERVAL_MS/1000} segundos.\n\n📝 Límites actuales:\n• Máximo ${SPAM_THRESHOLD} comandos por cada ${INTERVAL_MS/1000} segundos\n• Máximo ${MESSAGE_LENGTH_LIMIT} caracteres por mensaje\n\n⏰ Espera un momento antes de continuar usando comandos.\n\n❌ Si recibes ${WARNINGS_BEFORE_BAN} advertencias serás bloqueado permanentemente.`
      })
    }
  }
  
  antispam[sender] = data
  saveAntiSpam(antispam)
}