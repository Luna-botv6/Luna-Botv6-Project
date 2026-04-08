let handler = async (m, { conn }) => {
m.reply(global.comunidad)}
handler.help = ['comunidad']
handler.tags = ['grupo']
handler.command = /^(comunidad|grupocomunidad|grupoavisos)$/i
handler.group = true;
export default handler

global.comunidad = `*GRUPO DE LA COMUNIDAD*

_⚠️| Este grupo será solamente de avisos o noticias relacionadas con los grupos de la comunidad Futabu. Solo podrá hablar el Equipo de Staff; los miembros solo podrán ver. Usaremos este grupo ya que facilita ver más rápido los mensajes importantes, ya que en varios grupos se habla demasiado y se pierden._

Link: https://chat.whatsapp.com/IKCpRmuyrNBL41wb9J2kNO`
