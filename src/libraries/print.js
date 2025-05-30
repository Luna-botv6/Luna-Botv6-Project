import { WAMessageStubType } from "@whiskeysockets/baileys";
import PhoneNumber from 'awesome-phonenumber';
import chalk from 'chalk';
import { watchFile } from 'fs';

const terminalImage = global.opts['img'] ? require('terminal-image') : '';
const urlRegex = (await import('url-regex-safe')).default({ strict: false });

const MAX_MESSAGE_LENGTH = 400;

export default async function (m, conn = { user: {} }) {
  const _name = await conn.getName(m.sender);
  const sender = PhoneNumber('+' + m.sender.replace('@s.whatsapp.net', '')).getNumber('international') + (_name ? ' ~' + _name : '');
  const chat = await conn.getName(m.chat);
  let img;

  try {
    if (global.opts['img']) {
      img = /sticker|image/gi.test(m.mtype) ? await terminalImage.buffer(await m.download()) : false;
    }
  } catch (e) {
    console.error(e);
  }

  const filesize = (() => {
    const msg = m.msg;
    if (!msg) return m.text?.length || 0;
    return msg.vcard?.length || msg.fileLength?.low || msg.fileLength || msg.axolotlSenderKeyDistributionMessage?.length || m.text?.length || 0;
  })();

  const user = global.db.data.users[m.sender];
  const me = PhoneNumber('+' + (conn.user?.jid || '').replace('@s.whatsapp.net', '')).getNumber('international');

  console.log(chalk.bold.cyanBright('╭⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╮'));
    console.log('')
  console.log(chalk.bold.magentaBright(`☆            ✧°˚ Luna-BotV6 ˚°✧         `));
    console.log('')
  console.log(`┊ ${chalk.redBright('╰➤🤖 Luna-Bot:')} ${me} ~ ${conn.user.name}${conn.user.jid !== global.conn.user.jid ? chalk.gray(' (Sub Bot)') : ''}`);
    console.log('\n')
  console.log(`┊ ${chalk.yellow('╰➤╰⏰ Hora:')} ${chalk.yellow(new Date(1000 * (m.messageTimestamp?.low || m.messageTimestamp || Date.now() / 1000)).toTimeString().split(' ')[0])}`);
    console.log('\n')
  console.log(`☆ ${chalk.green('╰➤📑 Tipo:')} ${chalk.green(m.messageStubType ? WAMessageStubType[m.messageStubType] : 'Texto')}`);
    console.log('\n')
  console.log(`┊ ${chalk.magenta('╰➤📊 Tamaño:')} ${filesize} [${(filesize / 1000 ** Math.floor(Math.log10(filesize))).toFixed(1)}${['', 'K', 'M', 'G', 'T', 'P'][Math.floor(Math.log10(filesize) / 3)] || ''}B]`);
    console.log('\n')
  console.log(`┊ ${chalk.green('╰➤📤 De:')} ${chalk.green(sender)}`);
    console.log('\n')
  console.log(`┊ ${chalk.yellow('╰➤📥 En:')} ${chalk.yellow(chat)} (${m.chat})`);
    console.log('\n')
  console.log(`${chalk.hex('#FFB347')('☆')} ${chalk.cyan('╰➤💬 Tipo Msg:')} ${chalk.cyan(m.mtype?.replace(/message$/i, '').replace('audio', m.msg?.ptt ? 'PTT' : 'Audio'))}`);
  console.log(chalk.bold.cyanBright('╰⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╯'));

  if (img) console.log(img.trimEnd());

  if (typeof m.text === 'string' && m.text) {
    let log = m.text.replace(/\u200e+/g, '');

    const mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~`])(?!`)(.+?)\1|```((?:.|[\n\r])+?)```|`([^`]+?)`)(?=\S?(?:[\s\n]|$))/g;
    const mdFormat = (depth = 4) => (_, type, text, monospace) => {
      const types = { '_': 'italic', '*': 'bold', '~': 'strikethrough', '`': 'bgGray' };
      text = text || monospace;
      return !types[type] || depth < 1
        ? text
        : chalk[types[type]](text.replace(/`/g, '').replace(mdRegex, mdFormat(depth - 1)));
    };

    log = log.replace(mdRegex, mdFormat(4));

    if (log.length > MAX_MESSAGE_LENGTH) {
      log = log.substring(0, MAX_MESSAGE_LENGTH) + '\n' + chalk.blue('...Texto truncado por longitud...');
    }

    log = log.split('\n').map(line => {
      if (line.trim().startsWith('>')) return chalk.bgGray.dim(line.replace(/^>/, '┃'));
      if (/^([1-9]|[1-9][0-9])\./.test(line.trim())) return line.replace(/^(\d+)\./, (_, num) => '  ' + num + '.');
      if (/^[-*]\s/.test(line.trim())) return line.replace(/^[-*]/, '  •');
      return line;
    }).join('\n');

    log = log.replace(urlRegex, url => chalk.blueBright(url));

    if (m.mentionedJid) {
      for (const user of m.mentionedJid) {
        const name = await conn.getName(user);
        log = log.replace('@' + user.split`@`[0], chalk.blueBright('@' + name));
      }
    }

    console.log(m.error != null ? chalk.red(log) : m.isCommand ? chalk.yellow(log) : log);
  }

  if (m.messageStubParameters) {
    const names = await Promise.all(m.messageStubParameters.map(async (jid) => {
      const id = conn.decodeJid(jid);
      const name = await conn.getName(id);
      return chalk.gray(PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international') + (name ? ' ~' + name : ''));
    }));
    console.log(names.join(', '));
  }

  if (/document/i.test(m.mtype)) console.log(`🗂️ Documento: ${m.msg?.fileName || m.msg?.displayName || 'Archivo'}`);
  else if (/ContactsArray/i.test(m.mtype)) console.log('👥 Contactos múltiples');
  else if (/contact/i.test(m.mtype)) console.log(`👤 Contacto: ${m.msg?.displayName || ''}`);
  else if (/audio/i.test(m.mtype)) {
    const duration = m.msg?.seconds || 0;
    console.log(`${m.msg?.ptt ? '🎤 PTT' : '🎵 Audio'}: ${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`);
  }
}

const file = global.__filename(import.meta.url);
watchFile(file, () => {
  console.log(chalk.redBright("Se actualizó 'lib/print.js'"));
});
