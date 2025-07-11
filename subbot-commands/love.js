export default async function handler(sock, m, args) {
  // Verificar que sock existe y tiene sendMessage
  if (!sock || typeof sock.sendMessage !== 'function') {
    console.error('❌ sock no válido en comando love');
    return;
  }

  let user1, user2, name1, name2;

  // Verificar menciones seguras
  const mentionedJids = m?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (mentionedJids.length >= 2) {
    user1 = mentionedJids[0];
    user2 = mentionedJids[1];
  } else if (mentionedJids.length === 1) {
    user1 = mentionedJids[0];
    user2 = m.sender;
  } else if (args.length >= 2) {
    name1 = args[0];
    name2 = args.slice(1).join(' ');
  } else {
    await sock.sendMessage(m.chat, { 
      text: `*Usa el comando así:*\n/love <@usuario1> <@usuario2>\n/love <nombre1> <nombre2>\n\nEjemplos:\n/love @juan @maria\n/love Juan Maria` 
    }, { quoted: m });
    return;
  }

  // Obtener nombres reales si son usuarios mencionados
  if (user1 && user2) {
    try {
      // Usar método más seguro para obtener nombres
      name1 = user1.split('@')[0];
      name2 = user2.split('@')[0];
      
      // Intentar obtener nombres reales si el método getContact existe
      if (typeof sock.getContact === 'function') {
        try {
          const contact1 = await sock.getContact(user1);
          if (contact1 && (contact1.notify || contact1.name)) {
            name1 = contact1.notify || contact1.name;
          }
        } catch (e) {
          // Si falla, mantener el número
        }

        try {
          const contact2 = await sock.getContact(user2);
          if (contact2 && (contact2.notify || contact2.name)) {
            name2 = contact2.notify || contact2.name;
          }
        } catch (e) {
          // Si falla, mantener el número
        }
      }
    } catch (e) {
      console.error('Error obteniendo nombres:', e);
      name1 = user1.split('@')[0];
      name2 = user2.split('@')[0];
    }
  }

  // Calcular compatibilidad
  const percentage = Math.floor(Math.random() * 101);
  const loveBarLength = 10;
  const filledHearts = Math.round((percentage / 100) * loveBarLength);
  const emptyHearts = loveBarLength - filledHearts;
  const loveBar = '❤️'.repeat(filledHearts) + '🤍'.repeat(emptyHearts);

  // Resultado textual
  let mensajeFinal = '';
  if (percentage > 90) mensajeFinal = '¡Almas gemelas! El destino los une para siempre.';
  else if (percentage > 70) mensajeFinal = 'Hay una conexión muy fuerte entre ustedes.';
  else if (percentage > 50) mensajeFinal = 'Tienen potencial, pero deben conocerse más.';
  else if (percentage > 30) mensajeFinal = 'Podrían intentarlo, aunque hay diferencias.';
  else mensajeFinal = 'Tal vez solo sea amistad… o ni eso.';

  // Mensaje adicional
  function getLoveMessage(p) {
    if (p >= 95) return '🌟 ¡Una conexión perfecta! Las estrellas se alinean para ustedes.';
    if (p >= 85) return '💫 ¡Increíble química! El amor está en el aire.';
    if (p >= 75) return '✨ ¡Muy compatible! Podrían tener un futuro brillante juntos.';
    if (p >= 65) return '🌙 Buena conexión, con potencial para crecer.';
    if (p >= 55) return '🌸 Hay algo especial aquí, vale la pena explorarlo.';
    if (p >= 45) return '🍀 Podrían funcionar con el esfuerzo adecuado.';
    if (p >= 35) return '🌿 Tal vez como amigos sea mejor opción.';
    if (p >= 25) return '🍃 La amistad podría ser el camino ideal.';
    if (p >= 15) return '🌫️ Mejor mantener la distancia por ahora.';
    return '🌨️ Parece que no hay chispa entre ustedes.';
  }

  // Resultado final
  let resultText = `
╭━━━〔 *💕 Test del Amor* 〕━━━⬣
┃
┃ *👥 Pareja:*
┃ • ${user1 && user2 ? `@${user1.split('@')[0]}` : name1}
┃ • ${user1 && user2 ? `@${user2.split('@')[0]}` : name2}
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

  try {
    // Enviar con o sin menciones
    await sock.sendMessage(m.chat, { 
      text: resultText, 
      mentions: user1 && user2 ? [user1, user2] : [] 
    }, { quoted: m });
  } catch (error) {
    console.error('Error enviando mensaje de love:', error);
    // Intentar enviar un mensaje simple sin menciones
    await sock.sendMessage(m.chat, { 
      text: `💕 *Test del Amor*\n\n${name1} ❤️ ${name2}\n\n*Compatibilidad:* ${percentage}%\n${loveBar}\n\n${mensajeFinal}` 
    }, { quoted: m });
  }
}