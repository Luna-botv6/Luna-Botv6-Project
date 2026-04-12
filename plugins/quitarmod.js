import fs from 'fs';

let handler = async (m, { conn, text }) => {
  console.log('✅ Se ejecutó el comando /quitarmod');

  if (!m.mentionedJid || m.mentionedJid.length === 0) {
    console.log('⚠️ No se etiquetó a nadie.');
    return m.reply('Etiqueta a alguien para quitarle mod (lidOwner).');
  }

  const number = m.mentionedJid[0].split('@')[0];
  console.log(`📌 Número a quitar: ${number}`);

  if (!global.lidOwners.includes(number)) {
    console.log('ℹ️ El número no está en la lista.');
    return m.reply(`Ese número no está en la lista de mod (lidOwner).`);
  }

  // Quita el número de la lista
  global.lidOwners = global.lidOwners.filter((n) => n !== number);
  console.log('✅ Número quitado de la lista global.lidOwners.');

  // Actualiza config.js
  updateLidOwners();

  m.reply(`✅ Se quitó a @${number} de la lista de lidOwners.`, null, { mentions: [m.mentionedJid[0]] });
};

handler.help = ['quitarmod @tag'];
handler.tags = ['owner'];
handler.command = /^quitarmod$/i;
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
