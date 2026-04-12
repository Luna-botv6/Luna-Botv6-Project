import fs from 'fs'

const RESTART_FILE = '/tmp/luna-restart-notify.json'

const handler = async (m, { conn }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
  const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.owner_restart

  await m.reply(t.reiniciando)

  fs.writeFileSync(RESTART_FILE, JSON.stringify({ chat: m.chat, idioma }), 'utf8')

  setTimeout(() => {
    if (global.gc) global.gc()
    process.kill(process.ppid, 'SIGTERM')
  }, 3000)
}

handler.all = async function (m, { conn }) {
  if (!fs.existsSync(RESTART_FILE)) return
  try {
    const data = JSON.parse(fs.readFileSync(RESTART_FILE, 'utf8'))
    fs.unlinkSync(RESTART_FILE)
    if (!data?.chat) return
    const idioma = data.idioma || global.defaultLenguaje
    const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.owner_restart
    await conn.sendMessage(data.chat, { text: t.reiniciado })
  } catch {}
}

handler.help = ['restart']
handler.tags = ['owner']
handler.command = ['restart', 'reiniciar']
handler.rowner = true

export default handler
