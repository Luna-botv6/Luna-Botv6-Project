const MENU_KEYWORDS = [
  'menu', 'menú', 'comandos', 'ayuda', 'help', 'opciones', 'funciones'
];

function canHandle(text) {
  const lowerText = text.toLowerCase();
  return MENU_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

async function handle(inputText, context, menuHandler) {
  const { conn, msg, jid, isGroup } = context;
  
  try {
    const fakeM = {
      ...msg, chat: jid,
      key: { ...msg.key, remoteJid: jid },
      sender: msg.key.participant || msg.key.remoteJid,
      isGroup: isGroup
    };

    await menuHandler(fakeM, { conn, text: inputText, usedPrefix: '.', command: 'menu', isPrems: false });
  } catch (menuError) {
    console.error('Error procesando menú:', menuError.message);
    await conn.sendMessage(jid, { text: '⚠️ *Error procesando el menú.* Intenta de nuevo.' }, { quoted: msg });
  }
}

export default { canHandle, handle, name: 'menu', description: 'Plugin para mostrar el menú de comandos' };