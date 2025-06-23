import { WAMessageStubType } from "@whiskeysockets/baileys";
import PhoneNumber from 'awesome-phonenumber';
import chalk from 'chalk';
import { watchFile } from 'fs';
import urlRegexSafe from 'url-regex-safe';

const urlRegex = urlRegexSafe({ strict: false });
const MAX_MESSAGE_LENGTH = 400;

const nameCache = new Map();
const phoneCache = new Map();
const lidToJidCache = global.lidToJidCache || (global.lidToJidCache = new Map());
const lidToNameCache = global.lidToNameCache || (global.lidToNameCache = new Map());

function formatPhoneNumber(jid) {
  if (!jid || typeof jid !== 'string') return 'Número desconocido';
  
  if (phoneCache.has(jid)) return phoneCache.get(jid);
  
  try {
    let cleanJid;
    
    if (jid.includes('@lid')) {
      const lidNumber = jid.split('@')[0];
      
      if (lidToNameCache.has(jid)) {
        const knownName = lidToNameCache.get(jid);
        const formatted = `${knownName} (LID)`;
        phoneCache.set(jid, formatted);
        return formatted;
      }
      
      try {
        if (lidNumber.length > 15) {
          const formatted = `LID-${lidNumber.slice(-8)}`;
          phoneCache.set(jid, formatted);
          return formatted;
        } else {
          const formatted = PhoneNumber('+' + lidNumber).getNumber('international');
          phoneCache.set(jid, formatted);
          return formatted;
        }
      } catch (lidError) {
        const fallback = `LID-${lidNumber.slice(-8)}`;
        phoneCache.set(jid, fallback);
        return fallback;
      }
    } else {
      cleanJid = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
      const formatted = PhoneNumber('+' + cleanJid).getNumber('international');
      phoneCache.set(jid, formatted);
      return formatted;
    }
  } catch (error) {
    const fallback = jid.split('@')[0] || 'Número desconocido';
    phoneCache.set(jid, fallback);
    return fallback;
  }
}

async function getCachedName(conn, jid) {
  try {
    if (jid.includes('@g.us')) {
      const name = await conn.getName(jid);
      if (name && name.trim()) {
        nameCache.set(jid, name);
        return name;
      }
    } else {
      if (nameCache.has(jid)) return nameCache.get(jid);
    }
    
    const name = await conn.getName(jid);
    const finalName = name && name.trim() ? name : (
      jid.includes('@g.us') ? 'Grupo sin nombre' : 'Usuario sin nombre'
    );
    nameCache.set(jid, finalName);
    return finalName;
  } catch (error) {
    const fallbackName = jid.includes('@g.us') ? 'Grupo sin nombre' : 'Usuario sin nombre';
    nameCache.set(jid, fallbackName);
    return fallbackName;
  }
}

async function resolveLidToJid(conn, lidJid, chatJid, pushName, messageObj) {
  try {
    if (lidToJidCache.has(lidJid)) {
      return lidToJidCache.get(lidJid);
    }

    if (pushName && pushName.trim()) {
      lidToNameCache.set(lidJid, pushName.trim());
    }

    // Verificar si es el propio bot
    const botJid = conn.user?.jid;
    const botName = conn.user?.name;
    if (botJid && botName && pushName) {
      const cleanBotName = botName.toLowerCase().trim();
      const cleanPushName = pushName.toLowerCase().trim();
      
      if (cleanBotName.includes(cleanPushName) || cleanPushName.includes(cleanBotName)) {
        lidToJidCache.set(lidJid, botJid);
        return botJid;
      }
    }

    // Verificar si el mensaje es del bot
    if (messageObj?.key?.fromMe) {
      const botJid = conn.user?.jid;
      if (botJid) {
        lidToJidCache.set(lidJid, botJid);
        return botJid;
      }
    }

    // Buscar en participantes del grupo
    if (chatJid && chatJid.includes('@g.us')) {
      try {
        const groupMetadata = await conn.groupMetadata(chatJid);
        
        for (const participant of groupMetadata.participants) {
          const participantJid = participant.id;
          
          if (participantJid.includes('@s.whatsapp.net') || participantJid.includes('@c.us')) {
            try {
              const participantName = await conn.getName(participantJid);
              const participantNotify = participant.notify || '';
              
              if (pushName) {
                const cleanPushName = pushName.toLowerCase().trim();
                const cleanParticipantName = (participantName || '').toLowerCase().trim();
                const cleanNotify = (participantNotify || '').toLowerCase().trim();
                
                if ((cleanParticipantName && cleanParticipantName === cleanPushName) ||
                    (cleanNotify && cleanNotify === cleanPushName)) {
                  lidToJidCache.set(lidJid, participantJid);
                  return participantJid;
                }
              }
            } catch (nameError) {
              // Continuar con el siguiente participante
            }
          }
        }
      } catch (groupError) {
        // Continuar con otras estrategias
      }
    }

    // Buscar en contactos del bot
    try {
      if (conn.contacts && typeof conn.contacts === 'object') {
        for (const [contactJid, contactInfo] of Object.entries(conn.contacts)) {
          if (contactInfo && pushName) {
            const contactName = contactInfo.name || '';
            const contactNotify = contactInfo.notify || '';
            
            const cleanPushName = pushName.toLowerCase().trim();
            const cleanContactName = contactName.toLowerCase().trim();
            const cleanContactNotify = contactNotify.toLowerCase().trim();
            
            if ((cleanContactName && cleanContactName === cleanPushName) ||
                (cleanContactNotify && cleanContactNotify === cleanPushName)) {
              lidToJidCache.set(lidJid, contactJid);
              return contactJid;
            }
          }
        }
      }
    } catch (contactError) {
      // Continuar
    }

    // Verificar si el pushName contiene 'bot'
    if (pushName && pushName.toLowerCase().includes('bot')) {
      const botJid = conn.user?.jid;
      if (botJid) {
        lidToJidCache.set(lidJid, botJid);
        return botJid;
      }
    }

    // Mantener el LID original
    lidToJidCache.set(lidJid, lidJid);
    return lidJid;

  } catch (error) {
    return lidJid;
  }
}

