import fs from 'fs'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const toM = (a) => '@' + a.split('@')[0];

async function handler(m, { conn }) {
  try {
    const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
    const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.formarpareja

    const chatId = m.chat;
    const senderId = m.sender;
    
    const groupData = await getGroupDataForPlugin(conn, chatId, senderId);
    const participants = groupData?.participants || [];
    
    if (!participants || participants.length === 0) {
      return m.reply(tradutor.texto1);
    }

    const ps = participants.map((v) => v.id);
    
    if (ps.length < 2) {
      return m.reply(tradutor.texto2);
    }

    const a = ps[Math.floor(Math.random() * ps.length)];
    let b;
    do {
      b = ps[Math.floor(Math.random() * ps.length)];
    } while (b === a);

    const porcentaje = Math.floor(Math.random() * 101);

    const totalBloques = 10;
    const bloquesLlenos = Math.floor((porcentaje / 100) * totalBloques);
    const barra = '▰'.repeat(bloquesLlenos) + '▱'.repeat(totalBloques - bloquesLlenos);

    let frase = '';
    let emoji = '';

    if (porcentaje <= 10) {
      frase = tradutor.texto3;
      emoji = '😭';
    } else if (porcentaje <= 30) {
      frase = tradutor.texto4;
      emoji = '🥀';
    } else if (porcentaje <= 50) {
      frase = tradutor.texto5;
      emoji = '😐';
    } else if (porcentaje <= 70) {
      frase = tradutor.texto6;
      emoji = '💞';
    } else if (porcentaje <= 90) {
      frase = tradutor.texto7;
      emoji = '🔥💘';
    } else {
      frase = tradutor.texto8;
      emoji = '💖👩‍❤️‍👨';
    }

    const mensaje = `*💘 ${tradutor.texto9} 💘*\n\n*${toM(a)} ${tradutor.texto10} ${toM(b)}*\n\n❤️ *${tradutor.texto11}:* ${porcentaje}% ${emoji}\n${barra}\n\n${frase}`;

    m.reply(mensaje, null, {
      mentions: [a, b],
    });
  } catch (e) {
    console.error('Error en formarpareja:', e);
    m.reply(tradutor.texto12);
  }
}

handler.help = ['formarpareja'];
handler.tags = ['main', 'fun'];
handler.command = ['formarpareja', 'formarparejas'];
handler.group = true;

export default handler;