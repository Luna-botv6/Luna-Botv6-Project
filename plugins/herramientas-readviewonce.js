import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
const handler = async (m, { conn, _ }) => {
  const { isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)
  const isOwner = global.owner.includes(m.sender.replace(/[^0-9]/g, ''))
  if (!isAdmin && !isOwner) throw _('toolsCmd.notAdmin')

  const q = m.quoted ? m.quoted : null
  if (!q) throw _('toolsCmd.voNoQuoted')
  if (!q.viewOnce) throw _('toolsCmd.voNoEsVO')

  const data = await q.download?.()
  if (!data) throw _('toolsCmd.voNoEsVO')

  const mime = q.mimetype || q.mediaType || ''
  if (/video/.test(mime)) {
    return await conn.sendMessage(m.chat, { video: data, mimetype: 'video/mp4' }, { quoted: m })
  }
  return await conn.sendMessage(m.chat, { image: data, mimetype: 'image/jpeg' }, { quoted: m })
}

handler.help = ['readvo']
handler.tags = ['tools']
handler.command = /^(readviewonce|read|revelar|readvo)$/i
handler.group = true
export default handler
