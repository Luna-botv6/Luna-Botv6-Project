import { loadAntiSpam, saveAntiSpam } from '../lib/antispamDB.js'
import { logSpamWarning, logSpamBan, logOwnerSpam } from '../lib/antispamLogger.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const SPAM_THRESHOLD = 12
const INTERVAL_MS = 30 * 1000
const MESSAGE_LENGTH_LIMIT = 6000
const WARNINGS_BEFORE_BAN_GROUP = 3
const WARNINGS_BEFORE_BAN_PRIVATE = 1
const WARNING_COOLDOWN = 2 * 60 * 1000

global.antispamActivo = true

const frasesOwnerSpam = [
  '🤖 *Jajaja casi te bloqueo...* Te salvaste por ser *owner*, si no ya estarías en la lista negra. Te estoy vigilando... 👀🔥',
  '⚠️ ¡Cuidado, humano poderoso! Si no fueras el jefe ya estarías frito...',
  '😏 ¿Spameando, eh? Menos mal que sos el dueñ@... si no te daba ban directo.',
  '😂 ¡Otro mensaje más y te bloqueo por accidente! Mentira... ¿o no?',
  '🧐 Estás abusando del poder, mi rey. Como no eres un simple mortal, te perdono esta vez.',
  '👽 Los bots también tenemos límites... ¡pero tú eres intocable!',
]

function getRealSender(sender, conn) {
  if (sender.includes('@lid')) {
    const decoded = conn.decodeJid(sender);
    return decoded || sender;
  }
  return sender;
}

