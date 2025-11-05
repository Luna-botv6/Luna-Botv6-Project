import fs from 'fs';
import { getConfig } from '../lib/funcConfig.js';

const handler = (m) => m;

const recentAudios = new Set();

function isDuplicateAudio(messageId, trigger) {
  const key = `${messageId}_${trigger}`;
  if (recentAudios.has(key)) return true;
  recentAudios.add(key);
  setTimeout(() => recentAudios.delete(key), 15000); 
  return false;
}

handler.all = async function (m, { conn }) {
  try {
   
    if (!m || !m.text || m.fromMe || m.isBaileys || !m.id) return;

    const chat = getConfig(m.chat) || {};
    const settings = global.db.data.settings[conn.user.jid] || {};
    const userLang = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${userLang}.json`));
    const tradutor = _translate.plugins.nv_global;

    if (chat.isBanned) return;

    const audiosEnabled = chat.audios !== undefined ? chat.audios : true;
    const audiosBotEnabled = settings.audios_bot !== undefined ? settings.audios_bot : true;

    if (!audiosEnabled || !audiosBotEnabled) return;

    const audios = {
      'hola': '01J673CQ9ZE93TRQKCKN9Q8Z0M.mp3',
      'que no': '01J6745EH5251SV6HT327JJW9G.mp3',
      'anadieleimporta|a nadie le importa': '01J6734W48PG8EA14QW517QR2K.mp3',
      'araara|ara ara': '01J672TYT2TFVG5NT5QVPJ8XHX.mp3',
      'miarda de bot|mierda de bot|mearda de bot': '01J673T2Q92H3A0AW5B8RHA2N0.mp3',
      'bañate': '01J672VZBZ488TCVYA7KBB3TFG.mp3',
      'baneado': '01J672WYXHW6JM3T8PCNQHH6MN.mp3',
      'bebito fiu fiu|bff': '01J672XP5MW9J5APRSDFYRTTE9.mp3',
      'buenas noches|boanoite': '01J672YMA8AS2Z8YFMHB68GBQX.mp3',
      'buenas tardes|boatarde': '01J672ZCDK26GJZQ5GDP60TZ37.mp3',
      'buenos dias|buenos días': '01J6730WRS4KJEZ281N2KJR1SV.mp3',
      'sexo|hora de sexo': 'AUD-20250531-WA0049.mp3',
      'gemidos|gemime|gime': '01J673B4CRSS9Z2CX6E4R8MZPZ.mp3',
      'audio hentai|audiohentai': '01J673BTPKK29A7CVJW9WKXE9T.mp3',
      'fiesta del admin': '01J672T4VQFK8ZSSD1G0MXMPD3.mp3',
      'te amo|teamo': '01J6748B0RYBJWX5TBMWQZYX95.mp3',
      'siu|siiuu|siuuu': '01J6747RFN09GR42AXY18VFW10.mp3',
      'uwu': '01J674A7N7KNER6GY6FCYTTZSR.mp3',
      'yamete|yamete kudasai': '01J674DR0CB7BD43HHBN1CBBC8.mp3',
      'vivan los novios': '01J674D3S12JTFDETTNF12V4W8.mp3',
      'gatito|gato|oiia|oia|uiia|Gato|Gatito|Oiia|Oia|Uiia': 'gatoxd.mp3',
      'A': '01J672JMF3RCG7BPJW4X2P94N2.mp3',
      'pasa pack': '01J6735MY23DV6ES9XHBP06K9R.mp3'
    };

    const message = m.text.toLowerCase();
    
    
    for (const [trigger, file] of Object.entries(audios)) {
      const keywords = trigger.split('|');
      const matchedKeyword = keywords.find(k => message.includes(k));
      
      if (matchedKeyword) {
       
        if (isDuplicateAudio(m.id, matchedKeyword)) {
          console.log(`🔄 Audio duplicado bloqueado: ${matchedKeyword} - ${m.id}`);
          return;
        }

        const path = `./src/assets/audio/${file}`;
        if (!fs.existsSync(path)) {
          console.log(`❌ Archivo de audio no encontrado: ${path}`);
          return;
        }

        try {
          
          await conn.sendPresenceUpdate('recording', m.chat);
          console.log(`🎙️ Mostrando "grabando audio..." para: ${matchedKeyword}`);
          
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
       
          await conn.sendFile(m.chat, path, 'audio.mp3', '', m, true, {
            mimetype: 'audio/mpeg'
          });
          
          console.log(`✅ Audio enviado: ${matchedKeyword} - ${m.id}`);
        } catch (sendError) {
          console.error(`❌ Error enviando audio:`, sendError);
        }
        
        break; 
      }
    }
  } catch (e) {
    console.error('❌ Error en audios-globales.js:', e);
  }
};

export default handler;