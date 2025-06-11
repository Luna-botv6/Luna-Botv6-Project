import { WAMessageStubType } from "@whiskeysockets/baileys";
import PhoneNumber from 'awesome-phonenumber';
import chalk from 'chalk';
import { watchFile } from 'fs';

const terminalImage = global.opts['img'] ? require('terminal-image') : '';
const urlRegex = (await import('url-regex-safe')).default({ strict: false });

const MAX_MESSAGE_LENGTH = 400;

// Cache para nombres y números de teléfono
const nameCache = new Map();
const phoneCache = new Map();

// Función auxiliar para formatear números de teléfono con cache
function formatPhoneNumber(jid) {
  if (phoneCache.has(jid)) {
    return phoneCache.get(jid);
  }
  
  const formatted = PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
  phoneCache.set(jid, formatted);
  return formatted;
}

// Función auxiliar para obtener nombres con cache
async function getCachedName(conn, jid) {
  if (nameCache.has(jid)) {
    return nameCache.get(jid);
  }
  
  const name = await conn.getName(jid);
  nameCache.set(jid, name);
  return name;
}

// Limpiar cache periódicamente (cada 5 minutos)
setInterval(() => {
  if (nameCache.size > 1000) nameCache.clear();
  if (phoneCache.size > 1000) phoneCache.clear();
}, 300000);

export default async function (m, conn = { user: {} }) {
  // Procesar datos básicos en paralelo
  const [senderName, chatName] = await Promise.all([
    getCachedName(conn, m.sender),
    getCachedName(conn, m.chat)
  ]);

  const senderPhone = formatPhoneNumber(m.sender);
  const mePhone = formatPhoneNumber(conn.user?.jid || '');
  
  const sender = senderPhone + (senderName ? ' ~' + senderName : '');
  const me = mePhone;

  // Procesar imagen solo si es necesario
  let img;
  if (global.opts['img'] && /sticker|image/gi.test(m.mtype)) {
    try {
      img = await terminalImage.buffer(await m.download());
    } catch (e) {
      console.error('Error procesando imagen:', e.message);
    }
  }

  // Calcular tamaño del archivo de forma más eficiente
  const filesize = m.msg?.fileLength?.low || m.msg?.fileLength || 
                   m.msg?.vcard?.length || m.text?.length || 0;

  // Formatear tamaño del archivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0B';
    const k = 1000;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  // Formatear tiempo
  const timestamp = m.messageTimestamp?.low || m.messageTimestamp || Date.now() / 1000;
  const time = new Date(timestamp * 1000).toTimeString().split(' ')[0];

  // Construir el log completo de una vez (más eficiente que múltiples console.log)
  const logParts = [
    chalk.bold.cyanBright('╭⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╮'),
    '',
    chalk.bold.magentaBright(`☆            ✧°˚ Luna-BotV6 ˚°✧         `),
    '',
    `┊ ${chalk.redBright('╰➤🤖 Luna-Bot:')} ${me} ~ ${conn.user.name}${conn.user.jid !== global.conn.user.jid ? chalk.gray(' (Sub Bot)') : ''}`,
    '',
    `┊ ${chalk.yellow('╰➤╰⏰ Hora:')} ${chalk.yellow(time)}`,
    '',
    `☆ ${chalk.green('╰➤📑 Tipo:')} ${chalk.green(m.messageStubType ? WAMessageStubType[m.messageStubType] : 'Texto')}`,
    '',
    `┊ ${chalk.magenta('╰➤📊 Tamaño:')} ${filesize} [${formatFileSize(filesize)}]`,
    '',
    `┊ ${chalk.green('╰➤📤 De:')} ${chalk.green(sender)}`,
    '',
    `┊ ${chalk.yellow('╰➤📥 En:')} ${chalk.yellow(chatName)} (${m.chat})`,
    '',
    `${chalk.hex('#FFB347')('☆')} ${chalk.cyan('╰➤💬 Tipo Msg:')} ${chalk.cyan(m.mtype?.replace(/message$/i, '').replace('audio', m.msg?.ptt ? 'PTT' : 'Audio'))}`,
    chalk.bold.cyanBright('╰⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╯')
  ];

  // Imprimir todo de una vez
  console.log(logParts.join('\n'));

  if (img) console.log(img.trimEnd());

  // Procesar texto del mensaje de forma más eficiente
  if (typeof m.text === 'string' && m.text) {
    let log = m.text.replace(/\u200e+/g, '');

    // Aplicar formato markdown (optimizado)
    const mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~`])(?!`)(.+?)\1|```((?:.|[\n\r])+?)```|`([^`]+?)`)(?=\S?(?:[\s\n])|$)/g;
    const mdFormat = (depth = 4) => (_, type, text, monospace) => {
      if (depth < 1) return text || monospace;
      const types = { '_': 'italic', '*': 'bold', '~': 'strikethrough', '`': 'bgGray' };
      text = text || monospace;
      return types[type] ? chalk[types[type]](text.replace(/`/g, '').replace(mdRegex, mdFormat(depth - 1))) : text;
    };

    log = log.replace(mdRegex, mdFormat(4));

    // Truncar si es muy largo
    if (log.length > MAX_MESSAGE_LENGTH) {
      log = log.substring(0, MAX_MESSAGE_LENGTH) + '\n' + chalk.blue('...Texto truncado por longitud...');
    }

    // Procesar líneas especiales
    log = log.split('\n').map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) return chalk.bgGray.dim(line.replace(/^>/, '┃'));
      if (/^([1-9]|[1-9][0-9])\./.test(trimmed)) return line.replace(/^(\d+)\./, (_, num) => '  ' + num + '.');
      if (/^[-*]\s/.test(trimmed)) return line.replace(/^[-*]/, '  •');
      return line;
    }).join('\n');

    // Resaltar URLs
    log = log.replace(urlRegex, url => chalk.blueBright(url));

    // Procesar menciones de forma más eficiente
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

  // Procesar parámetros del stub si existen
  if (m.messageStubParameters?.length) {
    const namePromises = m.messageStubParameters.map(async (jid) => {
      const id = conn.decodeJid(jid);
      const name = await getCachedName(conn, id);
      const phone = formatPhoneNumber(id);
      return chalk.gray(phone + (name ? ' ~' + name : ''));
    });
    
    const names = await Promise.all(namePromises);
    console.log(names.join(', '));
  }

  // Información adicional según el tipo de mensaje
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

const file = global.__filename(import.meta.url);
watchFile(file, () => {
  console.log(chalk.redBright("Se actualizó 'lib/print.js'"));
});
