import { readFileSync } from 'fs'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SERVER_URL = 'https://nweb.boxmine.xyz:4017'
const BOT_NAME = '🌙 *Luna-Botv6-Project*'
const PROTECTION_WORD = 'Luna-Botv6'

function checkAuth() {
  try {
    const content = readFileSync(join(__dirname, '../../config.js'), 'utf8')
    return content.includes(PROTECTION_WORD)
  } catch { return false }
}

async function safeReply(conn, jid, text, quoted) {
  try { return await conn.sendMessage(jid, { text }, { quoted }) } catch { return null }
}

async function askServer(text) {
  try {
    const res = await fetch(`${SERVER_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(35000)
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

function resolveId(rawJid, participants, conn) {
  if (!rawJid) return ''
  if (!rawJid.includes('@lid')) return conn.decodeJid(rawJid)
  const found = participants.find(u =>
    u.lid === rawJid || conn.decodeJid(u.lid || '') === conn.decodeJid(rawJid)
  )
  return found ? conn.decodeJid(found.id) : conn.decodeJid(rawJid)
}

function getAdminStatus(groupData, senderId, conn) {
  const participants = groupData?.participants || []
  const botNumber = conn.user?.id?.split('@')[0]?.split(':')[0] || ''
  const resolvedSender = resolveId(senderId, participants, conn)
  const botJidFull = conn.decodeJid(`${botNumber}@s.whatsapp.net`)
  const senderP = participants.find(p => conn.decodeJid(p.id) === resolvedSender)
  const botP = participants.find(p => conn.decodeJid(p.id) === botJidFull)
  return {
    isSenderAdmin: senderP?.admin === 'admin' || senderP?.admin === 'superadmin',
    isBotAdmin: botP?.admin === 'admin' || botP?.admin === 'superadmin'
  }
}

async function executeCommand(command, args, conn, msg, jid, context) {
  const { groupData, mentionedJids } = context
  const isGroup = jid.endsWith('@g.us')
  const senderId = msg.key?.participant || msg.key?.remoteJid || ''
  const { isSenderAdmin, isBotAdmin } = getAdminStatus(groupData, senderId, conn)

  const noAdmin = () => safeReply(conn, jid, BOT_NAME + '\n\nSolo los admins pueden hacer eso 🔒', msg)
  const noBotAdmin = () => safeReply(conn, jid, BOT_NAME + '\n\nNecesito ser admin para hacer eso 😅', msg)
  const noGroup = () => safeReply(conn, jid, BOT_NAME + '\n\nEso solo funciona en grupos 😊', msg)
  const noMention = () => safeReply(conn, jid, BOT_NAME + '\n\nMencioná a alguien con @ 😊', msg)

  switch (command) {
    case 'setname': {
      if (!isGroup) return noGroup()
      if (!isBotAdmin) return noBotAdmin()
      if (!isSenderAdmin) return noAdmin()
      if (!args) return safeReply(conn, jid, BOT_NAME + '\n\n¿Cómo querés llamar al grupo? Decime el nombre 😊', msg)
      await conn.groupUpdateSubject(jid, args)
      return safeReply(conn, jid, BOT_NAME + `\n\n✅ Nombre cambiado a: *${args}*`, msg)
    }
    case 'setdesc': {
      if (!isGroup) return noGroup()
      if (!isBotAdmin) return noBotAdmin()
      if (!isSenderAdmin) return noAdmin()
      if (!args) return safeReply(conn, jid, BOT_NAME + '\n\n¿Cuál sería la nueva descripción? 😊', msg)
      await conn.groupUpdateDescription(jid, args)
      return safeReply(conn, jid, BOT_NAME + '\n\n✅ Descripción actualizada', msg)
    }
    case 'promote': {
      if (!isGroup) return noGroup()
      if (!isBotAdmin) return noBotAdmin()
      if (!isSenderAdmin) return noAdmin()
      if (!mentionedJids?.length) return noMention()
      await conn.groupParticipantsUpdate(jid, mentionedJids, 'promote')
      return safeReply(conn, jid, BOT_NAME + `\n\n✅ Ya ${mentionedJids.length > 1 ? 'son admins' : 'es admin'} 👑`, msg)
    }
    case 'demote': {
      if (!isGroup) return noGroup()
      if (!isBotAdmin) return noBotAdmin()
      if (!isSenderAdmin) return noAdmin()
      if (!mentionedJids?.length) return noMention()
      await conn.groupParticipantsUpdate(jid, mentionedJids, 'demote')
      return safeReply(conn, jid, BOT_NAME + `\n\n✅ Ya no ${mentionedJids.length > 1 ? 'son admins' : 'es admin'} 📉`, msg)
    }
    case 'kick': {
      if (!isGroup) return noGroup()
      if (!isBotAdmin) return noBotAdmin()
      if (!isSenderAdmin) return noAdmin()
      if (!mentionedJids?.length) return noMention()
      await conn.groupParticipantsUpdate(jid, mentionedJids, 'remove')
      return safeReply(conn, jid, BOT_NAME + `\n\n✅ ${mentionedJids.length > 1 ? 'Fueron expulsados' : 'Fue expulsado'} 👋`, msg)
    }
    case 'mute': {
      if (!isGroup) return noGroup()
      if (!isSenderAdmin) return noAdmin()
      if (!mentionedJids?.length) return noMention()
      for (const jidM of mentionedJids) {
        const key = jid + '_' + jidM
        if (!global.db?.data?.mutes) global.db.data.mutes = {}
        global.db.data.mutes[key] = { until: null }
      }
      return safeReply(conn, jid, BOT_NAME + `\n\n🔇 ${mentionedJids.length > 1 ? 'Silenciados' : 'Silenciado'}`, msg)
    }
    case 'unmute': {
      if (!isGroup) return noGroup()
      if (!isSenderAdmin) return noAdmin()
      if (!mentionedJids?.length) return noMention()
      for (const jidM of mentionedJids) {
        const key = jid + '_' + jidM
        if (global.db?.data?.mutes?.[key]) delete global.db.data.mutes[key]
      }
      return safeReply(conn, jid, BOT_NAME + `\n\n🔊 ${mentionedJids.length > 1 ? 'Desmuteados' : 'Desmuteado'}`, msg)
    }
    case 'link': {
      if (!isGroup) return noGroup()
      const code = await conn.groupInviteCode(jid).catch(() => null)
      if (!code) return noBotAdmin()
      return safeReply(conn, jid, BOT_NAME + `\n\n🔗 Link del grupo:\nhttps://chat.whatsapp.com/${code}`, msg)
    }
    case 'resetlink': {
      if (!isGroup) return noGroup()
      if (!isBotAdmin) return noBotAdmin()
      if (!isSenderAdmin) return noAdmin()
      const newCode = await conn.groupRevokeInvite(jid).catch(() => null)
      if (!newCode) return safeReply(conn, jid, BOT_NAME + '\n\nNo pude resetear el link 😅', msg)
      return safeReply(conn, jid, BOT_NAME + `\n\n✅ Nuevo link:\nhttps://chat.whatsapp.com/${newCode}`, msg)
    }
    case 'grupo': {
      if (!isGroup) return noGroup()
      if (!isBotAdmin) return noBotAdmin()
      if (!isSenderAdmin) return noAdmin()
      const close = args && (args.toLowerCase().includes('cerrar') || args.toLowerCase().includes('close') || args.toLowerCase().includes('cerrado'))
      await conn.groupSettingUpdate(jid, close ? 'announcement' : 'not_announcement')
      return safeReply(conn, jid, BOT_NAME + `\n\n✅ Grupo ${close ? 'cerrado 🔒' : 'abierto 🔓'}`, msg)
    }
    case 'infogroup': {
      if (!isGroup) return noGroup()
      const meta = await conn.groupMetadata(jid).catch(() => null)
      if (!meta) return safeReply(conn, jid, BOT_NAME + '\n\nNo pude obtener la info del grupo 😅', msg)
      const admins = meta.participants.filter(p => p.admin).length
      return safeReply(conn, jid, BOT_NAME + `\n\n📋 *${meta.subject}*\n👥 Miembros: ${meta.participants.length}\n👑 Admins: ${admins}\n📝 ${meta.desc || 'Sin descripción'}`, msg)
    }
    default:
      return null
  }
}

