let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  let chat = global.db.data.chats[m.chat];
  let bot = global.db.data.settings[conn.user.jid] || {};
  const isEnable = /enable|on|true|1/i.test(command);

  if (!args[0]) {
    const sections = [
      ['🌟 *Welcome*', '👋 *Mensaje de bienvenida y despedida.*'],
      ['🚫 *Antilink*', '🔗 *Elimina enlaces no permitidos automáticamente.*'],
      ['🔍 *Detect*', '👁️ *Detecta cambios en el grupo (cambios de nombre, foto, etc).*'],
      ['🤖 *Simsimi*', '💬 *Respuestas automáticas inteligentes.*'],
      ['✨ *Autosticker*', '🖼️ *Convierte imágenes en stickers automáticamente.*'],
      ['🔥 *Modo Horny*', '🔞 *Activa comandos para contenido +18.*'],
      ['🛡️ *Antitóxico*', '🚫 *Evita lenguaje ofensivo y tóxico.*'],
      ['❌ *Antifake*', '📵 *Expulsa números falsos o sospechosos.*'],
      ['🎵 *Audios*', '🔊 *Activa los comandos de audio personalizados.*'],
      ['🔒 *Restrict* (Owner)', '⚙️ *Funciones avanzadas globales, solo owner puede activar.*']
    ];

    let text = '*⚙️ Configuración de funciones LunaBot ⚙️*\n\n';
    let buttons = [];

    for (let [title, desc] of sections) {
      text +=
        `╔═══════════════════╗\n` +
        `║ ${title}\n` +
        `║ ${desc}\n` +
        `╚═══════════════════╝\n\n`;
    }

    for (let [title] of sections) {
      let type = title.replace(/[^a-zA-Z]/g, '').toLowerCase();
      buttons.push(
        [`✅ Activar ${type}`, `${usedPrefix}enable ${type}`],
        [`❌ Desactivar ${type}`, `${usedPrefix}disable ${type}`]
      );
    }

    await conn.sendButton(
      m.chat,
      text,
      'LunaBotV6',
      null,
      buttons,
      null,
      null,
      m
    );
    return;
  }

  let type = args[0].toLowerCase();
  const groupFeatures = [
    'welcome', 'antilink', 'detect', 'simsimi',
    'autosticker', 'modohorny', 'antitoxic',
    'antifake', 'audios'
  ];
  const botFeatures = ['restrict'];

  if (groupFeatures.includes(type)) {
    chat[type] = isEnable;
    import('../lib/funcConfig.js').then(({ setConfig }) => {
      setConfig(m.chat, type, isEnable);
    });
    await conn.sendMessage(m.chat, { text: `✅ Función *${type}* ${isEnable ? 'activada' : 'desactivada'} correctamente en este chat.` });
  } else if (botFeatures.includes(type)) {
    if (!isOwner) throw 'Este comando solo lo puede usar el owner del bot.';
    bot[type] = isEnable;
    await conn.sendMessage(m.chat, { text: `✅ Función *${type}* ${isEnable ? 'activada' : 'desactivada'} globalmente.` });
  } else {
    await conn.sendMessage(m.chat, { text: '❌ Función no válida o no disponible.' });
  }
};

handler.help = ['enable', 'disable'].map(cmd => `${cmd} [función]`);
handler.tags = ['group', 'owner'];
handler.command = /^(?:\.?|\/)?((en|dis)able|(turn)?(on|off)|true|false|0|1)$/i;

export default handler;
