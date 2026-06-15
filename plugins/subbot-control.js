import { connectionManager } from '../lib/funcion/connection-manager.js';

if (global.subbotEnabled === undefined) global.subbotEnabled = true;

const BOT = () => global.BotName || 'Luna';

const handler = async (m, { conn, command }) => {
  const isOn = command === 'subbotson';

  global.subbotEnabled = isOn;

  const active = connectionManager.getActiveConnectionCount();
  const { used, total, pct } = connectionManager.getRamStatus();

  const estado = isOn
    ? `✅ *Sistema de SubBots activado*`
    : `❌ *Sistema de SubBots desactivado*`;

  const msg =
    `${estado}\n\n` +
    `🤖 Bot: ${BOT()}\n` +
    `📊 SubBots activos: ${active}\n` +
    `🧠 RAM: ${pct}% (${used}MB/${total}MB)\n\n` +
    (isOn
      ? `_Los usuarios pueden usar /serbot para crear su SubBot._`
      : `_Ningún usuario podrá crear nuevos SubBots hasta que se reactive._`);

  conn.sendMessage(m.chat, { text: msg }, { quoted: m });
};

handler.command = ['subbotson', 'subbotsoff'];
handler.owner = true;
handler.help = ['subbotson', 'subbotsoff'];
handler.tags = ['socket'];
export default handler;
