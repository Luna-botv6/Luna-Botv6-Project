import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { getCustomAudios, removeCustomAudio, getAudioFilePath } from '../lib/funcion/audiosStore.js';

function buildList(customAudios) {
  const entries = Object.entries(customAudios);
  if (entries.length === 0) return null;

  let msg = `🗑️ *Audios personalizados guardados*\n\n`;
  entries.forEach(([trigger, data], i) => {
    msg += `> *${i + 1}.* ${data.original || trigger}\n`;
  });
  msg += `\n_Para eliminar uno, usa:_\n_\`.elaudios <frase o número>\`_`;

  return msg;
}

const handler = async (m, { conn, args }) => {
  if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.');

  const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
  if (!groupData.isAdmin && !groupData.isRAdmin) return m.reply('❌ Solo los administradores pueden eliminar audios.');

  const customAudios = getCustomAudios();
  const entries = Object.entries(customAudios);
  const input = args.join(' ').trim();

  if (!input) {
    const list = buildList(customAudios);
    return m.reply(list || '📭 No hay audios personalizados guardados todavía.');
  }

  let triggerKey = null;

  if (/^\d+$/.test(input)) {
    const idx = parseInt(input, 10) - 1;
    if (entries[idx]) triggerKey = entries[idx][0];
  } else {
    triggerKey = input.toLowerCase();
  }

  if (!triggerKey || !customAudios[triggerKey]) {
    const list = buildList(customAudios);
    return m.reply(`❌ No encontré ningún audio con esa frase o número.\n\n${list || '📭 No hay audios personalizados guardados todavía.'}`);
  }

  const data = customAudios[triggerKey];

  try {
    fs.unlinkSync(getAudioFilePath(data.file));
  } catch {}

  await removeCustomAudio(triggerKey);

  await m.reply(`✅ *Audio eliminado*\n\n🗣️ *Frase:* _${data.original || triggerKey}_\n📁 *Archivo:* ${data.file}\n\n_Ya no se reproducirá en ningún grupo._`);
};

handler.command = /^(elaudios|delaudios|borraraudio)$/i;
handler.group = true;

export default handler;
