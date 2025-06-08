import fs from 'fs'
import { getUserStats, setUserStats } from '../lib/stats.js'

const handler = async (m, { conn, text }) => {
  try {
    // Verificar si global y sus propiedades existen
    const datas = global || {}
    const dbData = datas.db?.data?.users?.[m.sender] || {}
    const idioma = dbData.language || global.defaultLenguaje || 'es'
    
    // Cargar las traducciones de forma segura
    let tradutor = {}
    try {
      const languageFile = `./src/languages/${idioma}.json`
      if (fs.existsSync(languageFile)) {
        const _translate = JSON.parse(fs.readFileSync(languageFile))
        tradutor = _translate.plugins?.owner_quitarlimit || {}
      }
    } catch (error) {
      console.log('Error al cargar traducciones:', error)
    }

    // Textos por defecto en caso de que no existan las traducciones
    const defaultTexts = {
      texto1: "❌ Menciona a alguien o usa el comando en privado",
      texto2: "❌ Ingresa la cantidad de límite a quitar",
      texto3: "❌ Solo se permiten números",
      texto4: "❌ La cantidad debe ser mayor a 0",
      texto5: [
        "✅ Límite quitado exitosamente",
        "📊 Límite quitado:"
      ]
    }

    // Usar textos por defecto si no existen las traducciones
    const texts = {
      texto1: tradutor.texto1 || defaultTexts.texto1,
      texto2: tradutor.texto2 || defaultTexts.texto2,
      texto3: tradutor.texto3 || defaultTexts.texto3,
      texto4: tradutor.texto4 || defaultTexts.texto4,
      texto5: tradutor.texto5 || defaultTexts.texto5
    }

    // Determinar el usuario objetivo
    let who;
    if (m.isGroup) {
      who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : null;
    } else {
      who = m.chat;
    }
    
    if (!who) throw texts.texto1;

    // Obtener el texto sin la mención
    const txt = text ? text.replace('@' + who.split`@`[0], '').trim() : '';
    if (!txt) throw texts.texto2;
    if (isNaN(txt)) throw texts.texto3;

    const limitAmount = parseInt(txt);
    
    if (limitAmount < 1) throw texts.texto4;

    // Obtener stats del usuario
    const userStats = getUserStats(who);
    const limitBefore = userStats.limit;

    // Quitar límite (asegurar que no sea menor a 0)
    const newLimit = Math.max(0, limitBefore - limitAmount);
    const actualRemoved = limitBefore - newLimit;

    // Actualizar el límite
    userStats.limit = newLimit;
    setUserStats(who, userStats);

    // Responder con confirmación
    m.reply(`≡ ${texts.texto5[0]}
┌──────────────
▢ ${texts.texto5[1]} ${actualRemoved}
▢ 📊 Límite restante: ${newLimit}
${limitBefore < limitAmount ? '▢ ⚠️ El usuario no tenía suficiente límite' : ''}
└──────────────`);

  } catch (error) {
    // Manejo de errores
    if (typeof error === 'string') {
      m.reply(error);
    } else {
      console.error('Error en owner-quitarLimit:', error);
      m.reply('❌ Ocurrió un error al procesar el comando');
    }
  }
};

handler.command = ['quitarlimit', 'removelimit', 'quitarlimite', 'removelimite', 'qlimit'];
handler.rowner = true; // Solo owners pueden usar este comando

export default handler;