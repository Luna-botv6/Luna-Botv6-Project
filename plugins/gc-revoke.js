import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const handler = async (m, { conn, isOwner }) => {
  if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos');

  const { isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin && !isOwner) {
    return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.');
  }

  if (!isBotAdmin) {
    return m.reply('❌ El bot necesita ser administrador para revocar el enlace del grupo.');
  }

  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_revoke;

  try {
    const revoke = await conn.groupRevokeInvite(m.chat);
    await conn.reply(m.chat, `${tradutor.texto1} ${'https://chat.whatsapp.com/' + revoke}`, m);
  } catch (e) {
    console.error(e);
    await m.reply('*[◉] No se pudo revocar el enlace. Verifica que el bot sea administrador.*');
  }
};

handler.help = ['resetlink', 'revoke'];
handler.tags = ['group'];
handler.command = ['resetlink', 'revoke'];
handler.group = true;

export default handler;
