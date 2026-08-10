import { existsSync, unlinkSync, readFileSync } from 'fs';
import { hasAutoUpdateDecision, startAutoUpdateScheduler } from '../lib/funcion/self-update.js';
import { runUpdateAndRestart } from '../lib/funcion/update-and-restart.js';

startAutoUpdateScheduler();

const RESTART_FILE = '/tmp/luna-restart-notify.json';

const handler = async (m, { conn }) => {
  await m.reply('🔄 Actualizando y reiniciando sistema, espera un momento...');

  await runUpdateAndRestart({
    notify: (texto) => conn.sendMessage(m.chat, { text: texto }),
    restartNotifyChat: m.chat
  });
};

handler.all = async function (m, { conn }) {
  if (!existsSync(RESTART_FILE)) return;
  try {
    const data = JSON.parse(readFileSync(RESTART_FILE, 'utf8'));
    unlinkSync(RESTART_FILE);
    if (!data?.chat) return;
    await conn.sendMessage(data.chat, {
      text: '✅ Sistema actualizado y reiniciado exitosamente, estoy de vuelta 🌙'
    });

    const globalPrefix = conn.prefix || global.prefix;
    const usedPrefix = typeof globalPrefix === 'string'
      ? globalPrefix
      : Array.isArray(globalPrefix)
        ? (typeof globalPrefix[0] === 'string' ? globalPrefix[0] : '.')
        : '.';

    if (!hasAutoUpdateDecision()) {
      await conn.sendButton(
        data.chat,
        '¿Querés que a partir de ahora me actualice automáticamente por mi cuenta cuando haya una versión nueva?',
        '',
        null,
        [
          ['✅ Sí, actualizate sola', `${usedPrefix}autoupdateon`],
          ['❌ No, prefiero hacerlo yo', `${usedPrefix}autoupdateoff`]
        ],
        null,
        null,
        null
      );
    }
  } catch {}
};

handler.help = ['restart'];
handler.tags = ['owner'];
handler.command = ['restart', 'reiniciar'];
handler.rowner = true;
export default handler;
