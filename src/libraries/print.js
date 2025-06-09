import { WAMessageStubType } from "@whiskeysockets/baileys";
import PhoneNumber from 'awesome-phonenumber';
import chalk from 'chalk';
import { watchFile } from 'fs';

const terminalImage = global.opts['img'] ? require('terminal-image') : '';
const urlRegex = (await import('url-regex-safe')).default({ strict: false });

const MAX_MESSAGE_LENGTH = 400;

// Configuración de colores y símbolos
const COLORS = {
  header: chalk.bold.cyanBright,
  title: chalk.bold.magentaBright,
  bot: chalk.redBright,
  time: chalk.yellow,
  type: chalk.green,
  size: chalk.magenta,
  sender: chalk.green,
  chat: chalk.yellow,
  msgType: chalk.cyan,
  accent: chalk.hex('#FFB347'),
  error: chalk.red,
  command: chalk.yellow,
  url: chalk.blueBright,
  mention: chalk.blueBright,
  quote: chalk.bgGray.dim,
  truncated: chalk.blue
};

const SYMBOLS = {
  bot: '🤖',
  time: '⏰',
  type: '📑',
  size: '📊',
  sender: '📤',
  chat: '📥',
  msgType: '💬',
  moon: '🌙',
  star: '☆',
  document: '🗂️',
  contacts: '👥',
  contact: '👤',
  audio: '🎵',
  ptt: '🎤'
};

// Función para formatear el tamaño de archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

