import { WAMessageStubType } from "@whiskeysockets/baileys";
import PhoneNumber from 'awesome-phonenumber';
import chalk from 'chalk';
import { watchFile } from 'fs';
import urlRegexSafe from 'url-regex-safe';

const urlRegex = urlRegexSafe({ strict: false });
const MAX_MESSAGE_LENGTH = 400;

const nameCache = new Map();
const phoneCache = new Map();
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
    if (nameCache.has(jid)) return nameCache.get(jid);
    
    const name = await conn.getName(jid).catch(() => null);
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

setInterval(() => {
  if (nameCache.size > 500) {
    const keys = Array.from(nameCache.keys()).slice(0, 250);
    keys.forEach(k => nameCache.delete(k));
  }
  if (phoneCache.size > 500) {
    const keys = Array.from(phoneCache.keys()).slice(0, 250);
    keys.forEach(k => phoneCache.delete(k));
  }
  if (lidToNameCache.size > 200) {
    const keys = Array.from(lidToNameCache.keys()).slice(0, 100);
    keys.forEach(k => lidToNameCache.delete(k));
  }
}, 600000);

async function printMessage(m, conn = { user: {} }) {
  let senderJid = m.sender || m.key?.participant || m.participant || m.from || '';
  const chatJid = m.chat || m.key?.remoteJid || '';
  
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

  if (m.messageStubType === 21 && m.messageStubParameters?.[0]) {
    nameCache.set(chatJid, m.messageStubParameters[0]);
  }

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

  const stubType = m.messageStubType ? WAMessageStubType[m.messageStubType] : 'Texto';
  const msgType = m.mtype?.replace(/message$/i, '').replace('audio', m.msg?.ptt ? 'PTT' : 'Audio');

  console.log(chalk.bold.cyanBright('╭⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╮'));
  console.log('');
  console.log(chalk.bold.cyanBright('⎨') + chalk.bold.magentaBright('            ✧°ˆ Luna-BotV6 ˆ°✧         '));
  console.log('');
  console.log(chalk.cyanBright('⎨') + ` ${chalk.redBright('↑🤖 Luna-Bot:')} ${mePhone} ~ ${conn.user.name}${conn.user.jid !== global.conn?.user?.jid ? chalk.gray(' (Sub Bot)') : ''}`);
  console.log('');
  console.log(chalk.cyanBright('⎨') + ` ${chalk.yellow('↑° Hora:')} ${chalk.yellow(time)}`);
  console.log('');
  console.log(chalk.cyanBright('⎨') + ` ${chalk.green('↑📋 Tipo:')} ${chalk.green(stubType)}`);
  console.log('');
  console.log(chalk.cyanBright('⎨') + ` ${chalk.magenta('↑📊 Tamaño:')} ${filesize} [${formatFileSize(filesize)}]`);
  console.log('');
  console.log(chalk.cyanBright('⎨') + ` ${chalk.green('↑📤 De:')} ${chalk.green(sender)}${lidInfo}`);
  console.log('');
  console.log(chalk.cyanBright('⎨') + ` ${chalk.yellow('↑📥 En:')} ${chalk.yellow(chatName)} (${chatJid})`);
  console.log('');
  console.log(chalk.cyanBright('⎨') + ` ${chalk.cyan('↑💬 Tipo Msg:')} ${chalk.cyan(msgType)}`);
  console.log(chalk.bold.cyanBright('╰⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╯'));

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

      Promise.all(mentionPromises).then(mentions => {
        mentions.forEach(({ jid, name }) => {
          log = log.replace('@' + jid.split('@')[0], chalk.blueBright('@' + name));
        });
      }).catch(() => {});
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

    Promise.all(namePromises).then(names => {
      console.log(names.join(', '));
    }).catch(() => {});
  }

  if (/document/i.test(m.mtype)) {
    console.log(`📂️ Documento: ${m.msg?.fileName || m.msg?.displayName || 'Archivo'}`);
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
  console.log(chalk.redBright("Se actualizó 'print.js'"));
});
