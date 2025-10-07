import fs from 'fs'
import { getUserStats, setUserStats } from '../lib/stats.js'

const pajak = 0;
const handler = async (m, { conn, text, isOwner, isROwner }) => {
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
        tradutor = _translate.plugins?.onwer_anadirlimit || {}
      }
    } catch (error) {
      console.log('Error al cargar traducciones:', error)
    }

    const defaultTexts = {
      texto1: "⌛ Menciona a alguien o usa el comando en privado",
      texto2: "⌛ Ingresa la cantidad de límite a añadir",
      texto3: "⌛ Solo se permiten números",
      texto4: "⌛ La cantidad debe ser mayor a 0",
      texto5: [
        "✅ Límite añadido exitosamente",
        "📊 Límite añadido:"
      ]
    }

    const texts = {
      texto1: tradutor.texto1 || defaultTexts.texto1,
      texto2: tradutor.texto2 || defaultTexts.texto2,
      texto3: tradutor.texto3 || defaultTexts.texto3,
      texto4: tradutor.texto4 || defaultTexts.texto4,
      texto5: tradutor.texto5 || defaultTexts.texto5
    }

    let who;
    if (m.isGroup) {
      who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : null;
    } else {
      who = m.chat;
    }
    
    if (!who) throw texts.texto1;

    const txt = text ? text.replace('@' + who.split`@`[0], '').trim() : '';
    if (!txt) throw texts.texto2;
    if (isNaN(txt)) throw texts.texto3;

    const dmt = parseInt(txt);
    let limit = dmt;
    const pjk = Math.ceil(dmt * pajak);
    limit += pjk;
    
    if (limit < 1) throw texts.texto4;

    const userStats = getUserStats(who);
    const limitBefore = userStats.limit;
    
    userStats.limit += dmt;

    setUserStats(who, userStats);

    m.reply(`≡ ${texts.texto5[0]}
┌──────────────
▢ ${texts.texto5[1]} ${dmt}
▢ 📊 Límite anterior: ${limitBefore}
▢ 📊 Límite actual: ${userStats.limit}
└──────────────`);

  } catch (error) {
    if (typeof error === 'string') {
      m.reply(error);
    } else {
      console.error('Error en owner-anadirLimit:', error);
      m.reply('⌛ Ocurrió un error al procesar el comando');
    }
  }
};

handler.command = ['añadirdiamantes', 'addd', 'dard', 'dardiamantes', 'addlimit', 'añadirlimit'];
handler.rowner = true;

export default handler;