// Función para formatear duración de audio
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Función para obtener el tipo de mensaje más legible
function getMessageTypeDisplay(mtype, msg) {
  if (!mtype) return 'Texto';
  
  const type = mtype.replace(/message$/i, '');
  
  switch (type.toLowerCase()) {
    case 'audio':
      return msg?.ptt ? 'PTT (Nota de Voz)' : 'Audio';
    case 'image':
      return 'Imagen';
    case 'video':
      return 'Video';
    case 'document':
      return 'Documento';
    case 'sticker':
      return 'Sticker';
    case 'contact':
      return 'Contacto';
    case 'location':
      return 'Ubicación';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

// Función principal mejorada
export default async function (m, conn = { user: {} }) {
  try {
    // Obtener información básica
    const _name = await conn.getName(m.sender);
    const sender = PhoneNumber('+' + m.sender.replace('@s.whatsapp.net', '')).getNumber('international') + (_name ? ' ~' + _name : '');
    const chat = await conn.getName(m.chat);
    const me = PhoneNumber('+' + (conn.user?.jid || '').replace('@s.whatsapp.net', '')).getNumber('international');
    
    // Manejar imagen de terminal
    let img;
    if (global.opts['img'] && /sticker|image/gi.test(m.mtype)) {
      try {
        img = await terminalImage.buffer(await m.download());
      } catch (e) {
        console.error(COLORS.error('Error al cargar imagen:'), e.message);
      }
    }

    // Calcular tamaño de archivo de forma más robusta
    const filesize = (() => {
      const msg = m.msg;
      if (!msg) return m.text?.length || 0;
      
      return msg.vcard?.length || 
             msg.fileLength?.low || 
             msg.fileLength || 
             msg.axolotlSenderKeyDistributionMessage?.length || 
             m.text?.length || 0;
    })();

    // Obtener timestamp formateado
    const timestamp = new Date(1000 * (m.messageTimestamp?.low || m.messageTimestamp || Date.now() / 1000));
    const timeString = timestamp.toTimeString().split(' ')[0];
    const dateString = timestamp.toLocaleDateString('es-ES');

    // Header del log
    console.log(COLORS.header('╭⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╮'));
    console.log('');
    console.log(COLORS.title(`${SYMBOLS.star}            ✧°˚ Luna-BotV6 ˚°✧         `));
    console.log('');
    
    // Información del bot
    const subBotIndicator = conn.user.jid !== global.conn.user.jid ? chalk.gray(' (Sub Bot)') : '';
    console.log(`┊ ${COLORS.bot(`╰➤${SYMBOLS.bot} Luna-Bot:`)} ${me} ~ ${conn.user.name}${subBotIndicator}`);
    console.log('');
    
    // Fecha y hora
    console.log(`┊ ${COLORS.time(`╰➤${SYMBOLS.time} Fecha:`)} ${COLORS.time(dateString)} - ${COLORS.time(timeString)}`);
    console.log('');
    
    // Tipo de mensaje
    const messageType = m.messageStubType ? WAMessageStubType[m.messageStubType] : getMessageTypeDisplay(m.mtype, m.msg);
    console.log(`${SYMBOLS.star} ${COLORS.type(`╰➤${SYMBOLS.type} Tipo:`)} ${COLORS.type(messageType)}`);
    console.log('');
    
    // Tamaño del archivo
    console.log(`┊ ${COLORS.size(`╰➤${SYMBOLS.size} Tamaño:`)} ${formatFileSize(filesize)}`);
    console.log('');
    
    // Remitente
    console.log(`┊ ${COLORS.sender(`╰➤${SYMBOLS.sender} De:`)} ${COLORS.sender(sender)}`);
    console.log('');
    
    // Chat
    console.log(`┊ ${COLORS.chat(`╰➤${SYMBOLS.chat} En:`)} ${COLORS.chat(chat)} (${m.chat})`);
    console.log('');
    
    // Tipo de mensaje específico
    const msgTypeDisplay = getMessageTypeDisplay(m.mtype, m.msg);
    console.log(`${COLORS.accent(SYMBOLS.star)} ${COLORS.msgType(`╰➤${SYMBOLS.msgType} Tipo Msg:`)} ${COLORS.msgType(msgTypeDisplay)}`);
    
    // Footer
    console.log(COLORS.header('╰⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╯'));

    // Mostrar imagen si existe
    if (img) {
      console.log(img.trimEnd());
    }

    // Procesar y mostrar texto del mensaje
    await processMessageText(m, conn);

    // Mostrar parámetros de stub si existen
    await processStubParameters(m, conn);

    // Mostrar información específica según el tipo de mensaje
    displaySpecificMessageInfo(m);

  } catch (error) {
    console.error(COLORS.error('Error en print.js:'), error);
  }
}

// Función para procesar el texto del mensaje
async function processMessageText(m, conn) {
  if (typeof m.text === 'string' && m.text) {
    let log = m.text.replace(/\u200e+/g, '');

    // Regex mejorado para markdown
    const mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~`])(?!`)(.+?)\1|```((?:.|[\n\r])+?)```|`([^`]+?)`)(?=\S?(?:[\s\n]|$))/g;
    
    const mdFormat = (depth = 4) => (_, type, text, monospace) => {
      const types = { 
        '_': 'italic', 
        '*': 'bold', 
        '~': 'strikethrough', 
        '`': 'bgGray' 
      };
      
      text = text || monospace;
      return !types[type] || depth < 1
        ? text
        : chalk[types[type]](text.replace(/`/g, '').replace(mdRegex, mdFormat(depth - 1)));
    };

    // Aplicar formato markdown
    log = log.replace(mdRegex, mdFormat(4));

    // Truncar si es muy largo
    if (log.length > MAX_MESSAGE_LENGTH) {
      log = log.substring(0, MAX_MESSAGE_LENGTH) + '\n' + COLORS.truncated('...Texto truncado por longitud...');
    }

    // Formatear líneas especiales
    log = log.split('\n').map(line => {
      const trimmed = line.trim();
      
      // Citas
      if (trimmed.startsWith('>')) {
        return COLORS.quote(line.replace(/^>/, '┃'));
      }
      
      // Listas numeradas
      if (/^([1-9]|[1-9][0-9])\./.test(trimmed)) {
        return line.replace(/^(\d+)\./, (_, num) => '  ' + num + '.');
      }
      
      // Listas con viñetas
      if (/^[-*]\s/.test(trimmed)) {
        return line.replace(/^[-*]/, '  •');
      }
      
      return line;
    }).join('\n');

    // Resaltar URLs
    log = log.replace(urlRegex, url => COLORS.url(url));

    // Procesar menciones
    if (m.mentionedJid && m.mentionedJid.length > 0) {
      for (const user of m.mentionedJid) {
        try {
          const name = await conn.getName(user);
          const userHandle = '@' + user.split('@')[0];
          log = log.replace(userHandle, COLORS.mention('@' + name));
        } catch (e) {
          console.error('Error procesando mención:', e.message);
        }
      }
    }

    // Mostrar el mensaje con colores apropiados
    const textColor = m.error != null ? COLORS.error : m.isCommand ? COLORS.command : chalk.white;
    console.log(textColor(log));
  }
}

// Función para procesar parámetros de stub
async function processStubParameters(m, conn) {
  if (m.messageStubParameters && m.messageStubParameters.length > 0) {
    try {
      const names = await Promise.all(
        m.messageStubParameters.map(async (jid) => {
          const id = conn.decodeJid(jid);
          const name = await conn.getName(id);
          const phoneNumber = PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international');
          return chalk.gray(phoneNumber + (name ? ' ~' + name : ''));
        })
      );
      console.log('Participantes:', names.join(', '));
    } catch (e) {
      console.error('Error procesando parámetros:', e.message);
    }
  }
}

// Función para mostrar información específica del tipo de mensaje
function displaySpecificMessageInfo(m) {
  const mtype = m.mtype?.toLowerCase() || '';
  
  if (mtype.includes('document')) {
    const fileName = m.msg?.fileName || m.msg?.displayName || 'Archivo';
    console.log(`${SYMBOLS.document} Documento: ${fileName}`);
  } 
  else if (mtype.includes('contactsarray')) {
    console.log(`${SYMBOLS.contacts} Contactos múltiples`);
  } 
  else if (mtype.includes('contact')) {
    const contactName = m.msg?.displayName || 'Sin nombre';
    console.log(`${SYMBOLS.contact} Contacto: ${contactName}`);
  } 
  else if (mtype.includes('audio')) {
    const duration = m.msg?.seconds || 0;
    const isPTT = m.msg?.ptt;
    const symbol = isPTT ? SYMBOLS.ptt : SYMBOLS.audio;
    const type = isPTT ? 'PTT' : 'Audio';
    console.log(`${symbol} ${type}: ${formatDuration(duration)}`);
  }
}

// Watch file para hot reload
const file = global.__filename(import.meta.url);
watchFile(file, () => {
  console.log(chalk.redBright("Se actualizó 'lib/print.js'"));
});