function getFriendlyName(jid, pushName) {
  if (pushName && pushName.trim()) {
    return pushName.trim();
  }
  
  if (jid.includes('@lid') && lidToNameCache.has(jid)) {
    return lidToNameCache.get(jid);
  }
  
  if (jid.includes('@lid')) {
    const lidNumber = jid.split('@')[0];
    return `Usuario-${lidNumber.slice(-6)}`;
  }
  
  return 'Usuario desconocido';
}

// Limpiar caché periódicamente
setInterval(() => {
  if (nameCache.size > 1000) nameCache.clear();
  if (phoneCache.size > 1000) phoneCache.clear();
  if (lidToJidCache.size > 500) lidToJidCache.clear();
  if (lidToNameCache.size > 500) lidToNameCache.clear();
}, 300000);

async function printMessage(m, conn = { user: {} }) {
  const possibleSenders = [
    m.sender,
    m.key?.participant,
    m.key?.remoteJid,
    m.participant,
    m.from
  ];
  
  let senderJid = possibleSenders.find(s => s && !s.includes('@g.us')) || '';
  const chatJid = m.chat || m.key?.remoteJid || '';
  
  // Resolver LID a JID real si es necesario
  if (senderJid && senderJid.includes('@lid')) {
    const resolvedJid = await resolveLidToJid(conn, senderJid, chatJid, m.pushName, m);
    if (resolvedJid !== senderJid) {
      senderJid = resolvedJid;
    }
  }
  
  const [senderName, chatName] = await Promise.all([
    senderJid ? getCachedName(conn, senderJid) : Promise.resolve('Usuario desconocido'),
    chatJid ? getCachedName(conn, chatJid) : Promise.resolve('Chat desconocido')
  ]);

  let displaySenderName = senderName;
  if (senderName === 'Usuario sin nombre' || !senderName) {
    displaySenderName = getFriendlyName(senderJid, m.pushName);
  }

  const senderPhone = senderJid ? formatPhoneNumber(senderJid) : 'Número desconocido';
  const mePhone = formatPhoneNumber(conn.user?.jid || '');
  const sender = senderPhone + (displaySenderName && displaySenderName !== 'Usuario sin nombre' ? ' ~' + displaySenderName : '');
  const me = mePhone;

  // Actualizar caché para cambios de nombre de grupo
  if (m.messageStubType === 21 && m.messageStubParameters?.[0]) {
    nameCache.set(chatJid, m.messageStubParameters[0]);
  }

  // Mostrar cuando se recibe imagen o sticker
  if (/imageMessage/i.test(m.mtype)) {
    console.log(chalk.green(`📷 Imagen recibida de ${displaySenderName || sender}`));
  } else if (/stickerMessage/i.test(m.mtype)) {
    console.log(chalk.magenta(`🧩 Sticker recibido de ${displaySenderName || sender}`));
  }

  const filesize = m.msg?.fileLength?.low || m.msg?.fileLength || 
                   m.msg?.vcard?.length || m.text?.length || 0;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0B';
    const k = 1000;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  const timestamp = m.messageTimestamp?.low || m.messageTimestamp || Date.now() / 1000;
  const time = new Date(timestamp * 1000).toTimeString().split(' ')[0];

  let lidInfo = '';
  if (senderJid.includes('@lid')) {
    lidInfo = chalk.gray(` [LID: ${senderJid}]`);
  }

  const logParts = [
    chalk.bold.cyanBright('╭⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╮'),
    '',
    chalk.bold.magentaBright(`☆            ✧°˚ Luna-BotV6 ˚°✧         `),
    '',
    `┊ ${chalk.redBright('╰➤🤖 Luna-Bot:')} ${me} ~ ${conn.user.name}${conn.user.jid !== global.conn?.user?.jid ? chalk.gray(' (Sub Bot)') : ''}`,
    '',
    `┊ ${chalk.yellow('╰➤╰⏰ Hora:')} ${chalk.yellow(time)}`,
    '',
    `☆ ${chalk.green('╰➤📑 Tipo:')} ${chalk.green(m.messageStubType ? WAMessageStubType[m.messageStubType] : 'Texto')}`,
    '',
    `┊ ${chalk.magenta('╰➤📊 Tamaño:')} ${filesize} [${formatFileSize(filesize)}]`,
    '',
    `┊ ${chalk.green('╰➤📤 De:')} ${chalk.green(sender)}${lidInfo}`,
    '',
    `┊ ${chalk.yellow('╰➤📥 En:')} ${chalk.yellow(chatName)} (${chatJid})`,
    '',
    `${chalk.hex('#FFB347')('☆')} ${chalk.cyan('╰➤💬 Tipo Msg:')} ${chalk.cyan(m.mtype?.replace(/message$/i, '').replace('audio', m.msg?.ptt ? 'PTT' : 'Audio'))}`,
    chalk.bold.cyanBright('╰⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╯')
  ];

  console.log(logParts.join('\n'));

  if (typeof m.text === 'string' && m.text) {
    let log = m.text.replace(/\u200e+/g, '');

    const mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~`])(?!`)(.+?)\1|```((?:.|[\n\r])+?)```|`([^`]+?)`)(?=\S?(?:[\s\n])|$)/g;
    const mdFormat = (depth = 4) => (_, type, text, monospace) => {
      if (depth < 1) return text || monospace;
      const types = { '_': 'italic', '*': 'bold', '~': 'strikethrough', '`': 'bgGray' };
      text = text || monospace;
      return types[type] ? chalk[types[type]](text.replace(/`/g, '').replace(mdRegex, mdFormat(depth - 1))) : text;
    };

    log = log.replace(mdRegex, mdFormat(4));

    if (log.length > MAX_MESSAGE_LENGTH) {
      log = log.substring(0, MAX_MESSAGE_LENGTH) + '\n' + chalk.blue('...Texto truncado por longitud...');
    }

    log = log.split('\n').map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) return chalk.bgGray.dim(line.replace(/^>/, '┃'));
      if (/^([1-9]|[1-9][0-9])\./.test(trimmed)) return line.replace(/^(\d+)\./, (_, num) => '  ' + num + '.');
      if (/^[-*]\s/.test(trimmed)) return line.replace(/^[-*]/, '  •');
      return line;
    }).join('\n');

    log = log.replace(urlRegex, url => chalk.blueBright(url));

    if (m.mentionedJid?.length) {
      const mentionPromises = m.mentionedJid.map(async (user) => {
        const name = await getCachedName(conn, user);
        return { jid: user, name };
      });

      const mentions = await Promise.all(mentionPromises);
      mentions.forEach(({ jid, name }) => {
        log = log.replace('@' + jid.split('@')[0], chalk.blueBright('@' + name));
      });
    }

    console.log(m.error != null ? chalk.red(log) : m.isCommand ? chalk.yellow(log) : log);
  }

  if (m.messageStubParameters?.length) {
    const namePromises = m.messageStubParameters.map(async (jid) => {
      const id = conn.decodeJid(jid);
      const name = await getCachedName(conn, id);
      const phone = formatPhoneNumber(id);
      return chalk.gray(phone + (name && name !== 'Usuario sin nombre' ? ' ~' + name : ''));
    });

    const names = await Promise.all(namePromises);
    console.log(names.join(', '));
  }

  if (/document/i.test(m.mtype)) {
    console.log(`🗂️ Documento: ${m.msg?.fileName || m.msg?.displayName || 'Archivo'}`);
  } else if (/ContactsArray/i.test(m.mtype)) {
    console.log('👥 Contactos múltiples');
  } else if (/contact/i.test(m.mtype)) {
    console.log(`👤 Contacto: ${m.msg?.displayName || ''}`);
  } else if (/audio/i.test(m.mtype)) {
    const duration = m.msg?.seconds || 0;
    const minutes = String(Math.floor(duration / 60)).padStart(2, '0');
    const seconds = String(duration % 60).padStart(2, '0');
    console.log(`${m.msg?.ptt ? '🎤 PTT' : '🎵 Audio'}: ${minutes}:${seconds}`);
  }
}

export default printMessage;
export { printMessage };

const file = global.__filename(import.meta.url);
watchFile(file, () => {
  console.log(chalk.redBright("Se actualizó 'lib/print.js'"));
});