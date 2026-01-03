import { WAMessageStubType } from "@whiskeysockets/baileys";
import chalk from 'chalk';
import { watchFile } from 'fs';

const nameCache = new Map();
const MAX_CACHE = 300;
const CACHE_TTL = 10 * 60 * 1000;

function cleanCache(cache) {
  if (cache.size > MAX_CACHE) {
    const keys = Array.from(cache.keys()).slice(0, cache.size - MAX_CACHE);
    keys.forEach(k => cache.delete(k));
  }
}

function formatNumber(jid) {
  if (!jid || typeof jid !== 'string') return 'Desconocido';
  
  try {
    const num = jid.split('@')[0];
    
    if (jid.includes('@lid')) {
      return `+${num}`;
    }
    
    if (num.length >= 10) {
      return `+${num}`;
    }
    
    return num;
  } catch {
    return jid.split('@')[0] || 'Desconocido';
  }
}

async function getName(conn, jid) {
  if (!jid) return 'Usuario';
  if (nameCache.has(jid)) {
    const cached = nameCache.get(jid);
    if (Date.now() - cached.time < CACHE_TTL) {
      return cached.name;
    }
  }
  
  try {
    const name = await conn.getName(jid).catch(() => null);
    const finalName = name?.trim() || (jid.includes('@g.us') ? 'Grupo' : 'Usuario');
    nameCache.set(jid, { name: finalName, time: Date.now() });
    cleanCache(nameCache);
    return finalName;
  } catch {
    return jid.includes('@g.us') ? 'Grupo' : 'Usuario';
  }
}

async function printMessage(m, conn = { user: {} }) {
  try {
    const sender = m.sender || m.key?.participant || m.from || '';
    const chat = m.chat || m.key?.remoteJid || '';
    
    if (!sender || !chat) return;

    const [senderName, chatName] = await Promise.all([
      sender ? getName(conn, sender) : Promise.resolve('Usuario'),
      chat ? getName(conn, chat) : Promise.resolve('Chat')
    ]);

    const senderPhone = formatNumber(sender);
    const chatPhone = formatNumber(chat);
    
    const timestamp = m.messageTimestamp?.low || m.messageTimestamp || Date.now() / 1000;
    const time = new Date(timestamp * 1000).toLocaleTimeString('es-ES');
    
    const msgType = m.mtype?.replace(/message$/i, '').replace('audio', m.msg?.ptt ? 'PTT' : 'Audio') || 'Texto';
    const stubType = m.messageStubType ? WAMessageStubType[m.messageStubType] : 'Texto';

    console.log(chalk.bold.cyanBright('╭⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╮'));
    console.log('');
    console.log(chalk.bold.cyanBright('⎨') + chalk.bold.magentaBright('            ✧°ˆ Luna-BotV6 ˆ°✧         '));
    console.log('');
    console.log(chalk.cyanBright('⎨') + ` ${chalk.redBright('🤖 Bot:')} ${formatNumber(conn.user?.jid)} ~ ${conn.user?.name}`);
    console.log('');
    console.log(chalk.cyanBright('⎨') + ` ${chalk.yellow('⏰ Hora:')} ${chalk.yellow(time)}`);
    console.log('');
    console.log(chalk.cyanBright('⎨') + ` ${chalk.green('📋 Tipo:')} ${chalk.green(stubType)}`);
    console.log('');
    console.log(chalk.cyanBright('⎨') + ` ${chalk.green('📤 De:')} ${chalk.green(senderPhone)} ~ ${senderName}`);
    console.log('');
    console.log(chalk.cyanBright('⎨') + ` ${chalk.yellow('📥 En:')} ${chalk.yellow(chatPhone)} ~ ${chatName}`);
    console.log('');
    console.log(chalk.cyanBright('⎨') + ` ${chalk.cyan('💬 Msg:')} ${chalk.cyan(msgType)}`);
    console.log(chalk.bold.cyanBright('╰⋙════ ⋆★⋆ ════ ⋘•>🌙 <•⋙════ ⋆★⋆ ════ ⋙╯'));

    if (typeof m.text === 'string' && m.text) {
      let log = m.text.replace(/\u200e+/g, '');

      if (log.length > 400) {
        log = log.substring(0, 400) + '\n' + chalk.blue('...truncado...');
      }

      log = log.replace(/(?:https?:\/\/|www\.)\S+/g, url => chalk.blueBright(url));

      console.log(m.error ? chalk.red(log) : m.isCommand ? chalk.yellow(log) : log);
    }

    if (/imageMessage/i.test(m.mtype)) {
      console.log(chalk.green('📷 Imagen'));
    } else if (/stickerMessage/i.test(m.mtype)) {
      console.log(chalk.magenta('🧩 Sticker'));
    } else if (/documentMessage/i.test(m.mtype)) {
      console.log(`📂 Documento: ${m.msg?.fileName || 'Archivo'}`);
    } else if (/audioMessage/i.test(m.mtype)) {
      const duration = m.msg?.seconds || 0;
      const min = String(Math.floor(duration / 60)).padStart(2, '0');
      const sec = String(duration % 60).padStart(2, '0');
      console.log(`${m.msg?.ptt ? '🎤' : '🎵'} ${min}:${sec}`);
    } else if (/contactMessage/i.test(m.mtype)) {
      console.log(`👤 Contacto: ${m.msg?.displayName || 'N/A'}`);
    }
  } catch (e) {
    console.error('[Print Error]', e.message);
  }
}

setInterval(() => {
  if (nameCache.size > 0) {
    const now = Date.now();
    for (const [key, value] of nameCache.entries()) {
      if (now - value.time > CACHE_TTL) {
        nameCache.delete(key);
      }
    }
  }
}, 5 * 60 * 1000);

export default printMessage;
export { printMessage };

const file = global.__filename(import.meta.url);
watchFile(file, () => {
  console.log(chalk.redBright("Se actualizó 'print.js'"));
});
