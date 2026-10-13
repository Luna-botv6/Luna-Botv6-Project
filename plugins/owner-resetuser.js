import fs from 'node:fs';
import { getUserStats, setUserStats } from '../lib/stats.js';
import { resolveMention } from '../lib/mentionHelper.js';
import { normalizarRemitente } from '../lib/funcion/resolver-usuario.js';

function textos(idioma) {
  const lang = idioma || global.defaultLenguaje || 'es';
  try {
    const parsed = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'));
    if (parsed?.plugins?.owner_resetuser) return parsed.plugins.owner_resetuser;
  } catch {}
  try {
    const parsed = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8'));
    if (parsed?.plugins?.owner_resetuser) return parsed.plugins.owner_resetuser;
  } catch {}
  return {};
}

function numeroDe(jid) {
  return String(jid || '').split('@')[0].replace(/\D/g, '');
}

function clavesCandidatas(jid) {
  const num = numeroDe(jid);
  const base = String(jid || '');
  return [...new Set([
    base,
    num ? num + '@s.whatsapp.net' : null,
    num ? num + '@lid' : null,
    num ? num + '@c.us' : null
  ].filter(Boolean))];
}

function statsConDatos(jid) {
  for (const key of clavesCandidatas(jid)) {
    try {
      const st = getUserStats(key);
      if (st && (st.exp > 0 || st.level > 0 || st.money > 0)) return { stats: st, key };
    } catch {}
  }
  return { stats: null, key: null };
}

