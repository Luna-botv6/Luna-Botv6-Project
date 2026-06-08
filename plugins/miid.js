async function handler(m, { conn }) {
  const jid = m.sender;

  let name;
  try {
    name = await conn.getName(jid);
  } catch {
    name = jid.split('@')[0];
  }

  const isLid = jid.endsWith('@lid');
  const tipo = isLid ? '🆔 *JID LID (ligero)*' : '🆔 *JID estándar (SID)*';

  const text = `
╭━━━〔 *🔐 Identificador de Usuario* 〕━━⬣
┃ *👤 Nombre:* ${name}
┃ *📱 Número:* wa.me/${jid.split('@')[0]}
┃ ${tipo}
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
