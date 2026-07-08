// ⚠️ CONFIRMAR: armé este plugin siguiendo la convención que vi en tu
// handler.js (plugin.command / plugin.admin / plugin.group, firma
// `(m, { conn, args }) => {}`). Si tu loader de plugins usa otra forma de
// exportar (por ejemplo un objeto en vez de una función con propiedades),
// avisame y lo ajusto.

let handler = async (m, { conn, args }) => {
  const chatId = m.chat
  if (!global.db.data.chats[chatId]) global.db.data.chats[chatId] = {}

  const action = (args[0] || '').toLowerCase()

  if (action !== 'on' && action !== 'off') {
    const estado = global.db.data.chats[chatId].audioIAEnabled ? 'activado ✅' : 'desactivado ❌'
    return m.reply(
      `🎙️ El modo *audio-IA* está *${estado}* en este grupo.\n\n` +
      `Usá *${conn.prefix || global.prefix}audioia on* para que Luna responda a los audios que manden acá, ` +
      `o *${conn.prefix || global.prefix}audioia off* para que deje de escucharlos.`
    )
  }

  global.db.data.chats[chatId].audioIAEnabled = (action === 'on')

  await m.reply(
    action === 'on'
      ? '🎙️ Listo, ahora escucho y respondo a los audios que manden en este grupo.'
      : '🔇 Listo, dejo de escuchar los audios de este grupo.'
  )
}

handler.command = /^audioia$/i
handler.group = true
handler.admin = true

export default handler
