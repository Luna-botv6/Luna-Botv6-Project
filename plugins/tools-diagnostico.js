const handler = async (m, { conn, isAdmin, isBotAdmin, isOwner }) => {
  const chat = global.db.data.chats[m.chat] || {};
  const user = global.db.data.users[m.sender] || {};
  const settings = global.db.data.settings[conn.user.jid] || {};
  const isBannedChat = chat.isBanned;
  const isBannedUser = user.banned;

  const modoGrupos = conn.modogrupos;
  const modoAdmin = chat.modoadmin;
  const modoPublico = conn.public;
  const antiPrivado = settings.antiPrivate;
  const antispam = settings.antispam;
  const registrado = user.registered;

  const listaDiagnostico = [
    `📊 *DIAGNÓSTICO DEL BOT EN ESTE CHAT*`,
    `• ID del chat: ${m.chat}`,
    `• Tú eres admin: ${isAdmin ? '✅' : '❌'}`,
    `• Bot es admin: ${isBotAdmin ? '✅' : '❌'}`,
    `• Bot en modo público: ${modoPublico ? '✅' : '❌'}`,
    `• Bot en modo grupos: ${modoGrupos ? '✅' : '❌'}`,
    `• Modo admin (comandos solo para admins): ${modoAdmin ? '✅' : '❌'}`,
    `• Antispam activado: ${antispam ? '✅' : '❌'}`,
    `• Anti privado activado: ${antiPrivado ? '✅' : '❌'}`,
    `• Usuario registrado: ${registrado ? '✅' : '❌'}`,
    `• Usuario baneado: ${isBannedUser ? '🚫 SÍ' : '✅ NO'}`,
    `• Grupo baneado: ${isBannedChat ? '🚫 SÍ' : '✅ NO'}`,
    ``,
    `🛠️ *SUGERENCIAS:*`,
    ...(isBannedChat ? ['🔧 Usa /unbanchat para desbanear este grupo.'] : []),
    ...(isBannedUser ? ['🔧 Usa /unban para desbanearte o pide ayuda al dueño.'] : []),
    ...(modoAdmin && !isAdmin && !isOwner ? ['🔧 Modo admin activo: solo los admins pueden usar comandos.'] : []),
    ...(modoGrupos && !m.isGroup ? ['🔧 Modo grupos activado: el bot no responderá en privado.'] : []),
  ];

  m.reply(listaDiagnostico.join('\n'));
};

handler.help = ['diagnostico'];
handler.tags = ['tools'];
handler.command = /^diagnostico$/i;

export default handler;
