const handler = async (m, { conn, args, text, isOwner }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es'
  const _translate = await global.loadTranslation(idioma)
  const t = _translate?.plugins?.setnamebot || {}

  if (!text?.trim()) {
    return m.reply(t.uso || '')
  }

  const nuevoNombre = text.trim()

  if (nuevoNombre.length > 40) {
    return m.reply(t.muy_largo || '')
  }

  if (!global.db.data.config) global.db.data.config = {}
  global.db.data.config.botName = nuevoNombre
  global.BotName = nuevoNombre

  if (global.translationsCache) global.translationsCache.clear()

  try {
    await global.db.write()
  } catch (e) {
    console.error('[setnamebot] Error guardando nombre en DB:', e.message)
  }

  const respuesta = (t.ok || '').replace('{nombre}', nuevoNombre)
  m.reply(respuesta)
}

handler.command = /^setnamebot$/i
handler.owner = true
handler.tags = ['owner']
handler.help = ['setnamebot <nombre>']

export default handler
