const ENVOLTORIOS = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']
const CONTENEDORES = ['ephemeralMessage', 'documentWithCaptionMessage']

const esMedia = (valor) => !!valor && typeof valor === 'object' && (!!valor.url || !!valor.directPath)

export function desenvolverViewOnce(quoted) {
  let contenido = quoted || null
  let envoltorio = false
  for (let i = 0; i < 5 && contenido; i++) {
    const contenedor = CONTENEDORES.find((nombre) => contenido[nombre]?.message)
    if (contenedor) {
      contenido = contenido[contenedor].message
      continue
    }
    const clave = ENVOLTORIOS.find((nombre) => contenido[nombre]?.message)
    if (!clave) break
    envoltorio = true
    contenido = contenido[clave].message
  }
  if (!contenido) return null
  const tipo = Object.keys(contenido).find((clave) => /Message$/.test(clave) && esMedia(contenido[clave])) || null
  if (!tipo) return null
  const media = contenido[tipo]
  return { tipo, media, viewOnce: !!(envoltorio || media.viewOnce === true) }
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
  if (tipo === 'audioMessage') return { audio: buffer, mimetype: mimetype || 'audio/ogg; codecs=opus', ptt: media.ptt === true, ...segundos }
  if (tipo === 'stickerMessage') return { sticker: buffer }
  if (tipo === 'documentMessage') return { document: buffer, mimetype: mimetype || 'application/octet-stream', fileName: media.fileName || 'archivo' }
  return null
}
