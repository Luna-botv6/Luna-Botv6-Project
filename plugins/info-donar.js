const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.info_donar || {};
  const name = await conn.getName(m.sender);
  const donar = (t.texto?.replace('{nombre}', name) || `
┏━━━━━━━━━━━━━━━━━┓
┃ 🌙 *${global.BotName}* ┃
┗━━━━━━━━━━━━━━━━━┛

¡Hola, *${name}*!  
Gracias por usar *${global.BotName}*.

✨ *Donaciones*

• *Principal (PayPal)*: gercoto17@gmail.com
  https://www.paypal.com/donate?business=gercoto17%40gmail.com

• *Mercado Pago*: german.elias.23

Toda ayuda es bienvenida y permite mantener el bot activo y mejorar funciones. ❤️

¡Gracias por tu apoyo!

⚙️ *Versión*: ${global.BotName}  
`).trim();

  await conn.sendMessage(m.chat, { text: donar }, { quoted: m });
};

handler.command = /^dona(te|si)?|donar|apoyar$/i;
handler.help = ['donar', 'apoyar'];
handler.tags = ['info'];
export default handler;