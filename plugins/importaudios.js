import { getCustomAudios } from '../lib/funcion/audiosStore.js';
import { getAudiosDelGrupo, setAudioEnGrupo } from '../lib/funcion/audiosGrupos.js';

function entradasOrdenadas(audios) {
  return Object.entries(audios).sort((a, b) => {
    const na = (a[1] && a[1].original) || a[0];
    const nb = (b[1] && b[1].original) || b[0];
    return na.localeCompare(nb);
  });
}

function parseNumeros(raw, max) {
  const elegidos = new Set();
  const tokens = raw.split(/[\s,;]+/).filter(Boolean);
  for (const tk of tokens) {
    const rango = tk.match(/^(\d+)-(\d+)$/);
    if (rango) {
      let a = parseInt(rango[1], 10);
      let b = parseInt(rango[2], 10);
      if (Number.isNaN(a) || Number.isNaN(b)) return null;
      if (a > b) [a, b] = [b, a];
      if (a < 1 || b > max) return null;
      for (let n = a; n <= b; n++) elegidos.add(n);
      continue;
    }
    if (!/^\d+$/.test(tk)) return null;
    const n = parseInt(tk, 10);
    if (n < 1 || n > max) return null;
    elegidos.add(n);
  }
  return [...elegidos].sort((x, y) => x - y);
}

const handler = async (m, { conn, args, usedPrefix, command, isOwner, isROwner }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.importar_audios || {};
  if (!m.isGroup) return m.reply(t.solo_grupos || '❌ Este comando solo funciona en grupos.');
  const esOwner = !!(isOwner || isROwner);
  if (!esOwner) return m.reply(t.solo_owner || '❌ Solo el owner puede importar audios.');

  const biblioteca = getCustomAudios();
  const bibEntries = entradasOrdenadas(biblioteca);
  if (bibEntries.length === 0) return m.reply(t.sin_audios || '📭 Todavía no hay audios en la biblioteca para importar.');

  const grupoAudios = getAudiosDelGrupo(m.chat);
  const prefix = usedPrefix || '.';

  const mostrarLista = () => {
    let msg = (t.lista_titulo || '📥 *Biblioteca de audios*\n\n');
    bibEntries.forEach((([trigger, data], i) => {
      const marca = grupoAudios[trigger] ? ' ✅' : '';
      msg += `▶️ *${i + 1}.* ${data.original || trigger}${marca}\n`;
    }));
    msg += (t.lista_footer?.replace('{prefix}', prefix).replace('{command}', command || 'importaudios') || `\n_Escribí *${prefix}${command || 'importaudios'} 1 3 5* para traer solo esos, o *${prefix}${command || 'importaudios'} todo* para traer todos._\n_Los ✅ ya están en este grupo._`);
    return msg;
  };

  const raw = args.join(' ').trim();
  if (!raw) return m.reply(mostrarLista());

  const primera = raw.toLowerCase();
  let indices;
  if (primera === 'todo' || primera === 'todos' || primera === 'all') {
    indices = bibEntries.map((_, i) => i + 1);
  } else {
    indices = parseNumeros(raw, bibEntries.length);
    if (!indices || indices.length === 0) return m.reply((t.numeros_invalidos || '❌ Números inválidos. Usá:') + '\n\n' + mostrarLista());
  }

  let nuevos = 0;
  let repetidos = 0;
  const traidos = [];
  for (const n of indices) {
    const [trigger, data] = bibEntries[n - 1];
    if (getAudiosDelGrupo(m.chat)[trigger]) {
      repetidos++;
      continue;
    }
    setAudioEnGrupo(m.chat, trigger, {
      file: data.file,
      original: data.original || trigger,
      addedBy: data.addedBy || m.sender,
      date: Date.now()
    });
    nuevos++;
    if (traidos.length < 20) traidos.push(data.original || trigger);
  }

  let msg = (t.exito_titulo || '✅ *Importación lista*\n\n');
  msg += (t.exito_detalle?.replace('{nuevos}', nuevos).replace('{repetidos}', repetidos) || `📥 *Nuevos:* ${nuevos}\n🔁 *Ya estaban:* ${repetidos}\n`);
  if (traidos.length > 0) {
    msg += `\n${traidos.map((f) => `▶️ *${f}*`).join('\n')}`;
    if (nuevos > traidos.length) msg += `\n_...y ${nuevos - traidos.length} más._`;
  }
  await m.reply(msg.trim());
};

handler.command = /^(importaudios|importaraudios)$/i;
handler.group = true;

export default handler;
