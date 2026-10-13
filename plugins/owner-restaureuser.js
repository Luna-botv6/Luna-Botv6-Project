import fs from 'node:fs';
import { setUserStats } from '../lib/stats.js';
import { resolverUsuarioObjetivo, normalizarRemitente } from '../lib/funcion/resolver-usuario.js';

function textos(idioma) {
  const lang = idioma || global.defaultLenguaje || 'es';
  try {
    const parsed = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'));
    if (parsed?.plugins?.owner_restaureuser) return parsed.plugins.owner_restaureuser;
  } catch {}
  try {
    const parsed = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'));
    if (parsed?.plugins?.owner_restaureuser) return parsed.plugins.owner_restaureuser;
  } catch {}
  return {};
}

const waitForUserResponse = async (conn, chatId, senderId, timeout = 45000) => {
  return new Promise((resolve) => {
    const responseHandler = (update) => {
      try {
        if (update.messages && update.messages.length > 0) {
          const message = update.messages[0];
          const remitente = message.key?.participant || message.key?.remoteJid || '';
          if (message.key?.remoteJid === chatId && normalizarRemitente(remitente, senderId) && message.message) {
            const text = message.message.conversation || message.message.extendedTextMessage?.text || '';
            conn.ev.off('messages.upsert', responseHandler);
            resolve(text.trim());
          }
        }
      } catch {}
    };
    conn.ev.on('messages.upsert', responseHandler);
    setTimeout(() => {
      conn.ev.off('messages.upsert', responseHandler);
      resolve(null);
    }, timeout);
  });
};

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.db.data.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
  const t = textos(idioma);
  const ahora = Date.now();
  const cooldown = 600000;
  const ultimo = global.db.data.users?.[m.sender]?.lastRestoreUser || 0;
  if (ahora - ultimo < cooldown) {
    const resta = Math.ceil((cooldown - (ahora - ultimo)) / 1000);
    const texto = t.espera
      ? t.espera.replace('{m}', Math.floor(resta / 60)).replace('{s}', resta % 60)
      : `⏰ *Espera ${Math.floor(resta / 60)}m ${resta % 60}s antes de usar este comando nuevamente.*`;
    return conn.sendMessage(m.chat, { text: texto }, { quoted: m });
  }

  const res = resolverUsuarioObjetivo(conn, {
    mentionedJid: m.mentionedJid,
    text,
    quotedSender: m.quoted?.sender
  });
  if (res.error === 'falta') {
    return conn.sendMessage(m.chat, {
      text: t.uso
        ? t.uso.replace('{prefix}', usedPrefix).replace('{command}', command)
        : `📋 *Uso:* ${usedPrefix}${command} <@usuario>\n*Ejemplo:* ${usedPrefix}${command} @usuario\n\n💡 *Este comando restaura los datos de un usuario previamente reseteado.*`
    }, { quoted: m });
  }
  if (res.error) {
    return conn.sendMessage(m.chat, {
      text: t.numero_invalido
        ? t.numero_invalido.replace('{prefix}', usedPrefix).replace('{command}', command)
        : `❌ *Número inválido.* Usa: ${usedPrefix}${command} <número>`
    }, { quoted: m });
  }

  if (!global.db.data.backups) global.db.data.backups = {};
  let backup = null;
  let backupKey = null;
  for (const key of res.candidatos) {
    if (global.db.data.backups[key]) {
      backup = global.db.data.backups[key];
      backupKey = key;
      break;
    }
  }
  if (!backup) {
    return conn.sendMessage(m.chat, {
      text: t.sin_backup
        ? t.sin_backup.replace('{numero}', res.numero)
        : `❌ *No hay backup disponible para @${res.numero}*\n\n• El usuario no ha sido reseteado recientemente\n• O el backup ha expirado (>24h)`,
      mentions: [res.mention]
    }, { quoted: m });
  }
  if (ahora > backup.expiresAt) {
    delete global.db.data.backups[backupKey];
    return conn.sendMessage(m.chat, {
      text: t.expirado
        ? t.expirado.replace('{numero}', res.numero).replace('{fecha}', new Date(backup.expiresAt).toLocaleString())
        : `⏰ *El backup de @${res.numero} ha expirado*\n\n• Los backups son válidos por 24 horas`,
      mentions: [res.mention]
    }, { quoted: m });
  }

  const info = backup.previousStats || {};
  const horas = Math.ceil((backup.expiresAt - ahora) / (1000 * 60 * 60));
  const fmt = (x) => Number(x || 0).toLocaleString();
  await conn.sendMessage(m.chat, {
    text: (t.confirmar || '🔄 *¿Restaurar datos de @{numero}?*\n\n') .replace('{numero}', res.numero) +
      `📊 *${t.datos || 'DATOS A RESTAURAR'}:*\n` +
      `• ${t.exp || 'Experiencia'}: ${fmt(info.exp)}\n` +
      `• ${t.nivel || 'Nivel'}: ${info.level ?? 0}\n` +
      `• ${t.dinero || 'Dinero'}: ${fmt(info.money)}\n` +
      `• ${t.misticas || 'Monedas místicas'}: ${fmt(info.mysticcoins)}\n` +
      `• ${t.lunas || 'Luna Coins'}: ${fmt(info.lunaCoins)}\n` +
      `• ${t.rol || 'Rol'}: ${info.role ?? ''}\n\n` +
      `⏰ *${t.expira || 'Expira en'}:* ${horas}h\n\n` +
      (t.responder || '*Responde con "restaurar" para confirmar o "cancelar" para cancelar.*'),
    mentions: [res.mention]
  }, { quoted: m });

  const confirmation = await waitForUserResponse(conn, m.chat, m.sender, 45000);
  if (!confirmation || !['restaurar', 'restore', 'confirmar', 'sí', 'si'].includes(confirmation.toLowerCase())) {
    return conn.sendMessage(m.chat, { text: t.cancelada || '❌ *Restauración cancelada.*' }, { quoted: m });
  }

  try {
    setUserStats(backup.userId || backupKey, info);
    if (!global.db.data.users[backup.userId || backupKey]) global.db.data.users[backup.userId || backupKey] = {};
    Object.assign(global.db.data.users[backup.userId || backupKey], {
      exp: info.exp || 0,
      level: info.level || 0,
      money: info.money || 0,
      mysticcoins: info.mysticcoins || 0,
      lunaCoins: info.lunaCoins || 0,
      role: info.role || '🧰 Novato',
      limit: info.limit ?? 10,
      joincount: info.joincount || 0,
      premiumTime: info.premiumTime || 0
    });
    if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {};
    global.db.data.users[m.sender].lastRestoreUser = ahora;
    delete global.db.data.backups[backupKey];
    await conn.sendMessage(m.chat, {
      text: (t.exito || '✅ *¡Datos restaurados para @{numero}!*\n\n').replace('{numero}', res.numero) +
        `📊 *${t.datos || 'DATOS'}:*\n` +
        `• ${t.exp || 'Experiencia'}: ${fmt(info.exp)}\n` +
        `• ${t.nivel || 'Nivel'}: ${fmt(info.level)}\n` +
        `• ${t.dinero || 'Dinero'}: ${fmt(info.money)}\n` +
        `• ${t.misticas || 'Monedas místicas'}: ${fmt(info.mysticcoins)}\n` +
        `• ${t.lunas || 'Luna Coins'}: ${fmt(info.lunaCoins)}\n` +
        `• ${t.rol || 'Rol'}: ${info.role ?? ''}\n\n` +
        (t.un_uso || '⚠️ *El backup fue eliminado (uso único)*'),
      mentions: [res.mention]
    }, { quoted: m });
  } catch (error) {
    await conn.sendMessage(m.chat, {
      text: (t.error || '❌ *Error al restaurar.* Inténtalo nuevamente.') + (error?.message ? `\n\n*Error:* ${error.message}` : '')
    }, { quoted: m });
  }
};

handler.tags = ['owner'];
handler.command = /(restoreuser|restaurardatos|restaurarusuario)$/i;
handler.rowner = true;
handler.group = false;
handler.private = false;

export default handler;
