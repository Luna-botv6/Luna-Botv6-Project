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
  const chatNombre = m.isGroup ? await conn.getName(m.chat).catch(() => m.chat) : 'este chat';

  if (sub === 'add' || sub === 'agregar' || sub === '+') {
    const num = target.replace(/[^0-9]/g, '');
    if (!num) return m.reply(`🤖 *Uso:* ${usedPrefix}${command} add <número>\n\nIgnora a ese bot SOLO en ${chatNombre} (cada grupo maneja su propia lista).`);
    if (num === botNum) return m.reply('No puedo ignorarme a mí misma 😅');
    if (agregarBotIgnorado(num + '@s.whatsapp.net', 'manual', m.chat)) return m.reply(`🤖 Ignoraré a *${num}* desde ahora en *${chatNombre}*. No le respondo ni proceso sus mensajes ahí.`);
    return m.reply('Ese número ya está ignorado en este chat.');
  }

  if (sub === 'remove' || sub === 'quitar' || sub === 'del' || sub === '-') {
    const num = target.replace(/[^0-9]/g, '');
    if (!num) return m.reply(`🤖 *Uso:* ${usedPrefix}${command} remove <número>`);
    if (quitarBotIgnorado(num + '@s.whatsapp.net', m.chat)) return m.reply(`✅ Dejé de ignorar a *${num}* en *${chatNombre}*.`);
    return m.reply('Ese número no estaba ignorado en este chat.');
  }

  if (sub === 'list' || sub === 'lista' || sub === 'l') {
    const lista = listarBotsIgnorados(m.chat);
    if (!lista.length) return m.reply('📭 No hay ningún bot ignorado en este chat.');
    const lineas = lista.map((j, i) => `${i + 1}. ${j}`);
    return m.reply(`🤖 *Bots ignorados en ${chatNombre} (${lista.length}):*\n\n${lineas.join('\n')}`);
  }

  return m.reply(
    `🤖 *Bots ignorados en este chat:* ${cantidadBotsIgnorados(m.chat)}\n\n` +
    `Evita que Luna entre en bucle con otros bots que se mencionan entre sí. La lista es POR GRUPO: cada chat maneja la suya.\n\n` +
    `*Uso:*\n` +
    `• ${usedPrefix}${command} add <número> — ignorar un bot en este chat\n` +
    `• ${usedPrefix}${command} remove <número> — dejar de ignorarlo en este chat\n` +
    `• ${usedPrefix}${command} list — ver la lista de este chat`
  );
};

handler.help = ['ignorarbot'];
handler.tags = ['owner'];
handler.command = /^(ignorarbot|ignorarbots)$/i;
handler.owner = true;

export default handler;