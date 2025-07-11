import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import qrcode from 'qrcode'
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys'
import pino from 'pino'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const activeSockets = new Map()
const subbotConnections = new Map()

const SUBBOT_COMMANDS = {
  ping: {
    handler: async (sock, m) => {
      const start = Date.now()
      await sock.sendMessage(m.chat, { text: '🏓 Pong!' }, { quoted: m })
      const end = Date.now()
      await sock.sendMessage(m.chat, { text: `⚡ Latencia: ${end - start}ms` }, { quoted: m })
    }
  },

  info: {
    handler: async (sock, m) => {
      const info = `📱 *INFORMACIÓN DEL SUBBOT*\n\n🆔 *ID:* ${sock.user.id}\n📞 *Número:* wa.me/${sock.user.id.replace(/[^0-9]/g, '')}\n⏰ *Tiempo activo:* ${formatUptime(Date.now() - sock.uptime)}\n🔄 *Versión:* 2.0\n🎯 *Tipo:* SubBot Independiente`
      await sock.sendMessage(m.chat, { text: info }, { quoted: m })
    }
  },

  uptime: {
    handler: async (sock, m) => {
      const uptime = formatUptime(Date.now() - sock.uptime)
      await sock.sendMessage(m.chat, { text: `⏰ *Tiempo activo:* ${uptime}` }, { quoted: m })
    }
  }
}

async function getCustomCommands() {
  try {
    const dir = join(process.cwd(), 'subbot-commands')
    if (!existsSync(dir)) return []
    return readdirSync(dir).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''))
  } catch (e) {
    console.error('Error leyendo comandos personalizados:', e)
    return []
  }
}

async function executeCustomCommand(command, sock, m, args) {
  try {
    const dir = join(process.cwd(), 'subbot-commands')
    const file = join(dir, `${command}.js`)
    if (!existsSync(file)) return false

    const { default: handler } = await import(`file://${file}`)
    if (typeof handler !== 'function') {
      throw new Error(`El archivo ${command}.js no exporta una función por defecto.`)
    }

    await handler(sock, m, args)
    return true
  } catch (e) {
    console.error(`❌ Error en comando personalizado "${command}":`, e)
    await sock.sendMessage(m.chat, {
      text: `❌ Error ejecutando el comando personalizado:\n${e.message}`
    }, { quoted: m })
    return true
  }
}

async function processSubBotMessage(sock, rawMessage) {
  try {
    const msg = rawMessage.messages[0]
    if (!msg.message || msg.key.fromMe) return

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    const prefix = ['/', '.', '!', '#'].find(p => text.startsWith(p))
    if (!prefix) return

    const [command, ...args] = text.slice(prefix.length).trim().split(' ')
    const cmd = command.toLowerCase()

    const m = {
      chat: msg.key.remoteJid,
      sender: msg.key.participant || msg.key.remoteJid,
      text, args, command: cmd,
      isGroup: msg.key.remoteJid.endsWith('@g.us'),
      key: msg.key,
      message: msg.message,
      quoted: msg.message.extendedTextMessage?.contextInfo?.quotedMessage
    }

    if (SUBBOT_COMMANDS[cmd]) return SUBBOT_COMMANDS[cmd].handler(sock, m)
    const found = await executeCustomCommand(cmd, sock, m, args)
    if (!found) {
      await sock.sendMessage(m.chat, {
        text: `❓ Comando "${cmd}" no encontrado.`
      }, { quoted: msg })
    }

  } catch (e) {
    console.error('Error procesando mensaje del SubBot:', e)
  }
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

async function createSubBot(jid, conn, m, useCode = false) {
  try {
    const sessionPath = `./jadibts/${jid}`
    if (!existsSync(sessionPath)) mkdirSync(sessionPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
      browser: ['SubBot', 'Chrome', '1.0.0'],
      version,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: true
    })

    sock.userJid = jid
    sock.uptime = Date.now()
    activeSockets.set(jid, sock)
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
      if (qr && !useCode) {
        const qrImage = await qrcode.toBuffer(qr, { scale: 8 })
        await conn.sendMessage(m.chat, {
          image: qrImage,
          caption: '📱 Escanea este QR para conectar tu SubBot.\n⚠️ Este código es privado.'
        }, { quoted: m })
      }

      if (qr && useCode) {
        const code = await sock.requestPairingCode(jid)
        await conn.sendMessage(m.chat, {
          text: `📱 *Código de emparejamiento:*\n\n\`\`\`${code}\`\`\``
        }, { quoted: m })
      }

      if (connection === 'open') {
        subbotConnections.set(jid, sock)
        activeSockets.delete(jid)
        sock.ev.on('messages.upsert', (update) => processSubBotMessage(sock, update))
        await conn.sendMessage(m.chat, { text: '✅ SubBot conectado.' }, { quoted: m })
      }

      if (connection === 'close') {
        activeSockets.delete(jid)
        subbotConnections.delete(jid)
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        if (shouldReconnect) {
          console.log('Reconectando...')
          setTimeout(() => createSubBot(jid, conn, m, useCode), 3000)
        } else {
          if (existsSync(sessionPath)) rmSync(sessionPath, { recursive: true, force: true })
          await conn.sendMessage(m.chat, { text: '❌ SubBot desconectado.' }, { quoted: m })
        }
      }
    })

  } catch (e) {
    console.error('Error creando SubBot:', e)
    await conn.sendMessage(m.chat, { text: `❌ Error creando SubBot: ${e.message}` }, { quoted: m })
  }
}

