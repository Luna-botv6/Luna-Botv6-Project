import { writeFileSync, existsSync, unlinkSync, readFileSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

const RESTART_FILE = '/tmp/luna-restart-notify.json'
const PROTECTED_FILES = ['config.js']

const handler = async (m, { conn }) => {
  await m.reply('🔄 Actualizando y reiniciando sistema, espera un momento...')

  try {
    const backups = {}
    for (const file of PROTECTED_FILES) {
      const filePath = join(process.cwd(), file)
      if (existsSync(filePath)) {
        backups[file] = readFileSync(filePath, 'utf8')
      }
    }

    const gitOutput = execSync('git pull', { encoding: 'utf8', timeout: 30000 })
    const updated = !gitOutput.includes('Already up to date')

    for (const [file, content] of Object.entries(backups)) {
      writeFileSync(join(process.cwd(), file), content, 'utf8')
    }

    if (updated) {
      const lines = gitOutput.split('\n').filter(l => l.trim())
      const fileLines = lines.filter(l => /\|/.test(l) && /[+\-]/.test(l))

      const fileList = fileLines.map(l => {
        const name = l.split('|')[0].trim()
        return `　📄 ${name} ✅`
      }).join('\n')

      const summary = lines.find(l => l.includes('file') && l.includes('changed')) || ''

      await conn.sendMessage(m.chat, {
        text:
          `📦 *Actualizacion detectada*\n\n` +
          `📂 *Archivos:*\n${fileList || '　📄 Sin detalle'}\n\n` +
          `📊 ${summary}\n\n` +
          `⏳ _Instalando dependencias..._`
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
