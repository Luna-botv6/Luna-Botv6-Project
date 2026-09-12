let handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es')
  const t = _tr?.plugins?.audioia || {}
  const chatId = m.chat
  if (!global.db.data.chats[chatId]) global.db.data.chats[chatId] = {}

  const action = (args[0] || '').toLowerCase()

  if (action !== 'on' && action !== 'off') {
    const estado = global.db.data.chats[chatId].audioIAEnabled ? (t.estado_activado || 'activado ✅') : (t.estado_desactivado || 'desactivado ❌')
    const prefix = conn.prefix || global.prefix
    return m.reply(
      t.estado_msg?.replace('{estado}', estado).replace('{prefix}', prefix).replace('{prefix}', prefix) ||
      `🎙️ El modo *audio-IA* está *${estado}* en este grupo.\n\n` +
      `Usá *${prefix}audioia on* para que Luna responda a los audios que manden acá, ` +
      `o *${prefix}audioia off* para que deje de escucharlos.`
    )
  }

  global.db.data.chats[chatId].audioIAEnabled = (action === 'on')

  await m.reply(
    action === 'on'
      ? (t.activado || '🎙️ Listo, ahora escucho y respondo a los audios que manden en este grupo.')
      : (t.desactivado || '🔇 Listo, dejo de escuchar los audios de este grupo.')
  )
}

handler.command = /^audioia$/i
handler.group = true
handler.admin = true

export default handler