async function handler(m, { conn, args, command }) {
  const jid = m.sender.split('@')[0]
  const sessionPath = `./jadibts/${jid}`

  switch (command) {
    case 'jadibot':
      if (activeSockets.has(jid) || subbotConnections.has(jid)) {
        return conn.reply(m.chat, '⚠️ Ya tienes un SubBot activo. Usa /stopbot primero.', m)
      }
      const useCode = args.includes('--code')
      setImmediate(() => createSubBot(jid, conn, m, useCode))
      break

    case 'stopbot':
      const sock = activeSockets.get(jid) || subbotConnections.get(jid)
      if (!sock) return conn.reply(m.chat, '⚠️ No tienes un SubBot activo.', m)
      sock.ev.removeAllListeners()
      sock.ws?.close()
      activeSockets.delete(jid)
      subbotConnections.delete(jid)
      if (existsSync(sessionPath)) rmSync(sessionPath, { recursive: true, force: true })
      conn.reply(m.chat, '✅ SubBot detenido.', m)
      break

    case 'listbots':
      if (subbotConnections.size === 0) return conn.reply(m.chat, '📭 No hay SubBots activos.', m)
      const bots = Array.from(subbotConnections.entries())
        .map(([jid, sock], i) => `${i + 1}. wa.me/${jid} - ${formatUptime(Date.now() - sock.uptime)}`).join('\n')
      conn.reply(m.chat, `🤖 *SubBots Activos:*\n\n${bots}`, m)
      break

    case 'bcbot':
      if (!args.length) return conn.reply(m.chat, '⚠️ Proporciona un mensaje.', m)
      const msg = args.join(' ')
      let sent = 0
      for (const [jid, sock] of subbotConnections) {
        try {
          await sock.sendMessage(sock.user.id, { text: `📢 *Mensaje del Bot Principal:*\n\n${msg}` })
          sent++
          await delay(1000)
        } catch (e) {
          console.error(`Error enviando a ${jid}:`, e)
        }
      }
      conn.reply(m.chat, `📤 Mensaje enviado a ${sent} SubBots.`, m)
      break

    case 'createcmd':
      if (args.length < 2) return conn.reply(m.chat, '⚠️ Uso: /createcmd <nombre> <código>', m)
      const [cmdName, ...cmdBody] = args
      if (!/^[a-zA-Z0-9_]+$/.test(cmdName)) return conn.reply(m.chat, '❌ Nombre inválido.', m)
      const dir = join(process.cwd(), 'subbot-commands')
      if (!existsSync(dir)) mkdirSync(dir)
      writeFileSync(join(dir, `${cmdName}.js`), cmdBody.join(' '))
      conn.reply(m.chat, `✅ Comando "${cmdName}" creado correctamente.`, m)
      break
  }
}

handler.command = /^(jadibot|stopbot|listbots|bcbot|createcmd)$/i
handler.private = true

export default handler