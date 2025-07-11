(async () => {
  // Si no envían mensaje, avisar uso correcto
  if (!args.length) {
    await sock.sendMessage(m.chat, { text: '*Usa:* /invocar <mensaje>' }, { quoted: m });
    return;
  }

  const pesan = args.join(' ');
  let teks = `Invocando a todos: ${pesan}\n\n`;
  teks += `┏ Lista de participantes:\n`;

  // Como no recibes participantes en m, etiqueta sólo al remitente
  teks += `┣➥ @${m.sender.split('@')[0]}\n`;
  teks += `┗ Luna-Botv5 - Bot`;

  // Envía el mensaje mencionando al remitente (mínimo para evitar errores)
  await sock.sendMessage(m.chat, { text: teks, mentions: [m.sender] });
})();
