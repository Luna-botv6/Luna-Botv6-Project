const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.rawpart || {};
  if (!m.isGroup) return m.reply(t.solo_grupos || 'Solo en grupos')
  const metadata = await conn.groupMetadata(m.chat)
  const todos = metadata.participants.map(p => JSON.stringify(p)).join('\n\n')
  m.reply((t.titulo || 'RAW PARTICIPANTS:') + '\n\n' + todos)
}
handler.command = /^rawpart$/i
handler.group = true
export default handler
