import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import { isProtectedOwner } from '../lib/funcion/ownerGuard.js'
import { desenvolverViewOnce, armarPayloadViewOnce, tipoDescarga } from '../lib/funcion/viewonce-media.js'
import { leerViewOnce } from '../lib/funcion/viewonce-cache.js'

async function bajarMedia(conn, m, revelado) {
  if (!revelado?.descargable) return null
  const tipo = tipoDescarga(revelado.tipo)
  try {
    const buffer = await conn.downloadM(revelado.media, tipo, false)
    if (buffer?.length) return buffer
  } catch {}
  if (revelado.media?.url) {
    try {
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
      const mensaje = { key: m.key || { id: 'revelar' }, message: { [revelado.tipo]: revelado.media } }
      const buffer = await downloadMediaMessage(mensaje, 'buffer', {}, { reuploadRequest: conn.updateMediaMessage?.bind(conn), logger: conn.logger })
      if (buffer?.length) return buffer
    } catch {}
  }
  return null
}

const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.herramientas_readviewonce || {}
  const avisar = (texto) => conn.sendMessage(m.chat, { text: texto }, { quoted: m })
  const { isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)
  const isOwner = isProtectedOwner(m.sender, null, conn)
  if (!isAdmin && !isOwner) return avisar(t.no_admin || '🚫 *Solo un admin o el owner puede usar este comando*')
  const citado = m.msg?.contextInfo?.quotedMessage || null
  if (!citado) return avisar(t.no_citado || '👀 *Respondé a una imagen, video o audio de una sola vez para revelarlo*')
  const cita = m.quoted || null
  const tipoCita = cita?.mediaType && /Message$/.test(cita.mediaType) ? cita.mediaType : null
  const revelado = desenvolverViewOnce(citado)
  if (!revelado && !tipoCita) return avisar(t.no_viewonce || '⚠️ *Eso no es un contenido de una sola vez*')

  const cacheado = leerViewOnce(m.msg?.contextInfo?.stanzaId)
  let data = null
  let tipo = null
  let media = null
  if (cacheado?.descargable) {
    try {
      data = await conn.downloadM(cacheado.media, tipoDescarga(cacheado.tipo), false)
    } catch {
      data = null
    }
    if (data?.length) {
      tipo = cacheado.tipo
      media = cacheado.media
    }
  }
  if (!data?.length && cita && typeof cita.download === 'function' && tipoCita) {
    try {
      data = await cita.download()
    } catch {
      data = null
    }
    if (data?.length) {
      tipo = tipoCita
      media = cita
    }
  }
  if (!data?.length && revelado) {
    data = await bajarMedia(conn, m, revelado)
    if (data?.length) {
      tipo = revelado.tipo
      media = revelado.media
    }
  }
  const tipoFinal = tipo || tipoCita || revelado?.tipo || null
  const mediaFinal = media || cita || revelado?.media || null
  if (!tipoFinal) return avisar(t.no_viewonce || '⚠️ *Eso no es un contenido de una sola vez*')
  if (!data?.length) return avisar(t.no_descarga || '⚠️ *WhatsApp no me envió el archivo de ese mensaje de una sola vez* (la cita llega vacía). No se puede revelar.')
  const payload = armarPayloadViewOnce({ tipo: tipoFinal, media: mediaFinal, viewOnce: true }, data)
  if (!payload) return avisar(t.no_viewonce || '⚠️ *Eso no es un contenido de una sola vez*')
  try {
    return await conn.sendMessage(m.chat, payload, { quoted: m })
  } catch {
    return conn.sendMessage(m.chat, { text: t.error_envio || '⚠️ *No pude reenviar el contenido revelado*' }, { quoted: m }).catch(() => {})
  }
}
handler.help = ['readvo']
handler.tags = ['tools']
handler.command = /^(readviewonce|read|revelar|readvo)$/i
handler.group = true
export default handler
