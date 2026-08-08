import { checkCanAutoUpdate, setAutoUpdateEnabled } from '../lib/funcion/self-update.js';

const handler = async (m, { conn, text, isROwner }) => {
  if (!isROwner) throw 'Este comando es solo para el Owner.';

  const opcion = (text || '').trim().toLowerCase();
  if (opcion !== 'on' && opcion !== 'off') {
    return m.reply('Usá *.autoupdate on* o *.autoupdate off*.');
  }

  if (opcion === 'off') {
    setAutoUpdateEnabled(false);
    return m.reply('🔕 Listo, no me voy a actualizar sola. Usá *.restart* cuando quieras actualizarme a mano.');
  }

  const statusMsg = await conn.sendMessage(m.chat, {
    text: '🔍 Voy a chequear si en tu entorno me puedo actualizar automáticamente por mi misma...'
  }, { quoted: m });

  const result = await checkCanAutoUpdate();

  if (result.ok) {
    setAutoUpdateEnabled(true);
    await conn.sendMessage(m.chat, {
      text:
        '✅ Sí, puedo. Ahora no te preocupes — de tanto en tanto voy a fijarme solo si hay una ' +
        'versión nueva y, si la hay, la instalo y me reinicio sin avisarte.',
      edit: statusMsg.key
    });
  } else {
    await conn.sendMessage(m.chat, {
      text: `❌ No puedo actualizarme sola en este entorno.\n\n_${result.reason}_\n\nSeguí actualizándome manualmente con *.restart*.`,
      edit: statusMsg.key
    });
  }
};

handler.help = ['autoupdate <on/off>'];
handler.tags = ['owner'];
handler.command = ['autoupdate'];
handler.rowner = true;
handler.private = true;

export default handler;
