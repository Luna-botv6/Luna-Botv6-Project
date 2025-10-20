import {sticker} from '../src/libraries/sticker.js';
import uploadFile from '../src/libraries/uploadFile.js';
import uploadImage from '../src/libraries/uploadImage.js';
import {webp2png} from '../src/libraries/webp2mp4.js';
import fs from 'fs';

const handler = async (m, {conn, args, usedPrefix, command}) => {
 
  if (usedPrefix == 'a' || usedPrefix == 'A') return;
  
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  
  let _translate = {};
  try {
    const translateData = await fs.promises.readFile(`./src/languages/${idioma}.json`, 'utf8');
    _translate = JSON.parse(translateData);
  } catch (e) {
    console.error('Error cargando traducción:', e.message);
    return m.reply('❌ Error al cargar el idioma. Intenta de nuevo.');
  }
  
  const tradutor = _translate.plugins?.sticker_sticker || {};
  const user = global.db.data.users[m.sender];
  
  
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || q.mediaType || '';
  
  if (!mime && !args[0]) {
    return m.reply(`${tradutor.texto1 || '❌ Responde a una imagen/video o usa:'} ${usedPrefix + command} <url>`);
  }
  
  let stiker = false;
  
  try {
    const metadata = {
      isAiSticker: true
    };
    
    
    if (/webp|image|video/g.test(mime)) {
      let img;
      
      try {
        img = await q.download?.();
      } catch (downloadError) {
        console.error('Error descargando media:', downloadError.message);
        return m.reply('❌ No pude descargar la imagen/video. Intenta de nuevo.');
      }
      
      if (!img) {
        return m.reply(`${tradutor.texto1 || '❌ Responde a una imagen/video con'} ${usedPrefix + command}`);
      }
      
      let out;
      
      try {
        
        stiker = await sticker(img, false, global.packname, global.author, ["✨"], metadata);
      } catch (e) {
        console.error('Error en primer intento de sticker:', e.message);
        
        
        try {
          if (/webp/g.test(mime)) {
            out = await webp2png(img);
          } else if (/image/g.test(mime)) {
            out = await uploadImage(img);
          } else if (/video/g.test(mime)) {
            out = await uploadFile(img);
          }
          
          if (typeof out !== 'string') {
            out = await uploadImage(img);
          }
          
          stiker = await sticker(false, out, global.packname, global.author, ["✨"], metadata);
        } catch (uploadError) {
          console.error('Error en segundo intento:', uploadError.message);
          throw uploadError;
        }
      }
    } 
    
    else if (args[0]) {
      if (isUrl(args[0])) {
        try {
          stiker = await sticker(false, args[0], global.packname, global.author, ["✨"], metadata);
        } catch (urlError) {
          console.error('Error procesando URL:', urlError.message);
          return m.reply('❌ No pude crear el sticker desde esa URL. Verifica que sea válida.');
        }
      } else {
        return m.reply(`${tradutor.texto2 || '❌ URL inválida. Ejemplo:'}\n${usedPrefix}s https://telegra.ph/file/0dc687c61410765e98de2.jpg`);
      }
    }
    
  } catch (e) {
    console.error('Error general en comando sticker:', e);
    return m.reply(`${tradutor.texto3 || '❌ Error al crear el sticker. Intenta con otra imagen/video.'}\n\nDetalles: ${e.message}`);
  }
  
 
  if (stiker) {
    try {
      await conn.sendFile(m.chat, stiker, 'sticker.webp', '', m);
    } catch (sendError) {
      console.error('Error enviando sticker:', sendError.message);
      return m.reply('❌ Error al enviar el sticker. Intenta de nuevo.');
    }
  } else {
    return m.reply(`${tradutor.texto3 || '❌ No pude crear el sticker.'} Usa: ${usedPrefix + command}`);
  }
};

handler.help = ['sfull'];
handler.tags = ['sticker'];
handler.command = /^s(tic?ker)?(gif)?(wm)?$/i;

export default handler;

const isUrl = (text) => {
  return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png|webp|mp4)/, 'gi'));
};