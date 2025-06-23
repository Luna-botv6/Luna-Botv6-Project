import fs from 'fs'
import { setCleanerStatus, isCleanerEnabled } from '../lib/cleaner-config.js'

const handler = async (m, { text }) => {
  const datas = global || {}
  const dbData = datas.db?.data?.users?.[m.sender] || {}
  const idioma = dbData.language || global.defaultLenguaje || 'es'

  let tradutor = {}
  try {
    const langPath = `./src/languages/${idioma}.json`
    if (fs.existsSync(langPath)) {
      const _translate = JSON.parse(fs.readFileSync(langPath))
      tradutor = _translate.plugins?.owner_limpieza || {}
    }
  } catch (error) {
    console.log('Error al cargar traducciones:', error)
  }

  const defaultTexts = {
    texto1: '⚙️ Usa: limpieza on/off',
    texto2: '✅ Limpieza activada',
    texto3: '❌ Limpieza desactivada',
    texto4: 'ℹ️ Estado actual:',
    texto5: '✅ Activa',
    texto6: '❌ Inactiva'
  }

  const texts = {
    texto1: tradutor.texto1 || defaultTexts.texto1,
    texto2: tradutor.texto2 || defaultTexts.texto2,
    texto3: tradutor.texto3 || defaultTexts.texto3,
    texto4: tradutor.texto4 || defaultTexts.texto4,
    texto5: tradutor.texto5 || defaultTexts.texto5,
    texto6: tradutor.texto6 || defaultTexts.texto6
  }

  const arg = text.trim().toLowerCase()

  if (arg === 'on') {
    setCleanerStatus(true)
    m.reply(texts.texto2)
  } else if (arg === 'off') {
    setCleanerStatus(false)
    m.reply(texts.texto3)
  } else {
    const estado = isCleanerEnabled() ? texts.texto5 : texts.texto6
    m.reply(`${texts.texto4} ${estado}\n\n📌 ${texts.texto1}`)
  }
}

handler.command = ['limpieza']
handler.rowner = true // Solo real owner
export default handler
