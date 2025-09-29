import fs from 'fs'

const KICK_KEYWORDS = ['elimina', 'echa', 'expulsa', 'saca']

function canHandle(text) {
  const lowerText = text.toLowerCase()
  return KICK_KEYWORDS.some(keyword => lowerText.startsWith(keyword))
}

async function handle(inputText, context) {
  const { conn, msg, jid, isGroup, isAdmin, isOwner, participants } = context

  const datas = global
  const idioma = datas.db.data.users[msg.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.gc_kick2

  if (!isGroup) {
    await conn.sendMessage(jid, { text: '❌ Solo funciona en grupos.' }, { quoted: msg })
    return
  }

  if (!(isAdmin || isOwner)) {
    global.dfail('admin', msg, conn)
    return
  }

  if (!global.db.data.settings[conn.user.jid]?.restrict) {
    await conn.sendMessage(jid, { text: `${tradutor.texto1[0]} (enable restrict / disable restrict) ${tradutor.texto1[1]}` }, { quoted: msg })
    return
  }

  const kicktext = `${tradutor.texto2}\n*${'.kick2 @' + global.suittag}*`

  const text = inputText.split(' ').slice(1).join(' ')
  let userToRemove

  if (msg.mentionedJid && msg.mentionedJid[0]) {
    userToRemove = msg.mentionedJid[0]
  } else if (msg.quoted && msg.quoted.sender) {
    userToRemove = msg.quoted.sender
  } else if (text) {
    const cleanText = text.replace(/[^0-9]/g, '')
    if (cleanText.length < 11 || cleanText.length > 15) {
      await conn.sendMessage(jid, { text: '*[❗] El número ingresado es incorrecto.*' }, { quoted: msg })
      return
    }
    userToRemove = cleanText + '@s.whatsapp.net'
  }

  if (!userToRemove) {
    await conn.sendMessage(jid, { text: kicktext, mentions: conn.parseMention(kicktext) }, { quoted: msg })
    return
  }

  if (userToRemove === conn.user.jid) {
    await conn.sendMessage(jid, { text: '*🤖 No puedo expulsarme a mí mismo.*' }, { quoted: msg })
    return
  }

  const isUserInGroup = participants.find(p => p.id === userToRemove)
  if (!isUserInGroup) {
    await conn.sendMessage(jid, { text: '*[❗] Esa persona no está en el grupo.*' }, { quoted: msg })
    return
  }

  try {
    await conn.groupParticipantsUpdate(jid, [userToRemove], 'remove')
    await conn.sendMessage(jid, { text: `✅ @${userToRemove.split('@')[0]} ha sido expulsado.`, mentions: [userToRemove] }, { quoted: msg })
  } catch (err) {
    console.error('Error expulsando:', err)
    await conn.sendMessage(jid, { text: '*[❗] No se pudo expulsar al usuario (puede ser admin).*' }, { quoted: msg })
  }
}

export default {
  canHandle,
  handle,
  name: 'kick2',
  description: 'Expulsa a un usuario del grupo'
}
