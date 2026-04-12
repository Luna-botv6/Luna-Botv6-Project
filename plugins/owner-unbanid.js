import fs from 'fs'
import { setConfig, getConfig } from '../lib/funcConfig.js'

const handler = async (m, { conn, args }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).functions.unbanid

  const botJid = conn.decodeJid(conn.user.jid)

  if (!args[0]) {
    await m.reply(tradutor.obteniendo)

    const groupsObj = await conn.groupFetchAllParticipating()
    const allGroups = Object.entries(groupsObj)
    const bannedGroups = allGroups.filter(([jid]) => global.db?.data?.chats?.[jid]?.isBanned)

    if (!bannedGroups.length) return m.reply(tradutor.noBaneados)

    let txt = `${tradutor.titulo.replace('%total%', bannedGroups.length)}\n\n`

    for (let i = 0; i < bannedGroups.length; i++) {
      const [jid, meta] = bannedGroups[i]
      const participants = meta.participants || []
      const bot = participants.find(u => conn.decodeJid(u.id) === botJid)
      const isBotAdmin = bot?.admin === 'admin' || bot?.admin === 'superadmin'

      txt += `*${i + 1}.* ${meta.subject || jid}\n`
      txt += `🆔 \`${jid}\`\n`
      txt += `👥 ${participants.length} ${tradutor.miembros} | 🛡️ Admin: ${isBotAdmin ? tradutor.si : tradutor.no}\n\n`
    }

    txt += tradutor.uso
    return m.reply(txt)
  }

  const targetJid = args[0].trim().endsWith('@g.us')
    ? args[0].trim()
    : args[0].trim() + '@g.us'

  if (!getConfig(targetJid).isBanned) {
    return m.reply(tradutor.noEstaBaneado)
  }

  let groupMeta = null
  try {
    groupMeta = await conn.groupMetadata(targetJid)
  } catch {
    return m.reply(tradutor.noEncontrado)
  }

  setConfig(targetJid, { isBanned: false })

  await conn.sendMessage(targetJid, { text: tradutor.avisoGrupo })

  return m.reply(
    tradutor.confirmacion
      .replace('%nombre%', groupMeta.subject)
      .replace('%id%', targetJid)
      .replace('%miembros%', groupMeta.participants?.length || '?')
  )
}

handler.help = ['unbanid <id-grupo>']
handler.tags = ['owner']
handler.command = /^(unbanid|unbanchatid)$/i
handler.rowner = true
handler.private = true

export default handler
