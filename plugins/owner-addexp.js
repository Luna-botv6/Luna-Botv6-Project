import fs from 'fs';
import { addExp, getUserStats, registerLidMapping } from '../lib/stats.js';
import { limitarConcesion } from '../lib/antiCheat.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const handler = async (m, { conn, args, participants, isOwner, isROwner, command }) => {
  try {
    
    if (!isOwner && !isROwner ) {
      return m.reply('❌ Este comando es solo para los *propietarios del bot*.');
    }
    const datas = global || {};
    const dbData = datas.db?.data?.users?.[m.sender] || {};
    const idioma = dbData.language || global.defaultLenguaje || 'es';
    
    let tradutor = {};
    try {
      const languageFile = `./src/lunaidiomas/${idioma}.json`;
      if (fs.existsSync(languageFile)) {
        const _translate = JSON.parse(fs.readFileSync(languageFile));
        tradutor = _translate.plugins?.owner_addexp || {};
      }
    } catch (error) {
      console.log('Error al cargar traducciones:', error);
    }

    const defaultTexts = {
      texto1: `Uso: *${command} <cantidad> @usuario*\nEjemplo: *${command} 3000 @tag*`,
      texto2: 'La cantidad de experiencia debe ser un número válido y mayor que cero.',
      texto3: 'Debes mencionar al usuario al que deseas añadir EXP.',
    };
    const texts = {
      texto1: tradutor.texto1 || defaultTexts.texto1,
      texto2: tradutor.texto2 || defaultTexts.texto2,
      texto3: tradutor.texto3 || defaultTexts.texto3,
    };

    if (args.length < 2) return m.reply(texts.texto1);
    const exp = parseInt(args[0]);
    if (isNaN(exp) || exp <= 0) return m.reply(texts.texto2);

    const rawJid = m.mentionedJid && m.mentionedJid[0];
    if (!rawJid) return m.reply(texts.texto3);

    let mentionedJid = rawJid;
    if (rawJid.includes('@lid') && m.isGroup) {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender);
      const found = participants.find(p => p.lid === rawJid);
      if (found?.id) mentionedJid = found.id;
    }

    let senderJid = m.sender;
    if (m.sender.includes('@lid') && m.isGroup) {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender);
      const found = participants.find(p => p.lid === m.sender);
      if (found?.id) senderJid = found.id;
    }

    const concesion = limitarConcesion('exp', exp, senderJid, mentionedJid);
    if (concesion.permitido <= 0) return m.reply('⛔ Concesión rechazada por el anti-cheat.');
    const aplicado = concesion.permitido;
    addExp(mentionedJid, aplicado);
    const s = getUserStats(mentionedJid);

    const expFmt = aplicado >= 1000 ? `${(aplicado / 1000).toFixed(aplicado % 1000 === 0 ? 0 : 1)}K` : aplicado;
    const expNowFmt = s.exp >= 1000 ? `${(s.exp / 1000).toFixed(1)}K` : s.exp;

    const msg =
      '╭━━━〔 *⚡ EXP Añadida* 〕━━━⬣\n' +
      `┃ *👤 Para:* @${mentionedJid.split('@')[0]}\n` +
      `┃ *👑 Por:* @${senderJid.split('@')[0]}\n` +
      '┃\n' +
      `┃ *✨ EXP añadida:* +${expFmt}${concesion.rechazado ? ' (recortado por anti-cheat)' : ''}\n` +
      '┃\n' +
      `┃ *📈 Nivel actual:* ${s.level}\n` +
      `┃ *🏅 Rol:* ${s.role}\n` +
      `┃ *⚡ EXP actual:* ${expNowFmt}\n` +
      '╰━━━━━━━━━━━━━━━━━━━━⬣';

    m.reply(msg, null, { mentions: [mentionedJid, senderJid] });

  } catch (error) {
    if (typeof error === 'string') {
      m.reply(error);
    } else {
      console.error('Error en owner-addexp:', error);
      m.reply('⌛ Ocurrió un error al procesar el comando');
    }
  }
};
handler.command = /^addexp$/i;
handler.rowner = true;
export default handler;