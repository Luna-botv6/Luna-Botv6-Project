const GRUPO_KEYWORDS = ['abre el grupo', 'abrir grupo', 'abrir el grupo', 'abrir chat', 'abrir'];
const CERRAR_KEYWORDS = ['cierra el grupo', 'cerrar grupo', 'cerrar el grupo', 'cerrar chat', 'cerrar'];

function canHandle(text) {
  const lowerText = text.toLowerCase();
  return GRUPO_KEYWORDS.some(k => lowerText.includes(k)) || CERRAR_KEYWORDS.some(k => lowerText.includes(k));
}

async function handle(inputText, context) {
  const { conn, msg, jid, isGroup } = context;

  if (!isGroup) {
    await conn.sendMessage(jid, { text: '⚠️ Este comando solo puede usarse en grupos.' }, { quoted: msg });
    return;
  }

  try {
    const lower = inputText.toLowerCase();

    if (CERRAR_KEYWORDS.some(k => lower.includes(k))) {
      await conn.groupSettingUpdate(jid, 'announcement');
      await conn.sendMessage(jid, { text: '🔒 El grupo ha sido *cerrado*. Solo los administradores pueden enviar mensajes.' }, { quoted: msg });
    } else if (GRUPO_KEYWORDS.some(k => lower.includes(k))) {
      await conn.groupSettingUpdate(jid, 'not_announcement');
      await conn.sendMessage(jid, { text: '🔓 El grupo ha sido *abierto*. Todos los participantes pueden enviar mensajes.' }, { quoted: msg });
    } else {
      await conn.sendMessage(jid, { text: '⚠️ Usa frases como "abrir el grupo" o "cerrar el grupo".' }, { quoted: msg });
    }
  } catch (error) {
    console.error('Error al cambiar ajustes del grupo:', error.message);
    await conn.sendMessage(jid, { text: '❌ No se pudo cambiar el estado del grupo. Revisa los permisos del bot.' }, { quoted: msg });
  }
}

export default { canHandle, handle, name: 'grupo', description: 'Abrir o cerrar el grupo con frases naturales como "abre el grupo" o "cierra el grupo"' };
