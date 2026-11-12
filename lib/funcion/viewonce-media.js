const TIPOS_MEDIA = ['imageMessage', 'videoMessage', 'ptvMessage', 'audioMessage', 'stickerMessage', 'documentMessage']
const CLAVES_NEUTRAS = ['message', 'messageContextInfo', 'ephemeralMessage', 'documentWithCaptionMessage']
const MAX_PROFUNDIDAD = 8

const esObjeto = (valor) => !!valor && typeof valor === 'object' && !Buffer.isBuffer(valor) && !(valor instanceof Uint8Array)

const tieneDatos = (media) => esObjeto(media) && (!!media.url || !!media.directPath || !!media.mediaKey || !!media.fileSha256 || !!media.fileEncSha256 || media.viewOnce === true)

function buscarMedia(nodo, profundidad, envuelto) {
  if (!esObjeto(nodo) || profundidad > MAX_PROFUNDIDAD) return null
  for (const tipo of TIPOS_MEDIA) {
    if (tieneDatos(nodo[tipo])) {
      const media = nodo[tipo]
      return {
        tipo,
        media,
        viewOnce: envuelto || media.viewOnce === true,
        descargable: !!(media.url || media.directPath)
      }
    }
  }
  for (const clave of Object.keys(nodo)) {
    const hijo = nodo[clave]
    if (!esObjeto(hijo)) continue
    const encontrado = buscarMedia(hijo, profundidad + 1, envuelto || !CLAVES_NEUTRAS.includes(clave))
    if (encontrado) return encontrado
  }
  return null
}

export function desenvolverViewOnce(quoted) {
  if (!esObjeto(quoted)) return null
  return buscarMedia(quoted, 0, false)
}

export function tipoDescarga(tipo) {
  if (tipo === 'ptvMessage') return 'video'
  return String(tipo || '').replace(/Message$/i, '')
}

export function armarPayloadViewOnce(revelado, buffer) {
  if (!revelado || !buffer || !buffer.length) return null
  const { tipo, media } = revelado
  const caption = typeof media.caption === 'string' ? media.caption : ''
  const mimetype = typeof media.mimetype === 'string' ? media.mimetype : ''
  const segundos = media.seconds ? { seconds: media.seconds } : {}
  const conTexto = caption ? { caption } : {}
  if (tipo === 'imageMessage') return { image: buffer, mimetype: mimetype || 'image/jpeg', ...conTexto }
  if (tipo === 'videoMessage') return { video: buffer, mimetype: mimetype || 'video/mp4', ...conTexto, ...segundos, ...(media.gifPlayback ? { gifPlayback: true } : {}) }
  if (tipo === 'ptvMessage') return { video: buffer, ptv: true, mimetype: mimetype || 'video/mp4', ...segundos }
  if (tipo === 'audioMessage') return { audio: buffer, mimetype: mimetype || 'audio/ogg; codecs=opus', ptt: media.ptt === true, ...segundos }
  if (tipo === 'stickerMessage') return { sticker: buffer }
  if (tipo === 'documentMessage') return { document: buffer, mimetype: mimetype || 'application/octet-stream', fileName: media.fileName || 'archivo', ...conTexto }
  return null
}
