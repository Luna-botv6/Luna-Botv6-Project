import fs from 'fs';

const handler = async (m, {isOwner, isAdmin, conn, text, participants, args, command, usedPrefix}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_promote;

  // Verificar si el comando usedPrefix es válido
  if (usedPrefix == 'a' || usedPrefix == 'A') return;
  
  // Verificar si el usuario es admin o owner
  if (!(isAdmin || isOwner)) {
    global.dfail('admin', m, conn);
    throw false;
  }

  // Si no hay texto y no hay mensaje citado, mostrar ayuda
  if (!text && !m.quoted && (!m.mentionedJid || m.mentionedJid.length === 0)) {
    return conn.reply(m.chat, `${tradutor.texto1[0]}\n\n*┯┷*\n*┠≽ ${usedPrefix}daradmin @tag*\n*┠≽ ${usedPrefix}darpoder ${tradutor.texto1[1]}\n*┷┯*`, m);
  }

  try {
    let user;
    
    // Prioridad 1: Si hay una mención directa
    if (m.mentionedJid && m.mentionedJid[0]) {
      user = m.mentionedJid[0];
    }
    // Prioridad 2: Si es respuesta a un mensaje
    else if (m.quoted && m.quoted.sender) {
      user = m.quoted.sender;
    }
    // Prioridad 3: Si es solo texto (número)
    else if (text) {
      // Limpiar el texto de caracteres especiales
      const cleanText = text.replace(/[^0-9]/g, '');
      
      if (cleanText.length < 11 || cleanText.length > 15) {
        return conn.reply(m.chat, tradutor.texto2, m);
      }
      
      user = cleanText + '@s.whatsapp.net';
    }

    if (!user) {
      return conn.reply(m.chat, `${tradutor.texto1[0]}\n\n*┯┷*\n*┠≽ ${usedPrefix}daradmin @tag*\n*┠≽ ${usedPrefix}darpoder ${tradutor.texto1[1]}\n*┷┯*`, m);
    }

    // Verificar si el usuario está en el grupo
    const isUserInGroup = participants.find((p) => p.id === user);
    if (!isUserInGroup) {
      return conn.reply(m.chat, '*[❗] La persona que mencionaste no está en el grupo.*', m);
    }

    // Promover al usuario
    await conn.groupParticipantsUpdate(m.chat, [user], 'promote');
    conn.reply(m.chat, `✅ @${user.split('@')[0]} ha sido promovido a administrador.`, m, { mentions: [user] });

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, '*[❗] No se pudo promover al usuario. Verifica que sea un miembro válido del grupo.*', m);
  }
};

handler.help = ['promote <@user>', 'daradmin <@user>', 'darpoder <@user>'];
handler.tags = ['group'];
handler.command = /^(promote|daradmin|darpoder)$/i;
handler.admin = true;
handler.group = true;

export default handler;