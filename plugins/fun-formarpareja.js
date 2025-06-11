const toM = (a) => '@' + a.split('@')[0];

function handler(m, { groupMetadata }) {
  const ps = groupMetadata.participants.map((v) => v.id);
  const a = ps.getRandom();
  let b;
  do b = ps.getRandom();
  while (b === a);

  const porcentaje = Math.floor(Math.random() * 101); // de 0 a 100

  // Barra gráfica
  const totalBloques = 10;
  const bloquesLlenos = Math.floor((porcentaje / 100) * totalBloques);
  const barra = '▰'.repeat(bloquesLlenos) + '▱'.repeat(totalBloques - bloquesLlenos);

  // Frases y emojis por nivel
  let frase = '';
  let emoji = '';

  if (porcentaje <= 10) {
    frase = '💔 ¡No hay química! Mejor busca a alguien más...';
    emoji = '😭';
  } else if (porcentaje <= 30) {
    frase = '😕 Puede ser una amistad... pero no más.';
    emoji = '🥀';
  } else if (porcentaje <= 50) {
    frase = '🤔 Hay algo... pero deben trabajar en ello.';
    emoji = '😐';
  } else if (porcentaje <= 70) {
    frase = '😊 ¡Linda conexión, podrían ser algo bonito!';
    emoji = '💞';
  } else if (porcentaje <= 90) {
    frase = '😍 ¡Wow! Son una pareja genial, ¡se nota la chispa!';
    emoji = '🔥💘';
  } else {
    frase = '💍 ¡Almas gemelas! ¡Cásense ya!';
    emoji = '💖👩‍❤️‍👨';
  }

  const mensaje = `*💘 PAREJA IDEAL 💘*\n\n*${toM(a)} debería hacer pareja con ${toM(b)}*\n\n❤️ *Compatibilidad:* ${porcentaje}% ${emoji}\n${barra}\n\n${frase}`;

  m.reply(mensaje, null, {
    mentions: [a, b],
  });
}

handler.help = ['formarpareja'];
handler.tags = ['main', 'fun'];
handler.command = ['formarpareja', 'formarparejas'];
handler.group = true;

export default handler;
