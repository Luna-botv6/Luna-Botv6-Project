import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { getCustomAudios, removeCustomAudio, getAudioFilePath } from '../lib/funcion/audiosStore.js';

function buildList(customAudios, t) {
  const entries = Object.entries(customAudios);
  if (entries.length === 0) return null;

  let msg = (t.lista_titulo || '🗑️ *Audios personalizados guardados*\n\n');
  entries.forEach(([trigger, data], i) => {
    msg += (t.lista_item?.replace('{pos}', i + 1).replace('{nombre}', data.original || trigger) || `> *${i + 1}.* ${data.original || trigger}\n`);
  });
  msg += (t.lista_footer || '\n_Para eliminar uno, usa:_\n_`.elaudios <frase o número>`_');

  return msg;
}

const handler = async (m, { conn, args }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.eliminar_audio || {};
  if (!m.isGroup) return m.reply(t.solo_grupos || '❌ Este comando solo funciona en grupos.');

  const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
  if (!groupData.isAdmin && !groupData.isRAdmin) return m.reply(t.solo_admins || '❌ Solo los administradores pueden eliminar audios.');

  const customAudios = getCustomAudios();
  const entries = Object.entries(customAudios);
  const input = args.join(' ').trim();

  if (!input) {
    const list = buildList(customAudios, t);
    return m.reply(list || (t.sin_audios || '📭 No hay audios personalizados guardados todavía.'));
  }

  let triggerKey = null;

  if (/^\d+$/.test(input)) {
    const idx = parseInt(input, 10) - 1;
    if (entries[idx]) triggerKey = entries[idx][0];
  } else {
    triggerKey = input.toLowerCase();
  }

  if (!triggerKey || !customAudios[triggerKey]) {
    const list = buildList(customAudios, t);
    const listText = list || (t.sin_audios || '📭 No hay audios personalizados guardados todavía.');
    return m.reply(t.no_encontrado?.replace('{lista}', listText) || `❌ No encontré ningún audio con esa frase o número.\n\n${listText}`);
  }

  const data = customAudios[triggerKey];

  try {
    fs.unlinkSync(getAudioFilePath(data.file));
  } catch {}

  await removeCustomAudio(triggerKey);

  await m.reply(t.exito?.replace('{frase}', data.original || triggerKey).replace('{archivo}', data.file) || `✅ *Audio eliminado*\n\n🗣️ *Frase:* _${data.original || triggerKey}_\n📁 *Archivo:* ${data.file}\n\n_Ya no se reproducirá en ningún grupo._`);
};

handler.command = /^(elaudios|delaudios|borraraudio)$/i;
handler.group = true;

export default handler;
