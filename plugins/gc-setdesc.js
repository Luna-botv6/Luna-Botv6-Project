import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const handler = async (m, { conn, args }) => {

  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const tradutor = _translate.plugins.gc_setdesc;

  const { isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin) return m.reply(tradutor.admin);
  if (!isBotAdmin) return m.reply(tradutor.botadmin);

  if (!args[0]) return m.reply(tradutor.texto2);

  const text = args.join(' ');

  await conn.groupUpdateDescription(m.chat, text);

  m.reply(tradutor.texto1);

};

handler.help = ['setdesc <text>'];
handler.tags = ['group'];
handler.command = /^(setdesc|setdesk)$/i;
handler.group = true;

export default handler;