export async function before(m, { isCommand, conn }) {
  if (!global.antispamActivo || !m.sender || m.isBaileys || m.fromMe || !m.text) return
  
  const sender = getRealSender(m.sender, conn)
  const senderNum = sender.split('@')[0]
  const isOwner = global.owner.some(([num]) => senderNum === num) || global.lidOwners.includes(senderNum)
  const now = Date.now()
  const isLargo = m.text.length > MESSAGE_LENGTH_LIMIT
  const isGroup = m.chat.endsWith('@g.us')
  
  const antispam = loadAntiSpam()
  antispam[sender] = antispam[sender] || { 
    count: 0, 
    lastTime: 0, 
    warns: 0, 
    lastWarnTime: 0,
    totalMessages: 0,
    comandos: [],
    firstDetection: Date.now()
  }
  const data = antispam[sender]
  
  if (!m.text.startsWith('/') && !isLargo) return
  
  data.totalMessages += 1
  
  if (m.text.startsWith('/')) {
    const comando = m.text.split(' ')[0]
    if (!data.comandos) data.comandos = []
    data.comandos.push(`${comando} (${new Date().toLocaleTimeString('es-ES')})`)
    if (data.comandos.length > 50) {
      data.comandos = data.comandos.slice(-50)
    }
  }
  
  if (now - data.lastTime < INTERVAL_MS) {
    data.count += 1
  } else {
    data.count = 1
  }
  data.lastTime = now
  
  let groupName = null
  if (isGroup) {
    try {
      const groupData = await getGroupDataForPlugin(conn, m.chat, sender)
      groupName = groupData.groupMetadata?.subject || null
    } catch (e) {}
  }
  
  const context = {
    isGroup,
    chatId: m.chat,
    groupName,
    intervalSeconds: INTERVAL_MS / 1000,
    warningsLimit: isGroup ? WARNINGS_BEFORE_BAN_GROUP : WARNINGS_BEFORE_BAN_PRIVATE
  }
  
  if (isOwner) {
    if (data.count > SPAM_THRESHOLD || isLargo) {
      const frase = frasesOwnerSpam[Math.floor(Math.random() * frasesOwnerSpam.length)]
      await conn.sendMessage(m.chat, { text: frase }, { quoted: m })
      logOwnerSpam(sender, data.comandos || [], context)
    }
    saveAntiSpam(antispam)
    return
  }
  
  const warningsLimit = context.warningsLimit
  
  if (data.count > SPAM_THRESHOLD || isLargo) {
    if (now - data.lastWarnTime < WARNING_COOLDOWN) {
      saveAntiSpam(antispam)
      return
    }
    
    data.warns += 1
    data.lastWarnTime = now
    
    if (data.warns >= warningsLimit) {
      const [ownerJid] = global.owner[0]
      
      const users = global.db.data.users
      if (!users[sender]) {
        users[sender] = {}
      }
      users[sender].banned = true

      try {
        const lidOwnersList = (global.lidOwners || []).map(x => String(x).replace(/[^0-9]/g, ''));
        const ownersToNotify = (global.owner || [])
          .map(([num]) => String(num).replace(/[^0-9]/g, ''))
          .filter(num => num.length >= 10 && !lidOwnersList.includes(num));

        const ownerMsg = `🚨 Anti-Spam Activado

Usuario: @${senderNum}
Acción: Bloqueado y baneado por spam
Contexto: ${isGroup ? 'Grupo' : 'Chat privado'}
${isGroup && groupName ? `Grupo: ${groupName}` : ''}
ID: ${sender}

📊 Estadísticas:
• Advertencias: ${data.warns}/${warningsLimit}
• Mensajes totales: ${data.totalMessages}
• Último conteo: ${data.count} mensajes en ${INTERVAL_MS/1000}s

⚠️ El usuario ya no podrá usar comandos del bot.
📝 Logs guardados en: logs_bans/`

        for (const ownerNum of ownersToNotify) {
          try {
            const jidOwner = `${ownerNum}@s.whatsapp.net`;
            await new Promise((resolve, reject) => {
              conn.sendMessage(jidOwner, { text: ownerMsg, mentions: [sender] })
                .then(resolve)
                .catch(reject);
              setTimeout(() => reject(new Error('Timeout')), 5000);
            });
          } catch (e) {
            console.error(`Error notificando owner ${ownerNum} antispam:`, e.message);
          }
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (e) {
        console.error('Error notificando owners antispam:', e.message);
      }
      
      const mensajeBan = `⛔ Has sido bloqueado y baneado por spam.

❌ Advertencias recibidas: ${data.warns}/${warningsLimit}
📋 Motivo: Exceso de comandos (${data.count} en ${INTERVAL_MS/1000}s)
📍 Ubicación: ${isGroup ? 'Grupo' : 'Chat privado'}

El bot ya no responderá a tus comandos.

Si crees que fue un error, contacta al owner:
📱 wa.me/${ownerJid}`

      await conn.sendMessage(m.chat, { text: mensajeBan }, { quoted: m })
      
      logSpamBan(sender, data, data.comandos || [], context)
      
      await conn.updateBlockStatus(sender, 'block')
      
      global.db.data.baneados = global.db.data.baneados || {}
      global.db.data.baneados[sender] = {
        motivo: 'spam automatico',
        fecha: Date.now(),
        bloqueadoPor: 'antispam',
        advertencias: data.warns,
        mensajesTotales: data.totalMessages,
        ultimoConteo: data.count,
        contexto: isGroup ? 'grupo' : 'privado',
        comandos: data.comandos || []
      }
      
      delete antispam[sender]
      saveAntiSpam(antispam)
      return !0
      
    } else {
      const mensajeAdvertencia = `🚨 Advertencia ${data.warns}/${warningsLimit} de spam

⚠️ Detectamos ${data.count} comandos en ${INTERVAL_MS/1000} segundos.

📝 Límites actuales:
• Máximo ${SPAM_THRESHOLD} comandos por cada ${INTERVAL_MS/1000} segundos
• Máximo ${MESSAGE_LENGTH_LIMIT} caracteres por mensaje

⏰ Espera un momento antes de continuar usando comandos.

❌ Si recibes ${warningsLimit} advertencias serás bloqueado permanentemente.`

      await conn.sendMessage(m.chat, { text: mensajeAdvertencia }, { quoted: m })
      
      logSpamWarning(sender, data, data.comandos || [], context)
    }
  }
  
  antispam[sender] = data
  saveAntiSpam(antispam)
}