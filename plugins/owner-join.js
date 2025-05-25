import fs from 'fs';

const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i;
let enviando;

const handler = async (m, { conn, text, isMods, isOwner, isPrems }) => {
  const idioma = global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_join;

  if (enviando) return;
  enviando = true;

  try {
    const link = text;
    if (!link || !link.match(linkRegex)) throw tradutor.texto1; // Usamos tradutor.texto1 como mensaje por defecto
    const [_, code] = link.match(linkRegex) || [];

    if (isPrems || isMods || isOwner || m.fromMe) {
      await conn.groupAcceptInvite(code);
      await conn.sendMessage(m.chat, { text: tradutor.texto2 }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: tradutor.texto3 }, { quoted: m });

      // Enviar mensaje al propietario del bot (para ser notificado de la solicitud de agregar el bot al grupo)
      const dataArray = global.owner.filter(([id]) => id);
      for (const entry of dataArray) {
        const number = Array.isArray(entry) ? entry[0] : entry;
        await conn.sendMessage(number + '@s.whatsapp.net', {
          text: `El usuario @${m.sender.split('@')[0]} quiere agregar al bot a un grupo.\n\nLink: ${link}`,
          mentions: [m.sender]
        }, { quoted: m });
      }
    }

    enviando = false;
  } catch (err) {
    console.error(err);
    enviando = false;
    throw tradutor.texto5; // Mensaje de error en caso de problema
  }
};

handler.help = ['join [chat.whatsapp.com]'];
handler.tags = ['premium'];
handler.command = /^join|nuevogrupo$/i;
handler.private = true;

export default handler;


