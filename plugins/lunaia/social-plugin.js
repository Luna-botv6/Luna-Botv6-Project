const SOCIAL_MEDIA_KEYWORDS = [
  'redes sociales', 'redes', 'tienes canal'
];

function canHandle(text) {
  const lowerText = text.toLowerCase();
  return SOCIAL_MEDIA_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

function getSocialMediaResponse() {
  return `🌟 ¡Por supuesto! Aquí tienes todas mis redes sociales oficiales: 💫\n\n📱 **Mis Redes Sociales:**\n\n🙂 **GitHub:** \nhttps://github.com/Luna-botv6/Luna-Botv6-Project\n\n📢 **Canal Oficial de WhatsApp:** \nhttps://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y\n\n📘 **Facebook:** \nhttps://www.facebook.com/profile.php?id=61580601092491\n\n📸 **Instagram:** \nhttps://www.instagram.com/lunabotv6?igsh=MTI4eGY5ZDljYWFsZA==\n\n✨ ¡Sígueme para estar al tanto de todas las novedades y actualizaciones! 🚀\n\n💜 *Creado con amor por German Miño* 🌙`;
}

async function handle(inputText, context) {
  const { conn, msg, jid } = context;
  
  try {
    const socialResponse = getSocialMediaResponse();
    await conn.sendMessage(jid, { text: socialResponse }, { quoted: msg });
  } catch (socialError) {
    console.error('Error enviando redes sociales:', socialError.message);
    await conn.sendMessage(jid, { text: '⚠️ Error temporal mostrando mis redes sociales. Intenta de nuevo.' }, { quoted: msg });
  }
}

export default { canHandle, handle, name: 'social', description: 'Plugin para mostrar redes sociales del bot' };