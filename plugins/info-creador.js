const handler = async (m, { conn }) => {
  const texto = `
🌙 *Hola, soy Luna Bot* 🌙

👑 *Creador:*
• EHL VILLANO
• wa.me/5493483466763

🛠️ *Mod Alexa:*
• wa.me/5217773461176

🛠️ *Mod Deco:*
• wa.me/50259727165

📢 *Canal oficial:*
https://www.whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y

✨ ¡Gracias por usar Luna Bot!
`.trim();

  await conn.sendMessage(m.chat, { text: texto }, { quoted: m });
};

handler.help = ['owner', 'creator'];
handler.tags = ['info'];
handler.command = /^(owner|creator|creador|propietario)$/i;
export default handler;
