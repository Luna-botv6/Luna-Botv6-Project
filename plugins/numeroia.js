import fs from 'fs';
import path from 'path';

const GAME_FILE = path.resolve('./plugins/game-ialuna.js');

const handler = async (m, { conn, text, isOwner }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.numeroia || {};
  const sender = m.sender;
  const senderNumber = sender.split('@')[0];
  
  const isLidOwner = global.lidOwners && global.lidOwners.includes(senderNumber);
  const isRegularOwner = isOwner || (global.owner && global.owner.some(owner => owner[0] === senderNumber));
  
  if (!isLidOwner && !isRegularOwner) {
    return m.reply(t.soloOwner || '⚠️ Solo el *owner* puede usar este comando.');
  }

  const newNumber = text ? text.trim().replace(/\D/g, '') : '';

  if (!newNumber || newNumber.length === 0) {
    return m.reply(t.usoComando || '⚠️ Usa el comando así: `/iadd 1234567890`');
  }

  try {
    let fileContent = fs.readFileSync(GAME_FILE, 'utf8');

    const regex = /const LUNA_KEYWORDS = \['@(\d+)'\];/;
    const match = fileContent.match(regex);

    if (!match) {
      return m.reply(t.noEncontrado || '❌ No se encontró LUNA_KEYWORDS en el archivo.');
    }

    const oldNumber = match[1];
    fileContent = fileContent.replace(
      `const LUNA_KEYWORDS = ['@${oldNumber}'];`,
      `const LUNA_KEYWORDS = ['@${newNumber}'];`
    );

    fs.writeFileSync(GAME_FILE, fileContent, 'utf8');

    m.reply(t.exito?.replace('{anterior}', oldNumber).replace('{nuevo}', newNumber) || `✅ Número actualizado correctamente:\n• Anterior: @${oldNumber}\n• Nuevo: @${newNumber}\n\n(Reinicia el bot para aplicar los cambios).`);
  } catch (err) {
    console.error('Error al actualizar número:', err.message);
    m.reply(t.error || '❌ Ocurrió un error al intentar actualizar el número.');
  }
};

handler.help = ['iadd <número>'];
handler.tags = ['owner'];
handler.command = /^iadd$/i;

export default handler;