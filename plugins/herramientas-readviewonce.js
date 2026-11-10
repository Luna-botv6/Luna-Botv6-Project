import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import { isProtectedOwner } from '../lib/funcion/ownerGuard.js'
import { desenvolverViewOnce, armarPayloadViewOnce } from '../lib/funcion/viewonce-media.js'
const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.herramientas_readviewonce || {}
  const { isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)
  const isOwner = isProtectedOwner(m.sender, null, conn)
  if (!isAdmin && !isOwner) throw (t.no_admin || '🚫 *Solo un admin o el owner puede usar este comando*')
  const citado = m.msg?.contextInfo?.quotedMessage || null
  if (!citado) throw (t.no_citado || '👀 *Respondé a una imagen, video o audio de una sola vez para revelarlo*')
  const revelado = desenvolverViewOnce(citado)
  if (!revelado?.viewOnce) throw (t.no_viewonce || '⚠️ *Eso no es un contenido de una sola vez*')
  let data = null
  try {
    data = await conn.downloadM(revelado.media, revelado.tipo.replace(/Message$/i, ''), false)
  } catch {
    data = null
  }
  const payload = armarPayloadViewOnce(revelado, data)
  if (!payload) throw (t.no_viewonce || '⚠️ *Eso no es un contenido de una sola vez*')
  try {
    return await conn.sendMessage(m.chat, payload, { quoted: m })
  } catch {
    throw (t.no_viewonce || '⚠️ *Eso no es un contenido de una sola vez*')
  }
}
handler.help = ['readvo']
handler.tags = ['tools']
handler.command = /^(readviewonce|read|revelar|readvo)$/i
handler.group = true
export default handler
