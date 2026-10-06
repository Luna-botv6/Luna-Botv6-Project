import { resolveOwnerPhone } from '../lib/funcion/system-owners.js';

async function handler(m, { conn }) {
  const jid = m.sender;
  const phone = resolveOwnerPhone(jid, conn) || String(jid || '').split('@')[0].replace(/\D/g, '');

  let name;
  try {
    name = await conn.getName(jid);
  } catch {
    name = phone;
  }

  const text = `
╭━━━〔 *🔐 Identificador de Usuario* 〕━━⬣
┃ *👤 Nombre:* ${name}
┃ *📱 Número:* wa.me/${phone}
┃
┃ *🪪 JID completo:*
┃ ${jid}
╰━━━━━━━━━━━━━━━━━━━━⬣
`.trim();

  await m.reply(text, null, { mentions: [jid] });
}

handler.help = ['miid', 'jid', 'whoami'];
handler.tags = ['info', 'owner'];
handler.command = /^(miid|jid|whoami)$/i;
export default handler;
