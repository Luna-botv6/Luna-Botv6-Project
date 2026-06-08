import fs from 'fs';

let handler = async (m, { conn, text, participants }) => {
  console.log('✅ Se ejecutó el comando /darmod');

  if (!m.mentionedJid || m.mentionedJid.length === 0) {
    console.log('⚠️ No se etiquetó a nadie.');
    return m.reply('Etiqueta a alguien para darle mod (lidOwner).');
  }

  const number = m.mentionedJid[0].split('@')[0];
  console.log(`📌 Número a añadir: ${number}`);

  if (global.lidOwners.includes(number)) {
    console.log('ℹ️ El número ya está en la lista.');
    return m.reply('Ese número ya es mod (lidOwner).');
  }

  global.lidOwners.push(number);
  console.log('✅ Número añadido a la lista global.lidOwners.');

  // Actualiza config.js
  updateLidOwners();

  m.reply(`✅ Se añadió a @${number} como mod (lidOwner).`, null, { mentions: [m.mentionedJid[0]] });
};

handler.help = ['darmod @tag'];
handler.tags = ['owner'];
handler.command = /^darmod$/i;
handler.owner = true;

export default handler;

function updateLidOwners() {
  const configFile = './config.js';
  let configContent = fs.readFileSync(configFile, 'utf-8');

  // Reemplaza la línea de global.lidOwners con la nueva lista
  const newLidOwners = JSON.stringify(global.lidOwners, null, 2);
  configContent = configContent.replace(/global\.lidOwners\s*=\s*\[[\s\S]*?\];/, `global.lidOwners = ${newLidOwners};`);

  fs.writeFileSync(configFile, configContent);
  console.log('💾 Se actualizó config.js con la nueva lista de lidOwners.');
}
