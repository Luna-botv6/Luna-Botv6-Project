import { desenvolverViewOnce } from '../lib/funcion/viewonce-media.js'
import { guardarViewOnce } from '../lib/funcion/viewonce-cache.js'

function esCandidato(m) {
  const contenido = m?.message
  if (!contenido) return false
  return !!(
    m.key?.isViewOnce === true ||
    contenido.viewOnceMessage ||
    contenido.viewOnceMessageV2 ||
    contenido.viewOnceMessageV2Extension ||
    contenido.imageMessage?.viewOnce === true ||
    contenido.videoMessage?.viewOnce === true ||
    contenido.audioMessage?.viewOnce === true
  )
}

const handler = async (m) => {
  if (!esCandidato(m)) return
  const revelado = desenvolverViewOnce(m.message)
  if (revelado?.descargable) guardarViewOnce(m.key?.id, revelado)
}

handler.all = handler
export default handler
