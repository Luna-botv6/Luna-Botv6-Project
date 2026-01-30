
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const toM = (a) => '@' + a.split('@')[0];

async function handler(m, { conn }) {
  try {
    const chatId = m.chat;
    const senderId = m.sender;
    
    const groupData = await getGroupDataForPlugin(conn, chatId, senderId);
    const participants = groupData?.participants || [];
    
    if (!participants || participants.length === 0) {
      return m.reply('No se encontraron participantes en el grupo.');
    }

    const ps = participants.map((v) => v.id);
    
    if (ps.length < 2) {
      return m.reply('Se necesitan al menos 2 participantes para formar una pareja.');
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
      frase = '💔 ¡No hay química! Mejor busca a alguien más...';
      emoji = '😭';
    } else if (porcentaje <= 30) {
      frase = '😕 Puede ser una amistad... pero no más.';
      emoji = '🥀';
    } else if (porcentaje <= 50) {
      frase = '🤔 Hay algo... pero deben trabajar en ello.';
      emoji = '😐';
    } else if (porcentaje <= 70) {
      frase = '😊 ¡Linda conexión, podrían ser algo bonito!';
      emoji = '💞';
    } else if (porcentaje <= 90) {
      frase = '😍 ¡Wow! Son una pareja genial, ¡se nota la chispa!';
      emoji = '🔥💘';
    } else {
      frase = '💍 ¡Almas gemelas! ¡Cásense ya!';
      emoji = '💖👩‍❤️‍👨';
    }

    const mensaje = `*💘 PAREJA IDEAL 💘*\n\n*${toM(a)} debería hacer pareja con ${toM(b)}*\n\n❤️ *Compatibilidad:* ${porcentaje}% ${emoji}\n${barra}\n\n${frase}`;

    m.reply(mensaje, null, {
      mentions: [a, b],
    });
  } catch (e) {
    console.error('Error en formarpareja:', e);
    m.reply('Ocurrió un error al intentar formar la pareja.');
  }
}

handler.help = ['formarpareja'];
handler.tags = ['main', 'fun'];
handler.command = ['formarpareja', 'formarparejas'];
handler.group = true;

export default handler;