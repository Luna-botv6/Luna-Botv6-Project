const handler = async (m, { conn }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.info_tyc;

  const terminos = `
┏━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 💼 *TÉRMINOS Y CONDICIONES* 💼
┗━━━━━━━━━━━━━━━━━━━━━━━┛

${tradutor.texto1}

━━━━━━━━━━━━━━━━━━━━━━━
🔒 *Privacidad:* Tus datos se procesan localmente. No se comparten, almacenan ni venden a terceros.

📌 *Uso del Bot:* Al interactuar con LunaBotV6, aceptas automáticamente estos términos.

📣 *Canal Oficial de WhatsApp:*
🔗 https://www.whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y

🤖 *Bot:* LunaBotV6 — un bot multifuncional diseñado para ofrecerte herramientas útiles, entretenimiento y automatización con estilo.

🧙 *Creador Principal:* *Evproject* (Desarrollador de LunaBotV6)

🧠 *Créditos Especiales:* Agradecimientos a *Bruno Sobrino*, cuyo código base inspiró y dio origen a este proyecto.

━━━━━━━━━━━━━━━━━━━━━━━
💌 *Gracias por confiar en este proyecto y ser parte de nuestra comunidad.*
`.trim();

  await conn.sendMessage(m.chat, { text: terminos }, { quoted: m });
};

handler.help = ['tyc'];
handler.tags = ['info'];
handler.command = /^(términos y condiciones y privacidad|terminosycondicionesyprivacidad|terminosycondiciones|terminos y condiciones y privacidad|terminos y condiciones|terminos de uso|términos de uso)$/i;

export default handler;


