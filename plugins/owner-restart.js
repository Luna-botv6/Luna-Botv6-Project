import fs from 'fs'

const RESTART_FILE = '/tmp/luna-restart-notify.json'

const handler = async (m, { conn }) => {
  await m.reply('🔄 Reiniciando sistema, espera un momento...')

  fs.writeFileSync(RESTART_FILE, JSON.stringify({ chat: m.chat }), 'utf8')

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
    await conn.sendMessage(data.chat, {
      text: '✅ Sistema reiniciado exitosamente, estoy de vuelta 🌙'
    })
  } catch {
  }
}

handler.help = ['restart']
handler.tags = ['owner']
handler.command = ['restart', 'reiniciar']
handler.rowner = true

export default handler
