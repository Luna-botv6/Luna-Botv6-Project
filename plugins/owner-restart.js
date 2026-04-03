import { writeFileSync, existsSync, unlinkSync, readFileSync } from 'fs'
import { execSync } from 'child_process'

const RESTART_FILE = '/tmp/luna-restart-notify.json'

const handler = async (m, { conn }) => {
  await m.reply('🔄 Actualizando y reiniciando sistema, espera un momento...')

  try {
    const gitStatus = execSync('git pull', { encoding: 'utf8', timeout: 30000 })
    const updated = !gitStatus.includes('Already up to date')

    if (updated) {
      await conn.sendMessage(m.chat, {
        text: `📦 *Actualizacion detectada*\n\n${gitStatus.trim()}\n\n⏳ Instalando dependencias...`
      })
      execSync('npm install --silent', { encoding: 'utf8', timeout: 60000 })
    } else {
      await conn.sendMessage(m.chat, {
        text: '✅ *Ya esta en la ultima version*\n\n⏳ Reiniciando de todas formas...'
      })
    }
  } catch (e) {
    await conn.sendMessage(m.chat, {
      text: `⚠️ *No se pudo actualizar*\n\n${e.message}\n\n⏳ Reiniciando sin actualizar...`
    })
  }

  writeFileSync(RESTART_FILE, JSON.stringify({ chat: m.chat }), 'utf8')

  setTimeout(() => {
    if (global.gc) global.gc()
    process.kill(process.ppid, 'SIGTERM')
  }, 3000)
}

handler.all = async function (m, { conn }) {
  if (!existsSync(RESTART_FILE)) return
  try {
    const data = JSON.parse(readFileSync(RESTART_FILE, 'utf8'))
    unlinkSync(RESTART_FILE)
    if (!data?.chat) return
    await conn.sendMessage(data.chat, {
      text: '✅ Sistema actualizado y reiniciado exitosamente, estoy de vuelta 🌙'
    })
  } catch {}
}

handler.help = ['restart']
handler.tags = ['owner']
handler.command = ['restart', 'reiniciar']
handler.rowner = true
export default handler
