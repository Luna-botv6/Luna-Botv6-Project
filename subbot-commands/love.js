// Comando love para SubBot - Guardar como: subbot-commands/love.js

let user1, user2, name1, name2;

// Si hay menciones, usar esas
if (m.message.extendedTextMessage?.contextInfo?.mentionedJid && m.message.extendedTextMessage.contextInfo.mentionedJid.length >= 2) {
  user1 = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
  user2 = m.message.extendedTextMessage.contextInfo.mentionedJid[1];
} else if (m.message.extendedTextMessage?.contextInfo?.mentionedJid && m.message.extendedTextMessage.contextInfo.mentionedJid.length === 1) {
  // Si solo hay una mención, el segundo será el que envía el mensaje
  user1 = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
  user2 = m.sender;
} else if (args.length >= 2) {
  // Si no hay menciones pero hay argumentos, usar nombres normales
  name1 = args[0];
  name2 = args.slice(1).join(' ');
} else {
  await sock.sendMessage(m.chat, { 
    text: `*Usa el comando así:*\n/love <@usuario1> <@usuario2>\n/love <nombre1> <nombre2>\n\nEjemplos:\n/love @juan @maria\n/love Juan Maria` 
  }, { quoted: m });
  return;
}

// Si tenemos usuarios (menciones), obtener sus nombres
if (user1 && user2) {
  // Obtener nombre del primer usuario
  try {
    const contact1 = await sock.getContact(user1);
    name1 = contact1.notify || contact1.name || user1.split('@')[0];
  } catch (e) {
    name1 = user1.split('@')[0];
  }

  // Obtener nombre del segundo usuario
  try {
    const contact2 = await sock.getContact(user2);
    name2 = contact2.notify || contact2.name || user2.split('@')[0];
  } catch (e) {
    name2 = user2.split('@')[0];
  }
}

// Calcular compatibilidad
const percentage = Math.floor(Math.random() * 101);
const loveBarLength = 10;
const filledHearts = Math.round((percentage / 100) * loveBarLength);
const emptyHearts = loveBarLength - filledHearts;
const loveBar = '❤️'.repeat(filledHearts) + '🤍'.repeat(emptyHearts);

// Mensaje según el porcentaje
let mensajeFinal = '';
if (percentage > 90) {
  mensajeFinal = '¡Almas gemelas! El destino los une para siempre.';
} else if (percentage > 70) {
  mensajeFinal = 'Hay una conexión muy fuerte entre ustedes.';
} else if (percentage > 50) {
  mensajeFinal = 'Tienen potencial, pero deben conocerse más.';
} else if (percentage > 30) {
  mensajeFinal = 'Podrían intentarlo, aunque hay diferencias.';
} else {
  mensajeFinal = 'Tal vez solo sea amistad… o ni eso.';
}

// Función para obtener mensaje adicional basado en el porcentaje
function getLoveMessage(percentage) {
  if (percentage >= 95) return '🌟 ¡Una conexión perfecta! Las estrellas se alinean para ustedes.';
  if (percentage >= 85) return '💫 ¡Increíble química! El amor está en el aire.';
  if (percentage >= 75) return '✨ ¡Muy compatible! Podrían tener un futuro brillante juntos.';
  if (percentage >= 65) return '🌙 Buena conexión, con potencial para crecer.';
  if (percentage >= 55) return '🌸 Hay algo especial aquí, vale la pena explorarlo.';
  if (percentage >= 45) return '🍀 Podrían funcionar con el esfuerzo adecuado.';
  if (percentage >= 35) return '🌿 Tal vez como amigos sea mejor opción.';
  if (percentage >= 25) return '🍃 La amistad podría ser el camino ideal.';
  if (percentage >= 15) return '🌫️ Mejor mantener la distancia por ahora.';
  return '🌨️ Parece que no hay chispa entre ustedes.';
}

// Construir el texto del resultado
let resultText;

if (user1 && user2) {
  // Si son usuarios etiquetados
  resultText = `
╭━━━〔 *💕 Test del Amor* 〕━━━⬣
┃
┃ *👥 Pareja:*
┃ • @${user1.split('@')[0]}
┃ • @${user2.split('@')[0]}
┃
┃ *💖 Compatibilidad:* ${percentage}%
┃ ${loveBar}
┃
┃ *🔮 Resultado:*
┃ ${mensajeFinal}
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

💬 ${getLoveMessage(percentage)}
  `.trim();
  
  // Enviar con menciones
  await sock.sendMessage(m.chat, { 
    text: resultText, 
    mentions: [user1, user2] 
  }, { quoted: m });
} else {
  // Si son nombres normales
  resultText = `
╭━━━〔 *💕 Test del Amor* 〕━━━⬣
┃
┃ *👥 Pareja:*
┃ • ${name1}
┃ • ${name2}
┃
┃ *💖 Compatibilidad:* ${percentage}%
┃ ${loveBar}
┃
┃ *🔮 Resultado:*
┃ ${mensajeFinal}
┃
╰━━━━━━━━━━━━━━━━━━━━⬣

💬 ${getLoveMessage(percentage)}
  `.trim();
  
  await sock.sendMessage(m.chat, { text: resultText }, { quoted: m });
}