function canHandle() { return true }

async function handle(text, context) {
  const { conn, msg, jid } = context

  if (!checkAuth()) {
    await safeReply(conn, jid, '⛔ No autorizado', msg)
    return
  }

  try {
    const result = await askServer(text)

    if (!result || !result.status) {
      await safeReply(conn, jid, BOT_NAME + '\n\n💫 No pude encontrar información sobre eso. ¿Podés ser más específico? 💜', msg)
      return
    }

    if (result.type === 'command') {
      const executed = await executeCommand(result.command, result.args || text, conn, msg, jid, context)
      if (executed !== null) return

      const usedPrefix = global.db?.data?.settings?.prefix || global.prefix || '.'
      const cleanCmd = result.command.replace(/[^a-zA-Z0-9_\-]/g, '')
      if (!cleanCmd) {
        await safeReply(conn, jid, BOT_NAME + '\n\n💫 No entendí bien qué querés hacer. ¿Podés ser más específico? 💜', msg)
        return
      }
      const fullCommand = result.args ? `${usedPrefix}${cleanCmd} ${result.args}` : `${usedPrefix}${cleanCmd}`
      await safeReply(conn, jid, BOT_NAME + `\n\nEjecutá: *${fullCommand}* 😊`, msg)
      return
    }

    const replyText = BOT_NAME + result.text

    if (result.image) {
      try {
        const imgRes = await fetch(result.image, { signal: AbortSignal.timeout(10000) })
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer())
          const ct = imgRes.headers.get('content-type') || 'image/jpeg'
          if (ct.includes('image')) {
            await conn.sendMessage(jid, { image: buffer, mimetype: ct, caption: replyText }, { quoted: msg })
            return
          }
        }
      } catch {}
    }

    await safeReply(conn, jid, replyText, msg)

  } catch {
    await safeReply(conn, jid, BOT_NAME + '\n\nUps, algo salió mal 😅 ¿Intentamos de nuevo? 💜', msg)
  }
}

export default { canHandle, handle, name: 'Luna', description: 'IA Luna con búsqueda web real 🌙' }
