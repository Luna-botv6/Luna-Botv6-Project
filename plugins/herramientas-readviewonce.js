import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
const handler = async (m, { conn, _ }) => {
  const tr = (key, fallback) => {
    try {
      const val = typeof _ === 'function' ? _(key) : null
      return val || fallback
    } catch {
      return fallback
    }
  }
  const { isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)
  const isOwner = global.owner.includes(m.sender.replace(/[^0-9]/g, ''))
  if (!isAdmin && !isOwner) throw tr('toolsCmd.notAdmin', '🚫 *Solo un admin o el owner puede usar este comando*')
  const q = m.quoted ? m.quoted : null
  if (!q) throw tr('toolsCmd.voNoQuoted', '👀 *Respondé a una imagen o video de una sola vez para revelarlo*')
  if (!q.viewOnce) throw tr('toolsCmd.voNoEsVO', '⚠️ *Eso no es una imagen o video de una sola vez*')
  let data
  try {
    data = await q.download?.()
  } catch {
    throw tr('toolsCmd.voNoEsVO', '⚠️ *Eso no es una imagen o video de una sola vez*')
  }
  if (!data) throw tr('toolsCmd.voNoEsVO', '⚠️ *Eso no es una imagen o video de una sola vez*')
  const mime = q.mimetype || q.mediaType || ''
  try {
    if (/video/.test(mime)) {
      return await conn.sendMessage(m.chat, { video: data, mimetype: 'video/mp4' }, { quoted: m })
    }
    return await conn.sendMessage(m.chat, { image: data, mimetype: 'image/jpeg' }, { quoted: m })
  } catch {
    throw tr('toolsCmd.voNoEsVO', '⚠️ *Eso no es una imagen o video de una sola vez*')
  }
}
handler.help = ['readvo']
handler.tags = ['tools']
handler.command = /^(readviewonce|read|revelar|readvo)$/i
handler.group = true
export default handler