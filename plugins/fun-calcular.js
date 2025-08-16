const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const tag = m.mentionedJid?.[0];
  const frase = args.join(' ').trim();

  if (!frase || !tag) {
    return m.reply(`✨ *Uso correcto:*\n${usedPrefix}${command} [frase] @usuario\n\n🔹 *Ejemplo:*\n${usedPrefix}${command} facha @usuario`);
  }

  // Limpiar la frase quitando el @número (mención) para que no salga en el texto final
  let fraseLimpia = frase.replace(/@\d{5,}/g, '').trim();

  const resultado = Math.floor(Math.random() * 101);

  let name;
  try {
    name = await conn.getName(tag);
  } catch {
    name = 'usuario';
  }

  const progressBar = (valor) => {
    const total = 10;
    const filled = Math.round(valor / 10);
    const empty = total - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  };

  // Mensaje 1 (con mención correcta solo en mentions, no en texto)
  const calcText = `🧠✨ 𝑪𝒂𝒍𝒄𝒖𝒍𝒂𝒏𝒅𝒐 𝒆𝒍 𝒏𝒊𝒗𝒆𝒍 𝒅𝒆 *${name}* 𝒑𝒂𝒓𝒂 *${fraseLimpia}*...`;
  await conn.sendMessage(m.chat, { text: calcText, mentions: [tag] }, { quoted: m });

  // Mensaje 2 (sin mención en texto)
  await new Promise(resolve => setTimeout(resolve, 1500));
  await conn.sendMessage(m.chat, { text: '⏳ 𝑷𝒓𝒐𝒄𝒆𝒔𝒂𝒏𝒅𝒐 𝒓𝒆𝒔𝒖𝒍𝒕𝒂𝒅𝒐𝒔...' }, { quoted: m });

  // Delay final
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Comentario según %
  let comentario = '';
  if (resultado >= 90) comentario = '🔥 𝑬𝒔 𝒖𝒏 𝒂𝒖𝒕𝒆́𝒏𝒕𝒊𝒄𝒐 𝒎𝒆𝒔𝒕𝒓𝒆.';
  else if (resultado >= 75) comentario = '💫 𝑻𝒊𝒆𝒏𝒆 𝒖𝒏 𝒏𝒊𝒗𝒆𝒍 𝒆𝒏𝒗𝒊𝒅𝒊𝒂𝒃𝒍𝒆.';
  else if (resultado >= 50) comentario = '✨ 𝑵𝒐 𝒆𝒔𝒕𝒂́ 𝒏𝒂𝒅𝒂 𝒎𝒂𝒍.';
  else if (resultado >= 25) comentario = '😅 𝑷𝒐𝒅𝒓𝒊́𝒂 𝒎𝒆𝒋𝒐𝒓𝒂𝒓 𝒖𝒏 𝒑𝒐𝒄𝒐.';
  else comentario = '🙈 𝑴𝒆𝒋𝒐𝒓 𝒏𝒊 𝒉𝒂𝒃𝒍𝒂𝒎𝒐𝒔...';

  const finalText = `✅✨ 𝑹𝒆𝒔𝒖𝒍𝒕𝒂𝒅𝒐 𝒄𝒐𝒎𝒑𝒍𝒆𝒕𝒂𝒅𝒐:

🎯 *${name}* tiene un nivel de *${fraseLimpia}* del *${resultado}%*

${progressBar(resultado)}

${comentario}`;
  await conn.sendMessage(m.chat, { text: finalText }, { quoted: m });
};

handler.command = /^calcular$/i;
export default handler;

