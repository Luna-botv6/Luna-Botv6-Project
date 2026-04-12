import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const handler = async (m, { conn, args }) => {
  if (!m.isGroup) return;

  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_admins;

  const { groupMetadata, participants } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  const pp = await conn.profilePictureUrl(m.chat, 'image')
    .catch(() => './src/assets/images/menu/main/administracion.png');

  const groupAdmins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

  const adminsResolved = groupAdmins.map(p => p.id);

  const listAdmin = adminsResolved
    .map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`)
    .join('\n');

  const owner =
    groupMetadata?.owner ||
    groupAdmins.find(p => p.admin === 'superadmin')?.id ||
    m.chat.split('-')[0] + '@s.whatsapp.net';

  const pesan = args.join(' ');
  const oi = `${tradutor.texto1[3]} ${pesan}`.trim();

  const text = `${tradutor.texto1[0]}

${oi}

${tradutor.texto1[1]}
${listAdmin}

${tradutor.texto1[2]}`.trim();

  await conn.sendFile(
    m.chat,
    pp,
    'admins.jpg',
    text,
    m,
    false,
    { mentions: [...adminsResolved, owner] }
  );
};

handler.help = ['admins <texto>'];
handler.tags = ['group'];
handler.customPrefix = /a|@/i;
handler.command = /^(admins|@admins|dmins)$/i;
handler.group = true;

export default handler;