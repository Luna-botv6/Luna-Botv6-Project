import { enableFunction, disableFunction, isFunctionEnabled } from '../lib/owner-funciones.js';  // Ajusta ruta

const handler = async (m, { args, usedPrefix, command, conn }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_autoread || {};
  const jid = conn.user.jid;
  const keyMap = { autoread: 'auread', autoread2: 'autoread2' }; // Mapea comando a key de JSON
  const key = keyMap[command] || 'auread';

  // Asegurar estructura
  if (!global.db.data.settings) global.db.data.settings = {};
  if (!global.db.data.settings[jid]) global.db.data.settings[jid] = {};

  if (args[0] === 'on') {
    global.db.data.settings[jid][command] = true;   // Cambia en memoria para bot
    enableFunction(key);                             // Cambia en JSON para persistencia
    m.reply((t.activado?.replace('{command}', command) || `✅ ${command} activado correctamente.`));
  } else if (args[0] === 'off') {
    global.db.data.settings[jid][command] = false;
    disableFunction(key);
    m.reply((t.desactivado?.replace('{command}', command) || `🚫 ${command} desactivado correctamente.`));
  } else if (!args[0] || args[0] === 'status') {
    const estadoMemoria = global.db.data.settings[jid][command] ? (t.word_activado || 'activado') : (t.word_desactivado || 'desactivado');
    const estadoJSON = isFunctionEnabled(key) ? (t.word_activado || 'activado') : (t.word_desactivado || 'desactivado');
    m.reply(
      (t.estado_actual ? t.estado_actual
        .replace('{command}', command)
        .replace('{memoria}', estadoMemoria)
        .replace('{json}', estadoJSON)
        .replace('{prefix}', usedPrefix) : null) ||
      `📌 Estado actual de ${command}:\n- En memoria: ${estadoMemoria}\n- En JSON: ${estadoJSON}\n\n` +
      `Usa:\n${usedPrefix}${command} on\n${usedPrefix}${command} off`
    );
  } else {
    m.reply((t.uso_incorrecto ? t.uso_incorrecto
      .replace('{command}', command)
      .replace('{prefix}', usedPrefix) : null) ||
      `📌 Uso correcto:\n${usedPrefix}${command} on\n${usedPrefix}${command} off`);
  }
};

handler.command = ['autoread', 'autoread2'];
handler.owner = true;
handler.desc = 'Activa o desactiva la lectura automática de mensajes.';
export default handler;

