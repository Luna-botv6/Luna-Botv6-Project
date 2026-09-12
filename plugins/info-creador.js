const handler = async (m, { conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.info_creador || {};
  const owners = global.owner || [];
  
  let ownersList = '';
  if (owners.length > 0) {
    ownersList = owners.map(([num, nombre]) => `• ${nombre || (t.sin_nombre || 'Sin nombre')}: wa.me/${num}`).join('\n');
  } else {
    ownersList = (t.sin_dueños || '• No hay dueños configurados');
  }

  const texto = (t.texto?.replaceAll('{botname}', global.BotName).replaceAll('{owners}', ownersList) || `
🌙 *Hola, soy ${global.BotName}* 🌙

👨‍💻 *Creador del Código:*
Este bot fue desarrollado con mucho cariño por *German Miño*, el creador original del código de ${global.BotName}. Su visión y esfuerzo hicieron posible este proyecto.

📞 *Contacto del Creador:*
• wa.me/5493483466763

👤 *Dueño(s) de esta instancia:*
El creador del código NO tiene control sobre las acciones de cada instancia del bot. Cada persona que instala ${global.BotName} es dueña de SU propio bot y puede decidir libremente (bloquear usuarios, apagar el bot, configuraciones, etc.).

Los dueños de esta instancia son:
${ownersList}

📢 *Canal Oficial:*
https://www.whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y

✨ ¡Gracias por usar ${global.BotName}!
`).trim();

  await conn.sendMessage(m.chat, { text: texto }, { quoted: m });
};

handler.help = ['owner', 'creator'];
handler.tags = ['info'];
handler.command = /^(owner|creator|creador|propietario)$/i;
export default handler;
