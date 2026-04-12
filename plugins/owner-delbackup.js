import { existsSync, rmSync } from 'fs'
import { join } from 'path'

const BACKUP_DIR = join(process.cwd(), 'backup')

const eliminarBackupHandler = async (m, { conn }) => {
  try {
    const lidOwners = global.lidOwners || []
    const ownerNumbers = (global.owner || []).map(o => o[0])
    const allOwners = [...lidOwners, ...ownerNumbers].map(o => o.replace(/[^0-9]/g, ''))
    const sender = m.sender.replace(/[^0-9]/g, '')

    if (!allOwners.includes(sender)) {
      await conn.reply(m.chat, '🚫 No tienes permisos para eliminar la carpeta backup.', m)
      return
    }

    if (!existsSync(BACKUP_DIR)) {
      await conn.reply(m.chat, '❌ No existe la carpeta backup.', m)
      return
    }

    rmSync(BACKUP_DIR, { recursive: true, force: true })
    await conn.reply(m.chat, '🗑️ Carpeta backup eliminada con éxito.', m)

  } catch (e) {
    await conn.reply(m.chat, '❌ Error al eliminar la carpeta backup:\n' + (e.message || e), m)
  }
}

eliminarBackupHandler.command = /^(eliminarbackup)$/i
eliminarBackupHandler.rowner = false
export default eliminarBackupHandler
