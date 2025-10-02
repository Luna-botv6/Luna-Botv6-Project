import fs from 'fs';
import path from 'path';

const GAME_FILE = path.resolve('./plugins/game-ialuna.js');

const handler = async (m, { conn, text, isOwner }) => {
  const sender = m.sender;
  const senderNumber = sender.split('@')[0];
  
  const isLidOwner = global.lidOwners && global.lidOwners.includes(senderNumber);
  const isRegularOwner = isOwner || (global.owner && global.owner.some(owner => owner[0] === senderNumber));
  
  if (!isLidOwner && !isRegularOwner) {
    return m.reply('⚠️ Solo el *owner* puede usar este comando.');
  }

  if (!text) {
    return m.reply('⚠️ Usa el comando así: `.iadd 1234567890`');
  }

  const newNumber = text.trim().replace(/\D/g, '');

  if (!newNumber) {
    return m.reply('❌ El número debe contener solo dígitos.');
  }

  try {
    let fileContent = fs.readFileSync(GAME_FILE, 'utf8');

    fileContent = fileContent.replace(/77060907253864/g, newNumber);

    fs.writeFileSync(GAME_FILE, fileContent, 'utf8');

    m.reply(`✅ Número actualizado correctamente a: @${newNumber}\n(Reinicia el bot para aplicar los cambios).`);
  } catch (err) {
    console.error('Error al actualizar número:', err.message);
    m.reply('❌ Ocurrió un error al intentar actualizar el número.');
  }
};

handler.help = ['iadd <número>'];
handler.tags = ['owner'];
handler.command = /^iadd$/i;

export default handler;