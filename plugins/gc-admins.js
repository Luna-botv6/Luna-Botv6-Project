import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const FALLBACK = {
  texto1: [
    '「 LLAMADO DE ADMINISTRADORES 」',
    '*ADMINISTRADORES:*',
    '[ ⚠️] El usuario maneja su cuenta por sí mismo salvo que sea necesario!!',
    '*MENSAJE:*'
  ]
};

const _langCache = new Map();

function getTraductor(idioma) {
  const Candidates = [idioma, global.defaultLenguaje, 'es'];
  for (const lang of new Set(Candidates.filter(Boolean))) {
    if (_langCache.has(lang)) {
      const cached = _langCache.get(lang);
      if (cached) return cached;
      continue;
    }
    try {
      const data = JSON.parse(fs.readFileSync(`./src/languages/${lang}.json`));
      const t = data?.plugins?.gc_admins || null;
      _langCache.set(lang, t);
      if (t) return t;
    } catch {
      _langCache.set(lang, null);
    }
  }
  return FALLBACK;
}

const handler = async (m, { conn, args }) => {
  if (!m.isGroup) return;

  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const tradutor = getTraductor(idioma);
  const textos = Array.isArray(tradutor.texto1) ? tradutor.texto1 : FALLBACK.texto1;

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
  const oi = `${textos[3]} ${pesan}`.trim();

  const text = `${textos[0]}

${oi}

${textos[1]}
${listAdmin}

${textos[2]}`.trim();

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