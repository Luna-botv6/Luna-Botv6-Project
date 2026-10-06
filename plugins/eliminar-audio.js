import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { getConfig } from '../lib/funcConfig.js';
import { getCustomAudios, removeCustomAudio, getAudioFilePath } from '../lib/funcion/audiosStore.js';
import { getAudiosDelGrupo, quitarAudioDelGrupo, quitarAudioDeTodosLosGrupos, archivoEnUso } from '../lib/funcion/audiosGrupos.js';

function entradasOrdenadas(audios) {
  return Object.entries(audios).sort((a, b) => {
    const na = (a[1] && a[1].original) || a[0];
    const nb = (b[1] && b[1].original) || b[0];
    return na.localeCompare(nb);
  });
}

function buildList(grupoAudios, t) {
  const entries = entradasOrdenadas(grupoAudios);
  if (entries.length === 0) return null;

  let msg = (t.lista_titulo || '🗑️ *Audios de este grupo*\n\n');
  entries.forEach((([trigger, data], i) => {
    msg += (t.lista_item?.replace('{pos}', i + 1).replace('{nombre}', data.original || trigger) || `▶️ *${i + 1}.* ${data.original || trigger}\n`);
  }));
  msg += (t.lista_footer || '\n_Para eliminar uno, usa:_\n_*.elaudios frase o número*_');

  return msg;
}

const handler = async (m, { conn, args, isOwner, isROwner }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.eliminar_audio || {};
  if (!m.isGroup) return m.reply(t.solo_grupos || '❌ Este comando solo funciona en grupos.');

  const esOwner = !!(isOwner || isROwner);
  if (!esOwner) {
    let habilitado = false;
    try {
      habilitado = !!getConfig(m.chat)?.agaudios;
    } catch {
      habilitado = false;
    }
    if (!habilitado) return m.reply(t.solo_owner || '❌ Solo el owner puede eliminar audios en este grupo.');
    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    if (!groupData.isAdmin && !groupData.isRAdmin) return m.reply(t.solo_admins || '❌ Solo los administradores pueden eliminar audios.');
  }

  const raw = args.join(' ').trim();
  const partes = raw.split(/\s+/).filter(Boolean);
  const primera = (partes[0] || '').toLowerCase();
  const esGlobal = esOwner && (primera === 'global' || primera === 'todo' || primera === 'todos' || primera === 'all');
  const input = esGlobal ? partes.slice(1).join(' ').trim() : raw;

  if (esGlobal) {
    const biblioteca = getCustomAudios();
    const bibEntries = entradasOrdenadas(biblioteca);
    if (!input) {
      if (bibEntries.length === 0) return m.reply(t.sin_audios || '📭 No hay audios guardados todavía.');
      let lista = (t.lista_titulo || '🗑️ *Audios de la biblioteca*\n\n');
      bibEntries.forEach((([trigger, data], i) => {
        lista += `▶️ *${i + 1}.* ${data.original || trigger}\n`;
      }));
      lista += (t.lista_footer_global || '\n_Para borrar de todos lados, usa:_\n_*.elaudios global frase o número*_');
      return m.reply(lista);
    }
    let triggerKey = null;
    if (/^\d+$/.test(input)) {
      const idx = parseInt(input, 10) - 1;
      if (bibEntries[idx]) triggerKey = bibEntries[idx][0];
    } else {
      triggerKey = input.toLowerCase();
    }
    if (!triggerKey || !biblioteca[triggerKey]) return m.reply(t.no_encontrado?.replace('{lista}', '') || '❌ No encontré ningún audio con esa frase o número.');
    const data = biblioteca[triggerKey];
    quitarAudioDeTodosLosGrupos(triggerKey);
    await removeCustomAudio(triggerKey);
    if (!archivoEnUso(data.file, triggerKey)) {
      try {
        fs.unlinkSync(getAudioFilePath(data.file));
      } catch {}
    }
    return m.reply(t.exito_global?.replace('{frase}', data.original || triggerKey).replace('{archivo}', data.file) || `✅ *Audio eliminado de todos lados*\n\n🗣️ *Frase:* _${data.original || triggerKey}_`);
  }

  const grupoAudios = getAudiosDelGrupo(m.chat);
  const entries = entradasOrdenadas(grupoAudios);

  if (!input) {
    const list = buildList(grupoAudios, t);
    return m.reply(list || (t.sin_audios || '📭 Este grupo todavía no tiene audios.'));
  }

  let triggerKey = null;

  if (/^\d+$/.test(input)) {
    const idx = parseInt(input, 10) - 1;
    if (entries[idx]) triggerKey = entries[idx][0];
  } else {
    triggerKey = input.toLowerCase();
  }

  if (!triggerKey || !grupoAudios[triggerKey]) {
    const list = buildList(grupoAudios, t);
    const listText = list || (t.sin_audios || '📭 Este grupo todavía no tiene audios.');
    return m.reply((t.no_encontrado?.replace('{lista}', listText)) || `❌ No encontré ningún audio con esa frase o número en este grupo.\n\n${listText}`);
  }

  const data = grupoAudios[triggerKey];
  quitarAudioDelGrupo(m.chat, triggerKey);
  if (!archivoEnUso(data.file, triggerKey)) {
    try {
      fs.unlinkSync(getAudioFilePath(data.file));
    } catch {}
  }

  await m.reply(t.exito?.replace('{frase}', data.original || triggerKey).replace('{archivo}', data.file) || `✅ *Audio eliminado de este grupo*\n\n🗣️ *Frase:* _${data.original || triggerKey}_`);
};

handler.command = /^(elaudios|delaudios|borraraudio)$/i;
handler.group = true;

export default handler;