const waitForUserResponse = async (conn, chatId, senderId, timeout = 30000) => {
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

const handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const idioma = global.db.data.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
  const t = textos(idioma);

  if (text && text.trim().toLowerCase() === 'todos') {
    await conn.sendMessage(m.chat, {
      text: t.todos_aviso || '⚠️ *Vas a resetear los datos de TODOS los usuarios del bot.*\n\nEsta accion no se puede deshacer facilmente.\n\n*Responde "si" para confirmar o "no" para cancelar.*'
    }, { quoted: m });
    const confirmation = await waitForUserResponse(conn, m.chat, m.sender, 30000);
    if (!confirmation || !['si', 'sí', 'yes', 'confirmar'].includes(confirmation.toLowerCase())) {
      return conn.sendMessage(m.chat, { text: t.cancelada || '❌ *Operacion cancelada.*' }, { quoted: m });
    }
    const resetData = { exp: 0, level: 0, money: 0, joincount: 0, premiumTime: 0, mysticcoins: 0, lunaCoins: 0, role: '🧰 Novato', limit: 10 };
    let count = 0;
    for (const userId of Object.keys(global.db.data.users || {})) {
      setUserStats(userId, resetData);
      const u = global.db.data.users[userId];
      if (u) {
        global.db.data.users[userId] = {
          language: u.language || global.defaultLenguaje,
          banned: u.banned || false,
          premium: u.premium || false,
          lastResetUser: 0
        };
      }
      count++;
    }
    return conn.sendMessage(m.chat, {
      text: (t.todos_ok || '✅ *Reset masivo completado.*\n\n👥 Usuarios reseteados: *{n}*\n🗑️ Todos los datos de economia y experiencia han sido eliminados.').replace('{n}', count)
    }, { quoted: m });
  }

  const cooldownTime = 300000;
  const lastUsed = global.db.data.users?.[m.sender]?.lastResetUser || 0;
  const now = Date.now();
  if (now - lastUsed < cooldownTime) {
    const remainingTime = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
    const texto = (t.espera || '⏰ *Espera {m}m {s}s antes de usar este comando nuevamente.*')
      .replace('{m}', Math.floor(remainingTime / 60)).replace('{s}', remainingTime % 60);
    return conn.sendMessage(m.chat, { text: texto }, { quoted: m });
  }

  const objetivo = resolveMention(m, args || []);
  if (!objetivo) {
    return conn.sendMessage(m.chat, {
      text: (t.uso || `📋 *Uso:* {prefix}{command} <@usuario>\n*Ejemplo:* {prefix}{command} @usuario\n\nPara resetear todos: {prefix}{command} todos`)
        .replace('{prefix}', usedPrefix).replaceAll('{command}', command)
    }, { quoted: m });
  }
  const userNumber = numeroDe(objetivo);
  const hallado = statsConDatos(objetivo);
  if (!hallado.stats) {
    return conn.sendMessage(m.chat, {
      text: (t.sin_datos || `❌ El usuario @{numero} no tiene datos registrados.`)
        .replace('{numero}', userNumber),
      mentions: [objetivo]
    }, { quoted: m });
  }
  const user = hallado.key;
  const currentStats = {
    exp: hallado.stats.exp || 0,
    level: hallado.stats.level || 0,
    money: hallado.stats.money || 0,
    mysticcoins: hallado.stats.mysticcoins || 0,
    lunaCoins: hallado.stats.lunaCoins || 0,
    role: hallado.stats.role || '🧰 Novato',
    limit: hallado.stats.limit ?? 10
  };

  await conn.sendMessage(m.chat, {
    text: (t.confirmar || `⚠️ *¿Resetear los datos de @{numero}?*\n\n`).replace('{numero}', userNumber) +
      `📊 *${t.datos || 'Datos actuales'}:*\n` +
      `• ${t.exp || 'Experiencia'}: ${currentStats.exp}\n` +
      `• ${t.dinero || 'Dinero'}: ${currentStats.money}\n` +
      `• MysticCoins: ${currentStats.mysticcoins}\n` +
      `• LunaCoins: ${currentStats.lunaCoins}\n\n` +
      (t.responder || '*Responde con "si" para confirmar o "no" para cancelar.*'),
    mentions: [objetivo]
  }, { quoted: m });

  const confirmation = await waitForUserResponse(conn, m.chat, m.sender, 30000);
  if (!confirmation || !['si', 'sí', 'yes', 'confirmar'].includes(confirmation.toLowerCase())) {
    return conn.sendMessage(m.chat, { text: t.cancelada || '❌ *Operacion cancelada.*' }, { quoted: m });
  }

  try {
    const previousStats = {
      exp: currentStats.exp,
      level: currentStats.level,
      money: currentStats.money,
      joincount: hallado.stats.joincount || 0,
      premiumTime: hallado.stats.premiumTime || 0,
      mysticcoins: currentStats.mysticcoins,
      lunaCoins: currentStats.lunaCoins,
      role: currentStats.role,
      limit: currentStats.limit
    };
    if (!global.db.data.backups) global.db.data.backups = {};
    global.db.data.backups[user] = {
      userId: user,
      userNumber,
      previousStats,
      resetBy: m.sender,
      resetDate: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)
    };
    setUserStats(user, { exp: 0, level: 0, money: 0, joincount: 0, premiumTime: 0, mysticcoins: 0, lunaCoins: 0, role: '🧰 Novato', limit: 10 });
    if (global.db.data.users[user]) {
      global.db.data.users[user] = {
        language: global.db.data.users[user].language || global.defaultLenguaje,
        banned: global.db.data.users[user].banned || false,
        premium: global.db.data.users[user].premium || false,
        lastResetUser: 0
      };
    }
    if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {};
    global.db.data.users[m.sender].lastResetUser = Date.now();
    await conn.sendMessage(m.chat, {
      text: (t.exito || `✅ *Datos reseteados para @{numero}*\n\n`).replace('{numero}', userNumber) +
        `• ${t.exp || 'Experiencia'}: ${previousStats.exp.toLocaleString()}\n` +
        `• Nivel: ${previousStats.level}\n` +
        `• ${t.dinero || 'Dinero'}: ${previousStats.money.toLocaleString()}\n\n` +
        `🔄 Usa \`${usedPrefix}restoreuser @${userNumber}\` ${(t.valido || 'para restaurar (valido 24h)')}`,
      mentions: [objetivo]
    }, { quoted: m });
  } catch (error) {
    await conn.sendMessage(m.chat, {
      text: t.error || '❌ *Error al resetear los datos del usuario.* Intentalo nuevamente.'
    }, { quoted: m });
  }
};

handler.tags = ['owner'];
handler.command = /(restablecerdatos|deletedatauser|resetuser)$/i;
handler.rowner = true;
handler.group = false;
handler.private = false;
export default handler;
