const handler = async (m, { conn, command, usedPrefix }) => {
  if (command === 'botones') {
    return await conn.sendButton(
      m.chat,
      'Hola 👋 ¿Qué deseas hacer?',
      'LunaBot V6',
      null,
      [
        ['📋 Menú', `${usedPrefix}menu`],
        ['📊 Estado', `${usedPrefix}estado`]
      ],
      null,
      null,
      m
    );
  }
};

handler.command = /^botones$/i;
handler.help = ['botones'];
handler.tags = ['test'];
export default handler;








