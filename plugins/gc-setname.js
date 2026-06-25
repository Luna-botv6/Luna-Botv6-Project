import fs from 'fs';
import { getGroupDataForPlugin, clearGroupCache } from '../lib/funcion/pluginHelper.js';

const handler = async (m, { conn, args }) => {

  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_setname || {};

  const { isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  const adminError = tradutor.admin || '*[❗] Necesitas ser administrador para usar este comando.*';
  const botAdminError = tradutor.botadmin || '*[❗] El bot necesita ser administrador del grupo para cambiar el nombre.*';
  const missingTextError = tradutor.texto1 || '*[❗] Escribe el nuevo nombre del grupo.*';
  const lengthError = tradutor.texto2 || '*[❗] El nombre no puede tener más de 25 caracteres.*';
  const successMessage = tradutor.success || '*✅ Nombre de grupo actualizado correctamente.*';

  if (!isAdmin) throw adminError;
  if (!isBotAdmin) throw botAdminError;

  if (!args[0]) throw missingTextError;

  const text = args.join(' ');
  if (text.length > 25) throw lengthError;

  await conn.groupUpdateSubject(m.chat, text);
  await new Promise(resolve => setTimeout(resolve, 1500));
  clearGroupCache(m.chat, conn);
  m.reply(successMessage);

};

handler.help = ['setname <text>'];
handler.tags = ['group'];
handler.command = /^(setname)$/i;
handler.group = true;

export default handler;
