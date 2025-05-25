const handler = async (m, { args, usedPrefix, command }) => {
  if (args.length < 2) return m.reply(`*Usa el comando así:*\n${usedPrefix + command} <nombre1> <nombre2>\n\nEjemplo:\n${usedPrefix + command} Juan Maria`);

  const name1 = args[0];
  const name2 = args.slice(1).join(' ');

  const percentage = Math.floor(Math.random() * 101);
  const loveBarLength = 10;
  const filledHearts = Math.round((percentage / 100) * loveBarLength);
  const emptyHearts = loveBarLength - filledHearts;

  const loveBar = '❤️'.repeat(filledHearts) + '🤍'.repeat(emptyHearts);

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

  const resultText = `*Test del Amor ❤️*\n\n*${name1}* + *${name2}*\n\n*Compatibilidad:* ${percentage}%\n${loveBar}\n\n${mensajeFinal}`;

  await m.reply(resultText);
};

handler.help = ['love <nombre1> <nombre2>'];
handler.tags = ['fun'];
handler.command = /^love$/i;

export default handler;
