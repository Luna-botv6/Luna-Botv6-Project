import fs from 'fs';
import path from 'path';

const handler = async (m, { conn, text, isOwner }) => {
  if (!isOwner) return m.reply('❌ Solo el propietario del bot puede usar este comando.');

  const numero = text?.trim().replace(/[^0-9]/g, '');
  
  if (!numero) {
    return m.reply('❌ Uso correcto:\n\n' +
      'Ejemplo: /editjoin 5493483466763\n\n' +
      '💡 Ingresa solo el número sin espacios ni símbolos.');
  }

  if (numero.length < 10 || numero.length > 15) {
    return m.reply('❌ Número inválido. Debe tener entre 10 y 15 dígitos.\n\n' +
      'Ejemplo: /editjoin 5493483466763');
  }

  try {
    const joinFilePath = path.join(process.cwd(), 'plugins', 'owner-join.js');
    
    if (!fs.existsSync(joinFilePath)) {
      return m.reply('❌ No se encontró el archivo owner-join.js');
    }

    let fileContent = fs.readFileSync(joinFilePath, 'utf8');
    
    const oldNumberRegex = /const mainOwner = '(\d+)@s\.whatsapp\.net';/;
    const match = fileContent.match(oldNumberRegex);
    
    if (!match) {
      return m.reply('❌ No se pudo encontrar la configuración del owner en el archivo.');
    }

    const oldNumber = match[1];
    
    if (oldNumber === numero) {
      return m.reply(`ℹ️ El número ya está configurado como: ${numero}`);
    }

    fileContent = fileContent.replace(
      oldNumberRegex,
      `const mainOwner = '${numero}@s.whatsapp.net';`
    );

    fs.writeFileSync(joinFilePath, fileContent, 'utf8');

    await m.reply(`✅ *Número actualizado exitosamente*\n\n` +
      `📱 Número anterior: ${oldNumber}\n` +
      `📱 Número nuevo: ${numero}\n\n` +
      `✨ Las nuevas solicitudes de grupo se enviarán a este número.`);

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (error) {
    console.error('Error editando owner-join:', error);
    await m.reply(`❌ Error al actualizar el archivo:\n\n${error.message}\n\n` +
      `Verifica los permisos del archivo.`);
  }
};

handler.help = ['editjoin [número]'];
handler.tags = ['owner'];
handler.command = /^editjoin$/i;
handler.owner = true;

export default handler;