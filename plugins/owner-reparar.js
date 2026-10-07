import { writeFileSync } from 'fs';
import { runDeepRepair } from '../lib/funcion/git-repair.js';

const RESTART_FILE = '/tmp/luna-restart-notify.json';

const handler = async (m, { conn, args, usedPrefix }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_reparar || {};
  const prefix = usedPrefix || '.';
  const confirma = (args[0] || '').toLowerCase();
  if (confirma !== 'si' && confirma !== 'sí') {
    return conn.sendMessage(m.chat, {
      text: t.aviso?.replace('{prefix}', prefix) || (
        '🛠️ *Reparación profunda*\n\n' +
        'Esto hace: resguardo de tus datos → reset total desde GitHub → borrado de `node_modules` y `package-lock.json` → instalación de cero → reinicio.\n\n' +
        '⏳ _El bot queda offline varios minutos._\n\n' +
        `Si estás seguro, escribí *${prefix}reparar SI*`
      )
    }, { quoted: m });
  }
  const notificar = async (texto) => {
    try {
      await conn.sendMessage(m.chat, { text: texto }, { quoted: m });
    } catch {}
  };
  try {
    await runDeepRepair({ notify: notificar });
  } catch (e) {
    await notificar((t.fallo || '❌ *No pude completar la reparación*\n\n{error}\n\n_El bot sigue con lo que tenía._').replace('{error}', e.message));
    return;
  }
  try {
    writeFileSync(RESTART_FILE, JSON.stringify({ chat: m.chat }), 'utf8');
  } catch {}
  setTimeout(() => {
    if (global.gc) global.gc();
    process.kill(process.ppid, 'SIGTERM');
  }, 3000);
};

handler.help = ['reparar SI'];
handler.tags = ['owner'];
handler.command = ['reparar'];
handler.rowner = true;

export default handler;
