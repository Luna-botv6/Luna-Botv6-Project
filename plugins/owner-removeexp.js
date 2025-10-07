import fs from 'fs'
import { removeExp, getUserStats } from '../lib/stats.js'

const handler = async (m, { conn, args, isOwner, isROwner, command }) => {
  try {
    const isLidOwner = global.lidOwners?.includes(m.sender) || false;
    
    if (!isOwner && !isROwner && !isLidOwner) {
      throw 'Este comando es solo para los *propietarios del bot*.';
    }

    const datas = global || {}
    const dbData = datas.db?.data?.users?.[m.sender] || {}
    const idioma = dbData.language || global.defaultLenguaje || 'es'
    
    let tradutor = {}
    try {
      const languageFile = `./src/languages/${idioma}.json`
      if (fs.existsSync(languageFile)) {
        const _translate = JSON.parse(fs.readFileSync(languageFile))
        tradutor = _translate.plugins?.owner_removeexp || {}
      }
    } catch (error) {
      console.log('Error al cargar traducciones:', error)
    }

    const defaultTexts = {
      texto1: `Uso: *${command} <cantidad> @usuario*\nEjemplo: *${command} 500 @tag*`,
      texto2: 'La cantidad de experiencia debe ser un número válido y mayor que cero.',
      texto3: 'Debes mencionar al usuario al que deseas restar EXP.',
      texto4: 'Se restaron *{exp}* puntos de experiencia a *{user}*',
      texto5: 'EXP anterior: {before} | EXP actual: {after}'
    }

    const texts = {
      texto1: tradutor.texto1 || defaultTexts.texto1,
      texto2: tradutor.texto2 || defaultTexts.texto2,
      texto3: tradutor.texto3 || defaultTexts.texto3,
      texto4: tradutor.texto4 || defaultTexts.texto4,
      texto5: tradutor.texto5 || defaultTexts.texto5
    }

    if (args.length < 2) throw texts.texto1

    const exp = parseInt(args[0])
    if (isNaN(exp) || exp <= 0) throw texts.texto2

    const mentionedJid = m.mentionedJid && m.mentionedJid[0]
    if (!mentionedJid) throw texts.texto3

    const statsBefore = getUserStats(mentionedJid)
    const expBefore = statsBefore.exp

    removeExp(mentionedJid, exp)

    const statsAfter = getUserStats(mentionedJid)
    const expAfter = statsAfter.exp

    const mensaje = texts.texto4
      .replace('{exp}', exp)
      .replace('{user}', mentionedJid.split('@')[0])
    
    const detalle = texts.texto5
      .replace('{before}', expBefore)
      .replace('{after}', expAfter)

    m.reply(`${mensaje}\n${detalle}`)

  } catch (error) {
    if (typeof error === 'string') {
      m.reply(error)
    } else {
      console.error('Error en owner-removeexp:', error)
      m.reply('⌛ Ocurrió un error al procesar el comando')
    }
  }
}

handler.command = /^removeexp$/i
handler.rowner = true
export default handler