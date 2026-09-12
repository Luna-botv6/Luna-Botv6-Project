const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.info_donar || {};
  const name = await conn.getName(m.sender);
  const donar = (t.texto?.replace('{nombre}', name) || `
┏━━━━━━━━━━━━━━━━━┓
┃ 🌙 *LunaBot V6* ┃
┗━━━━━━━━━━━━━━━━━┛

¡Hola, *${name}*!  
Gracias por usar *LunaBot V6*.

✨ *Donaciones*

• *Principal (PayPal)*: gercoto17@gmail.com
  https://www.paypal.com/donate?business=gercoto17%40gmail.com

• *Bruno Sobrino* (apoyo alternativo):
  https://www.paypal.me/BrunoSob

Toda ayuda es bienvenida y permite mantener el bot activo y mejorar funciones. ❤️

¡Gracias por tu apoyo!

⚙️ *Versión*: LunaBot V6  
`).trim();

  await conn.sendMessage(m.chat, { text: donar }, { quoted: m });
};

handler.command = /^dona(te|si)?|donar|apoyar$/i;
handler.help = ['donar', 'apoyar'];
handler.tags = ['info'];
export default handler;