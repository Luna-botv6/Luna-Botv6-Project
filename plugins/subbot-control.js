import { connectionManager } from '../lib/funcion/connection-manager.js';

if (global.subbotEnabled === undefined) global.subbotEnabled = true;

const BOT = () => global.BotName || 'Luna';

const handler = async (m, { conn, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.subbot_control || {};
  const isOn = command === 'subbotson';

  global.subbotEnabled = isOn;

  const active = connectionManager.getActiveConnectionCount();
  const { used, total, pct } = connectionManager.getRamStatus();

  const estado = isOn
    ? (t.activado || `✅ *Sistema de SubBots activado*`)
    : (t.desactivado || `❌ *Sistema de SubBots desactivado*`);

  const msg =
    `${estado}\n\n` +
    (t.bot?.replace('{bot}', BOT()) || `🤖 Bot: ${BOT()}`) + '\n' +
    (t.subbots_activos?.replace('{cantidad}', active) || `📊 SubBots activos: ${active}`) + '\n' +
    (t.ram?.replace('{pct}', pct).replace('{usado}', used).replace('{total}', total) || `🧠 RAM: ${pct}% (${used}MB/${total}MB)`) + '\n\n' +
    (isOn
      ? (t.on_tip || `_Los usuarios pueden usar /serbot para crear su SubBot._`)
      : (t.off_tip || `_Ningún usuario podrá crear nuevos SubBots hasta que se reactive._`));

  conn.sendMessage(m.chat, { text: msg }, { quoted: m });
};

handler.command = ['subbotson', 'subbotsoff'];
handler.owner = true;
handler.help = ['subbotson', 'subbotsoff'];
handler.tags = ['socket'];
export default handler;
