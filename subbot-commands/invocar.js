(async () => {
  // Si no envían mensaje, avisar uso correcto
  if (!args.length) {
    await sock.sendMessage(m.chat, { text: '*Usa:* /invocar <mensaje>' }, { quoted: m });
    return;
  }

  // Verificar si es un grupo
  if (!m.isGroup) {
    await sock.sendMessage(m.chat, { text: '*Este comando solo funciona en grupos*' }, { quoted: m });
    return;
  }

  const pesan = args.join(' ');
  let teks = `Invocando a todos: ${pesan}\n\n`;
  teks += `┏ Lista de participantes:\n`;

  try {
    // Obtener metadata del grupo
    const groupMetadata = await sock.groupMetadata(m.chat);
    const participants = groupMetadata.participants;
    
    // Array para almacenar los JIDs de todos los participantes
    const mentions = [];
    
    // Agregar cada participante a la lista
    participants.forEach((participant, index) => {
      const jid = participant.id;
      mentions.push(jid);
      
      // Extraer el número del JID
      const number = jid.split('@')[0];
      teks += `┣➥ @${number}\n`;
    });
    
    teks += `┗ Luna-Botv5 - Bot`;

    // Enviar el mensaje mencionando a todos los participantes
    await sock.sendMessage(m.chat, { 
      text: teks, 
      mentions: mentions 
    });
    
  } catch (error) {
    console.error('Error al obtener participantes del grupo:', error);
    await sock.sendMessage(m.chat, { 
      text: '*Error al obtener la lista de participantes del grupo*' 
    }, { quoted: m });
  }
})();