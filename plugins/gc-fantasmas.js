import fs from 'fs'

const handler = async (m, { conn, text, participants, isAdmin, isOwner }) => {
  if (!(isAdmin || isOwner)) {
    global.dfail('admin', m, conn)
    throw false
  }

  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.gc_fantasmas

  const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net'
  const botInGroup = participants.find((u) => u.id === botNumber)
  const botIsAdmin = botInGroup && (botInGroup.admin === 'admin' || botInGroup.admin === 'superadmin')

  const member = participants.map((u) => u.id)
  let sum = !text ? member.length : text
  let total = 0
  const sider = []

  for (let i = 0; i < sum; i++) {
    const users = m.isGroup ? participants.find((u) => u.id == member[i]) : {}
    if ((typeof global.db.data.users[member[i]] == 'undefined' || global.db.data.users[member[i]].chat == 0) && !users?.admin) {
      if (typeof global.db.data.users[member[i]] !== 'undefined') {
        if (global.db.data.users[member[i]].whitelist == false) {
          total++
          sider.push(member[i])
        }
      } else {
        total++
        sider.push(member[i])
      }
    }
  }

  if (total == 0) return conn.reply(m.chat, tradutor.texto1, m)

  const texto =
`${tradutor.texto2[0]} ${await conn.getName(m.chat)}
${tradutor.texto2[1]} ${sum}

${tradutor.texto2[2]}
${sider.map((v) => '  👉🏻 @' + v.replace(/@.+/, '')).join('\n')}

${tradutor.texto2[3]}`

  if (botIsAdmin) {
    conn.sendMessage(m.chat, { text: texto, mentions: sider }, { quoted: m })
  } else {
    conn.reply(m.chat, texto, m) 
  }
}

handler.command = /^(verfantasmas|fantasmas|sider)$/i
handler.admin = true
handler.group = true
export default handler
