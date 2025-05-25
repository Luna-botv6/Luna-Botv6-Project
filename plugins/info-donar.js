const handler = async (m, { conn }) => {
  const name = await conn.getName(m.sender);
  const donar = `
┏━━━━━━━━━━━━━━━━━┓
┃ 🌙 *LunaBot V6* -             ┃
┗━━━━━━━━━━━━━━━━━┛

¡Hola, *${name}*!  
Gracias por usar *LunaBot V6*.

Este bot está inspirado en el gran trabajo de *Bruno Sobrino* y su bot *Mystic-Bot*.  
Gracias a su aporte, fue posible crear nuevas herramientas y funciones útiles para ti.

✨ *Si quieres hacer una donación*  
Puedes hacerlo desde el siguiente enlace:
👉 _https://www.paypal.me/BrunoSob_

Cualquier donación es muy apreciada ❤️

¡Gracias por tu confianza y apoyo!

⚙️ *Versión*: LunaBot V6  
❤️ *Creado con cariño para ti*  
`.trim();

  await conn.sendMessage(m.chat, { text: donar }, { quoted: m });
};

handler.command = /^dona(te|si)?|donar|apoyar$/i;
handler.help = ['donar', 'apoyar'];
handler.tags = ['info'];
export default handler;