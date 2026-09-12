let recordatorios = {};

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.recordatorio || {};
  const id = m.chat;

  if (!text) {
    return m.reply(
      t.ayuda || (
      '📌 *Uso del comando /recordar:*\n\n' +
      '1. *Crear recordatorio:*\n' +
      '→ /recordar 10m Jugamos @usuario\n' +
      '→ /recordar 1h30m Empezamos evento\n\n' +
      '2. *Cancelar recordatorio:*\n' +
      '→ /recordar cancelar <ID>\n\n' +
      '3. *Editar recordatorio:*\n' +
      '→ /recordar editar <ID> 15m Nuevo mensaje\n\n' +
      'Puedes usar: segundos (s), minutos (m), horas (h).')
    );
  }

  if (args[0] === 'cancelar') {
    const recordatorioId = args[1];
    if (recordatorios[recordatorioId]) {
      clearTimeout(recordatorios[recordatorioId].timeout);
      delete recordatorios[recordatorioId];
      return m.reply((t.cancelado?.replace('{id}', recordatorioId) || `✅ Recordatorio *${recordatorioId}* cancelado.`));
    } else {
      return m.reply((t.no_encontrado?.replace('{id}', recordatorioId) || `❌ No se encontró el recordatorio con ID *${recordatorioId}*.`));
    }
  }

  if (args[0] === 'editar') {
    const recordatorioId = args[1];
    if (!recordatorios[recordatorioId]) return m.reply(t.sin_existencia || '❌ No existe ese ID.');

    const tiempo = parseTiempo(args[2]);
    if (tiempo === null) return m.reply(t.tiempo_invalido || '⏱️ Tiempo inválido. Usa: 10s, 5m, 1h30m...');

    const nuevoTexto = args.slice(3).join(' ');
    if (!nuevoTexto) return m.reply(t.texto_faltante || '📝 Agrega el nuevo texto para el recordatorio.');

    clearTimeout(recordatorios[recordatorioId].timeout);
    recordatorios[recordatorioId] = {
      timeout: setTimeout(() => {
        conn.sendMessage(id, {
          text: (t.editado_msg?.replace('{msg}', nuevoTexto) || `⏰ *Recordatorio editado:*\n${nuevoTexto}`),
          mentions: recordatorios[recordatorioId].mentions || []  // Menciones en el grupo
        });
        delete recordatorios[recordatorioId];
      }, tiempo),
      texto: nuevoTexto,
      mentions: m.mentionedJid || []  // Asegúrate que las menciones se están capturando correctamente
    };
    return m.reply((t.editado_ok?.replace('{id}', recordatorioId) || `✏️ Recordatorio *${recordatorioId}* editado con éxito.`));
  }

  const tiempoTexto = args[0];
  const tiempo = parseTiempo(tiempoTexto);
  if (tiempo === null) return m.reply(t.tiempo_invalido || '⏱️ Tiempo inválido. Usa: 10s, 5m, 1h30m...');

  const mensaje = args.slice(1).join(' ');
  if (!mensaje) return m.reply(t.mensaje_faltante || '📝 Escribe el mensaje para recordar.');

  const recordatorioId = Date.now().toString().slice(-6);

  // Verifica si hay menciones y asigna las menciones correctamente
  const menciones = m.mentionedJid && m.mentionedJid.length ? m.mentionedJid : [];  // Captura las menciones correctamente

  recordatorios[recordatorioId] = {
    timeout: setTimeout(() => {
      conn.sendMessage(id, {
        text: (t.recordatorio_msg?.replace('{msg}', mensaje) || `⏰ *Recordatorio:* ${mensaje}`),
        mentions: menciones // Usa las menciones capturadas
      });
      delete recordatorios[recordatorioId];
    }, tiempo),
    texto: mensaje,
    mentions: menciones  // Asegúrate de que las menciones se están guardando
  };

  m.reply((t.programado?.replace('{tiempo}', tiempoTexto).replace('{id}', recordatorioId) || `✅ Recordatorio programado para ${tiempoTexto} con ID *${recordatorioId}*`));
};

handler.help = ['recordar'];
handler.tags = ['tools'];
handler.command = /^recordar$/i;

export default handler;

function parseTiempo(texto) {
  const match = texto.match(/(\d+h)?(\d+m)?(\d+s)?/);
  if (!match) return null;

  let ms = 0;
  if (match[1]) ms += parseInt(match[1]) * 60 * 60 * 1000;
  if (match[2]) ms += parseInt(match[2]) * 60 * 1000;
  if (match[3]) ms += parseInt(match[3]) * 1000;
  return ms || null;
}






