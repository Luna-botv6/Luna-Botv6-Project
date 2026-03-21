import fs from 'fs'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const handler = async (m, { conn, args }) => {

const datas = global
const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
const tradutor = _translate.plugins.gc_setdesc

const { isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)

if (!isAdmin) throw tradutor.admin
if (!isBotAdmin) throw tradutor.botadmin

if (!args[0]) throw tradutor.texto2

const text = args.join(' ')

await conn.groupUpdateDescription(m.chat, text)

m.reply(tradutor.texto1)

}

handler.help = ['setdesc <text>']
handler.tags = ['group']
handler.command = /^setdesk|setdesc$/i
handler.group = true

export default handler
