import fs from 'fs'
import { setConfig } from '../lib/funcConfig.js'

const handler = async (m, { conn, args }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).functions.banid

  const botJid = conn.decodeJid(conn.user.jid)

  if (!args[0]) {
    await m.reply(tradutor.obteniendo)

    const groupsObj = await conn.groupFetchAllParticipating()
    const allGroups = Object.entries(groupsObj)

    if (!allGroups.length) return m.reply(tradutor.sinGrupos)

    let txt = `${tradutor.listaTitulo}\n\n`

    for (let i = 0; i < allGroups.length; i++) {
      const [jid, meta] = allGroups[i]
      const participants = meta.participants || []
      const bot = participants.find(u => conn.decodeJid(u.id) === botJid)
      const isBotAdmin = bot?.admin === 'admin' || bot?.admin === 'superadmin'
      const banned = global.db?.data?.chats?.[jid]?.isBanned ? tradutor.baneado : tradutor.activo

      txt += `*${i + 1}.* ${meta.subject || jid}\n`
      txt += `🆔 \`${jid}\`\n`
      txt += `👥 ${participants.length} ${tradutor.miembros} | 🛡️ Admin: ${isBotAdmin ? tradutor.si : tradutor.no} | ${banned}\n\n`
    }

    txt += tradutor.uso
    return m.reply(txt)
  }

  const targetJid = args[0].trim().endsWith('@g.us')
    ? args[0].trim()
    : args[0].trim() + '@g.us'

  let groupMeta = null
  try {
    groupMeta = await conn.groupMetadata(targetJid)
  } catch {
    return m.reply(tradutor.noEncontrado)
  }

  if (!groupMeta) return m.reply(tradutor.noEncontrado)

  setConfig(targetJid, { isBanned: true })

  await conn.sendMessage(targetJid, { text: tradutor.avisoGrupo })

  return m.reply(
    tradutor.confirmacion
      .replace('%nombre%', groupMeta.subject)
      .replace('%id%', targetJid)
      .replace('%miembros%', groupMeta.participants?.length || '?')
  )
}

handler.help = ['banid <id-grupo>']
handler.tags = ['owner']
handler.command = /^(banid|banchatid)$/i
handler.rowner = true
handler.private = true

export default handler
