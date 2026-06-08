import fs from 'fs';

function handler(m, { conn, text, isOwner }) {

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let _t = {};
  try {
    const _lang = idioma || global.defaultLenguaje || 'es';
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${_lang}.json`, 'utf8'));
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch {}
  }
  const tradutor = _t.plugins.desbloquear;

  if (!isOwner) return m.reply(tradutor.soloOwner);

  const numero = text.replace(/\D/g, '') + '@s.whatsapp.net';

  if (!global.db.data.baneados || !global.db.data.baneados[numero])
    return m.reply(tradutor.noBaneado);

  delete global.db.data.baneados[numero];

  conn.updateBlockStatus(numero, 'unblock');
  m.reply(tradutor.usuarioDesbloqueado.replace('%numero%', numero));
}

handler.command = ['desbloquear'];
handler.rowner = true;
handler.help = ['desbloquear <número>'];
handler.tags = ['owner'];

export default handler;
