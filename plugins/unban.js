import fs from 'fs';
import { rolActor, puedeDesbanear } from '../lib/funcion/ban-author.js';

function handler(m, { conn, text, isROwner, isOwner, isSubOwner }) {

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let _t = {};
  try {
    const _lang = idioma || global.defaultLenguaje || 'es';
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${_lang}.json`, 'utf8'));
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch {}
  }
  const tradutor = _t.functions?.desbloquear || {};
  const tradSub = _t.subowner || {};

  if (!isOwner && !isSubOwner) return m.reply(tradutor.soloOwner || '🚫 Solo el owner puede usar esto.');

  const numero = text.replace(/\D/g, '') + '@s.whatsapp.net';

  if (!global.db.data.baneados || !global.db.data.baneados[numero])
    return m.reply(tradutor.noBaneado);

  const rol = rolActor({ isROwner, isOwner, isSubOwner });
  if (!puedeDesbanear(rol, global.db.data.baneados[numero].bannedRole || 'bot')) return m.reply(tradSub.desbloquearOwner);

  delete global.db.data.baneados[numero];

  conn.updateBlockStatus(numero, 'unblock');
  m.reply((tradutor.usuarioDesbloqueado || '✅ Usuario desbloqueado: %numero%').replace('%numero%', numero));
}

handler.command = ['desbloquear'];
handler.subowner = 'bloqueos';
handler.help = ['desbloquear <número>'];
handler.tags = ['owner'];

export default handler;
