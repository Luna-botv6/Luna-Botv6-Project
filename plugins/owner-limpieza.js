import fs from 'fs'
import { setCleanerStatus, isCleanerEnabled, setAutoClean, getAutoCleanConfig } from '../lib/cleaner-config.js'

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
    texto6: '❌ Inactiva',
    texto7: '🔄 Limpieza automática activada cada',
    texto8: '⏹️ Limpieza automática desactivada',
    texto9: '📋 **CONFIGURACIÓN DE LIMPIEZA**',
    texto10: '🔧 Limpieza manual:',
    texto11: '🤖 Limpieza automática:',
    texto12: '⏰ Intervalo:',
    texto13: 'horas',
    texto14: '❌ Intervalo inválido. Usa: 6, 12 o 24 horas',
    texto15: '📌 **COMANDOS DISPONIBLES:**',
    texto16: '• `limpieza on` - Activar limpieza manual',
    texto17: '• `limpieza off` - Desactivar limpieza manual',
    texto18: '• `limpieza auto on [6/12/24]` - Activar limpieza automática',
    texto19: '• `limpieza auto off` - Desactivar limpieza automática',
    texto20: '• `limpieza status` - Ver estado actual'
  }

  const texts = {
    texto1: tradutor.texto1 || defaultTexts.texto1,
    texto2: tradutor.texto2 || defaultTexts.texto2,
    texto3: tradutor.texto3 || defaultTexts.texto3,
    texto4: tradutor.texto4 || defaultTexts.texto4,
    texto5: tradutor.texto5 || defaultTexts.texto5,
    texto6: tradutor.texto6 || defaultTexts.texto6,
    texto7: tradutor.texto7 || defaultTexts.texto7,
    texto8: tradutor.texto8 || defaultTexts.texto8,
    texto9: tradutor.texto9 || defaultTexts.texto9,
    texto10: tradutor.texto10 || defaultTexts.texto10,
    texto11: tradutor.texto11 || defaultTexts.texto11,
    texto12: tradutor.texto12 || defaultTexts.texto12,
    texto13: tradutor.texto13 || defaultTexts.texto13,
    texto14: tradutor.texto14 || defaultTexts.texto14,
    texto15: tradutor.texto15 || defaultTexts.texto15,
    texto16: tradutor.texto16 || defaultTexts.texto16,
    texto17: tradutor.texto17 || defaultTexts.texto17,
    texto18: tradutor.texto18 || defaultTexts.texto18,
    texto19: tradutor.texto19 || defaultTexts.texto19,
    texto20: tradutor.texto20 || defaultTexts.texto20
  }

  const args = text.trim().toLowerCase().split(' ')
  const command = args[0]
  const subcommand = args[1]
  const interval = parseInt(args[2])

  // Comando para limpieza manual
  if (command === 'on') {
    setCleanerStatus(true)
    m.reply(texts.texto2)
  } 
  else if (command === 'off') {
    setCleanerStatus(false)
    m.reply(texts.texto3)
  }
  
  // Comando para limpieza automática
  else if (command === 'auto') {
    if (subcommand === 'on') {
      const hours = interval && [6, 12, 24].includes(interval) ? interval : 6
      setAutoClean(true, hours)
      m.reply(`${texts.texto7} ${hours} ${texts.texto13}`)
    } 
    else if (subcommand === 'off') {
      setAutoClean(false)
      m.reply(texts.texto8)
    }
    else {
      m.reply(texts.texto14)
    }
  }
  
  // Mostrar estado actual
  else if (command === 'status' || command === '') {
    const manualEnabled = isCleanerEnabled()
    const autoConfig = getAutoCleanConfig()
    
    let statusMsg = `${texts.texto9}\n\n`
    statusMsg += `${texts.texto10} ${manualEnabled ? texts.texto5 : texts.texto6}\n`
    statusMsg += `${texts.texto11} ${autoConfig.enabled ? texts.texto5 : texts.texto6}\n`
    
    if (autoConfig.enabled) {
      statusMsg += `${texts.texto12} ${autoConfig.intervalHours} ${texts.texto13}\n`
    }
    
    statusMsg += `\n${texts.texto15}\n`
    statusMsg += `${texts.texto16}\n`
    statusMsg += `${texts.texto17}\n`
    statusMsg += `${texts.texto18}\n`
    statusMsg += `${texts.texto19}\n`
    statusMsg += `${texts.texto20}`
    
    m.reply(statusMsg)
  }
  
  // Comando inválido
  else {
    m.reply(texts.texto14)
  }
}

handler.command = ['limpieza']
handler.rowner = true // Solo real owner
export default handler