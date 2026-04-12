import fs from 'fs';
import { setConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';

const handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  if (usedPrefix === 'a' || usedPrefix === 'A') return;
  if (!m.isGroup) return;

  const { isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin && !isOwner) {
    return m.reply('*[❌] Solo los administradores pueden usar este comando.*');
  }

  if (!isBotAdmin) {
    return m.reply('*[❌] El bot necesita ser administrador para cambiar el estado del grupo.*');
  }

  const datas = global;
  const idioma = datas.db?.data?.users[m.sender]?.language || global.defaultLenguaje || 'es';

  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.gc_config || { texto1: ['Modo de grupo cambiado'] };
  } catch {
    tradutor = { texto1: ['Modo de grupo cambiado'] };
  }

  const option = (args[0] || '').toLowerCase();

  const states = {
    open: 'not_announcement',
    close: 'announcement',
    abierto: 'not_announcement',
    cerrado: 'announcement',
    abrir: 'not_announcement',
    cerrar: 'announcement'
  };

  const state = states[option];

  if (!state) {
    return m.reply(`
*[◉] FORMATO ERRÓNEO*
${tradutor.texto1[0]}

*Ejemplos:*
> ${usedPrefix + command} abrir
> ${usedPrefix + command} cerrar
`.trim());
  }

  try {
    await conn.groupSettingUpdate(m.chat, state);
    setConfig(m.chat, { groupMode: state === 'announcement' ? 'cerrado' : 'abierto' });

    clearGroupCache(m.chat);

    await m.reply(
      `✅ Estado del grupo cambiado a: *${state === 'announcement' ? '🔒 CERRADO' : '🔓 ABIERTO'}*`
    );
  } catch (e) {
    await m.reply(
      `❌ No pude cambiar el estado del grupo.\n\nEl bot necesita ser *administrador*.`
    );
  }
};

handler.help = ['grupo abrir', 'grupo cerrar'];
handler.tags = ['group'];
handler.command = /^(grupo|group)$/i;
handler.group = true;

export default handler;