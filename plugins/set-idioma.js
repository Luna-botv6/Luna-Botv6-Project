import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

const IDIOMAS = {
  es: { nombre: 'Español 🇪🇸', bandera: '🇪🇸' },
  pt: { nombre: 'Português 🇧🇷', bandera: '🇧🇷' },
  en: { nombre: 'English 🇺🇸', bandera: '🇺🇸' }
}

async function loadTranslation(idioma) {
  try {
    const data = await readFile(`./src/lunaidiomas/${idioma}.json`, 'utf8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

const handler = async (m, { conn, args, usedPrefix }) => {
  const sender = m.sender
  const idiomaUsuario = global.db?.data?.users?.[sender]?.language || global.defaultLenguaje || 'es'
  const idiomaChatActual = m.isGroup ? (global.db?.data?.chats?.[m.chat]?.language || global.defaultLenguaje || 'es') : idiomaUsuario
  const _translate = await loadTranslation(idiomaUsuario)
  const t = _translate?.setidioma || {}

  const opcion = args[0]?.toLowerCase()

  if (!opcion) {
    const lista = Object.entries(IDIOMAS)
      .map(([code, info]) => `${info.bandera} *${info.nombre}* → _${usedPrefix}idioma ${code}_${code === idiomaUsuario ? ` ✅` : ''}`)
      .join('\n')

    return m.reply(
      `${t.titulo || '🌐 *Idiomas disponibles*'}\n\n${lista}\n\n${t.uso || `Usa _${usedPrefix}idioma <código>_ para cambiar`}`
    )
  }

  if (!IDIOMAS[opcion]) {
    const validos = Object.keys(IDIOMAS).join(', ')
    return m.reply(t.invalido?.replace('{validos}', validos) || `❌ Idioma inválido. Opciones: ${validos}`)
  }

  const archivoPath = `./src/lunaidiomas/${opcion}.json`
  if (!existsSync(archivoPath)) {
    return m.reply(t.no_disponible || '⚠️ Este idioma aún no está disponible.')
  }

  if (opcion === idiomaUsuario && opcion === idiomaChatActual) {
    return m.reply(t.ya_activo?.replace('{idioma}', IDIOMAS[opcion].nombre) || `✅ Ya tenés activado ${IDIOMAS[opcion].nombre}`)
  }

  global.db.data.users[sender].language = opcion
  if (m.isGroup) {
    global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}
    global.db.data.chats[m.chat].language = opcion
    try {
      const groupMeta = await conn.groupMetadata(m.chat)
      const participants = groupMeta?.participants || []
      for (const p of participants) {
        const jid = p.id
        if (global.db.data.users[jid]) {
          global.db.data.users[jid].language = opcion
        }
      }
    } catch {}
  }
  await global.db.write()

  const _translateNuevo = await loadTranslation(opcion)
  const tNuevo = _translateNuevo?.setidioma || {}

  m.reply(tNuevo.cambiado?.replace('{idioma}', IDIOMAS[opcion].nombre) || `✅ Idioma cambiado a ${IDIOMAS[opcion].nombre}`)
}

handler.command = /^(idioma|language|lingua|lang)$/i
handler.exp = 0
handler.fail = null
export default handler
