import {
  esBotIgnorado,
  agregarBotIgnorado,
  quitarBotIgnorado,
  listarBotsIgnorados,
  cantidadBotsIgnorados
} from '../lib/funcion/botsIgnorados.js';

let handler = async (m, { conn, command, usedPrefix, args }) => {
  const sub = (args[0] || '').toLowerCase();
  const target = String(args[1] || '');

  const botNum = conn.user?.jid?.split('@')[0]?.split(':')[0];

  if (sub === 'add' || sub === 'agregar' || sub === '+') {
    const num = target.replace(/[^0-9]/g, '');
    if (!num) return m.reply(`🤖 *Uso:* ${usedPrefix}${command} add <número>\n\nAgrega un bot a la lista de ignorados para que este bot no le responda nada (evita bucles de bots mencionándose entre sí).`);
    if (num === botNum) return m.reply('No puedo ignorarme a mí misma 😅');
    if (agregarBotIgnorado(num + '@s.whatsapp.net')) return m.reply(`🤖 Ignoraré a *${num}* desde ahora. No le responderé ni procesaré sus mensajes.`);
    return m.reply('Ese número ya está en la lista de bots ignorados.');
  }

  if (sub === 'remove' || sub === 'quitar' || sub === 'del' || sub === '-') {
    const num = target.replace(/[^0-9]/g, '');
    if (!num) return m.reply(`🤖 *Uso:* ${usedPrefix}${command} remove <número>`);
    if (quitarBotIgnorado(num + '@s.whatsapp.net')) return m.reply(`✅ Dejé de ignorar a *${num}*.`);
    return m.reply('Ese número no estaba en la lista de bots ignorados.');
  }

  if (sub === 'list' || sub === 'lista' || sub === 'l') {
    const lista = listarBotsIgnorados();
    if (!lista.length) return m.reply('📭 No hay ningún bot en la lista de ignorados.');
    return m.reply(`🤖 *Bots ignorados (${lista.length}):*\n\n${lista.map((j, i) => `${i + 1}. ${j}`).join('\n')}`);
  }

  return m.reply(
    `🤖 *Bots ignorados:* ${cantidadBotsIgnorados()}\n\n` +
    `Evita que Luna entre en bucle con otros bots que se mencionan entre sí. Los mensajes de esos bots se ignoran por completo.\n\n` +
    `*Uso:*\n` +
    `• ${usedPrefix}${command} add <número> — ignorar un bot\n` +
    `• ${usedPrefix}${command} remove <número> — dejar de ignorarlo\n` +
    `• ${usedPrefix}${command} list — ver la lista`
  );
};

handler.help = ['ignorarbot'];
handler.tags = ['owner'];
handler.command = /^(ignorarbot|ignorarbots)$/i;
handler.owner = true;

export default handler;