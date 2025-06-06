import { loadAntiSpam, saveAntiSpam } from '../lib/antispamDB.js'

const SPAM_THRESHOLD = 6       // Permitimos hasta 6 mensajes en el intervalo antes de advertir
const INTERVAL_MS = 20 * 1000  // 20 segundos de ventana para contar mensajes
const MESSAGE_LENGTH_LIMIT = 4000

global.antispamActivo = true

const frasesOwnerSpam = [
  '🤖 *Jajaja casi te bloqueo...* Te salvaste por ser *owner*, si no ya estarías en la lista negra. Te estoy vigilando... �👀🔥',
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
  antispam[sender] = antispam[sender] || { count: 0, lastTime: 0, warns: 0 }

  const data = antispam[sender]

  // Solo contar mensajes que empiecen con / o que sean largos, ignorar el resto
  if (!m.text.startsWith('/') && !isLargo) return

  // Si estamos dentro del intervalo, incrementar conteo, sino resetear a 1
  if (now - data.lastTime < INTERVAL_MS) data.count += 1
  else data.count = 1

  data.lastTime = now

  if (isOwner) {
    if (data.count > SPAM_THRESHOLD || isLargo) {
      const frase = frasesOwnerSpam[Math.floor(Math.random() * frasesOwnerSpam.length)]
      await conn.sendMessage(sender, { text: frase })
    }
    saveAntiSpam(antispam)
    return
  }

  if (data.count > SPAM_THRESHOLD || isLargo) {
    data.warns += 1

    if (data.warns >= 3) { // Bloquea y banea después de 3 advertencias
      const [ownerJid] = global.owner[0]
      const ownerFullJid = `${ownerJid}@s.whatsapp.net`

      // Aplicar BAN al usuario (similar a banuser.js)
      const users = global.db.data.users
      if (!users[sender]) {
        users[sender] = {}
      }
      users[sender].banned = true

      // Notificar al owner
      await conn.sendMessage(ownerFullJid, {
        text: `🚨 *Anti-Spam Activado*\n\nEl usuario *@${senderNum}* fue bloqueado y baneado por spam.\nID: ${sender}\n\n⚠️ El usuario ya no podrá usar comandos del bot.`,
        mentions: [sender]
      })

      // Notificar al usuario
      await conn.sendMessage(sender, {
        text: `⛔ Has sido *bloqueado y baneado* por enviar muchos comandos o mensajes largos.\n\n❌ Ya no podrás usar los comandos del bot.\n\nSi crees que fue un error, contacta con el owner:\n📱 wa.me/${ownerJid}`
      })

      // Bloquear al usuario
      await conn.updateBlockStatus(sender, 'block')

      // Guardar en la base de datos de baneados (registro adicional)
      global.db.data.baneados = global.db.data.baneados || {}
      global.db.data.baneados[sender] = {
        motivo: 'spam automatico',
        fecha: Date.now(),
        bloqueadoPor: 'antispam',
        advertencias: data.warns
      }

      // Limpiar datos del antispam para este usuario
      delete antispam[sender]
      saveAntiSpam(antispam)
      return !0
    } else {
      await conn.sendMessage(sender, {
        text: `🚨 *Advertencia ${data.warns}/3 de spam*\n\nEstás enviando demasiados comandos o mensajes sospechosos.\n\n⚠️ Si recibes 3 advertencias serás bloqueado y baneado permanentemente.`
      })
    }
  }

  antispam[sender] = data
  saveAntiSpam(antispam)
}