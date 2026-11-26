import fs from 'fs';
import path from 'path';
import { setUserStats, getTodosLosUsuarios } from '../lib/stats.js';
import { resolverUsuarioObjetivo } from '../lib/funcion/resolver-usuario.js';
import { esperarConfirmacion } from '../lib/funcion/confirmacion.js';
import { marcarResetEconomia, marcarResetTodos } from '../lib/funcion/economia-reset-guard.js';
import { notificarResetEconomia } from '../lib/economiaReset.js';
import { getClanDeUsuario, quitarUsuarioDeClanes, resetTodosLosClanes, getClanes } from '../lib/clanSystem.js';
import { mismoUsuario } from '../lib/identidad.js';

const BACKUP_MS = 72 * 60 * 60 * 1000;
const BACKUP_DIR = './database/backups';
const MAX_COPIAS = 3;

function escribirCopiaTodos(statsPrev, usersPrev, por, clanesPrev) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const fecha = new Date();
    const iso = fecha.toISOString().replace(/[:.]/g, '-');
    const nombre = `reset-todos-${iso}.json`;
    const ruta = path.join(BACKUP_DIR, nombre);
    const contenido = {
      version: 1,
      fecha: fecha.toISOString(),
      por: String(por || ''),
      totalStats: Object.keys(statsPrev || {}).length,
      totalUsers: Object.keys(usersPrev || {}).length,
      stats: statsPrev || {},
      users: usersPrev || {},
      clanes: clanesPrev || {}
    };
    const tmp = ruta + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(contenido));
    fs.renameSync(tmp, ruta);
    const archivos = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('reset-todos-') && f.endsWith('.json'))
      .sort();
    while (archivos.length > MAX_COPIAS) {
      const viejo = archivos.shift();
      try { fs.unlinkSync(path.join(BACKUP_DIR, viejo)); } catch {}
    }
    return nombre;
  } catch (e) {
    console.error('[resetuser] no se pudo guardar la copia masiva:', e.message);
    return null;
  }
}

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

function buscarStats(numero) {
  const db = getTodosLosUsuarios() || {};
  const claves = Object.keys(db).filter((key) => numeroDe(key) === numero);
  const key = claves.find((k) => !String(k).includes('@lid')) || claves[0];
  if (!key) return null;
  return { key, stats: db[key] };
}

function bancoLimpio() {
  return { money: 0, exp: 0, mysticcoins: 0, lunaCoins: 0, lastInterest: 0 };
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.db.data.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
  const t = textos(idioma);

  if (text && text.trim().toLowerCase() === 'todos') {
    await conn.sendMessage(m.chat, {
      text: t.todos_aviso || '⚠️ *Vas a resetear los datos de TODOS los usuarios del bot.*\n\nEsta accion no se puede deshacer facilmente.\n\n*Responde "si" para confirmar o "no" para cancelar.*'
    }, { quoted: m });
    const confirmation = await esperarConfirmacion(conn, { chatId: m.chat, senderId: m.sender, senderRaw: m.senderRaw, timeout: 30000 });
    if (!confirmation || !['si', 'sí', 'yes', 'confirmar'].includes(confirmation.toLowerCase())) {
      return conn.sendMessage(m.chat, { text: t.cancelada || '❌ *Operacion cancelada.*' }, { quoted: m });
    }
    const statsPrev = JSON.parse(JSON.stringify(getTodosLosUsuarios() || {}));
    const usersPrev = JSON.parse(JSON.stringify(global.db.data.users || {}));
    const clanesPrev = JSON.parse(JSON.stringify(getClanes() || {}));
    marcarResetTodos();
    const archivoCopia = escribirCopiaTodos(statsPrev, usersPrev, m.sender, clanesPrev);
    const resetData = {
      exp: 0, level: 0, money: 0, joincount: 0, premiumTime: 0,
      mysticcoins: 0, lunaCoins: 0, role: '🧰 Novato', limit: 10,
      dailyExp: 0, dailyMoney: 0, dailyMines: 0, banco: bancoLimpio()
    };
    const claves = new Set([
      ...Object.keys(global.db.data.users || {}),
      ...Object.keys(getTodosLosUsuarios() || {})
    ]);
    let count = 0;
    for (const userId of claves) {
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
    resetTodosLosClanes();
    const copiaTexto = archivoCopia
      ? `\n\n💾 *Copia guardada:* ${archivoCopia}\n> Se guardan las últimas 3 copias (72 h). Restaurá con *.restoreuser todos*.`
      : '\n\n⚠️ *No se pudo guardar la copia de seguridad.*';
    return conn.sendMessage(m.chat, {
      text: (t.todos_ok || '✅ *Reset masivo completado.*\n\n👥 Usuarios reseteados: *{n}*\n🗑️ Todos los datos de economia y experiencia han sido eliminados.').replace('{n}', count) +
        `\n🏰 *Clanes reseteados:* ${Object.keys(clanesPrev).length}` + copiaTexto
    }, { quoted: m });
  }

  const cooldownTime = 300000;
  const lastUsed = global.db.data.users?.[m.sender]?.lastResetUser || 0;
  const ahora = Date.now();
  if (ahora - lastUsed < cooldownTime) {
    const remainingTime = Math.ceil((cooldownTime - (ahora - lastUsed)) / 1000);
    const texto = (t.espera || '⏰ *Espera {m}m {s}s antes de usar este comando nuevamente.*')
      .replace('{m}', Math.floor(remainingTime / 60)).replace('{s}', remainingTime % 60);
    return conn.sendMessage(m.chat, { text: texto }, { quoted: m });
  }

  const res = resolverUsuarioObjetivo(conn, {
    mentionedJid: m.mentionedJid,
    text,
    quotedSender: m.quoted?.sender
  });
  if (res.error === 'falta') {
    return conn.sendMessage(m.chat, {
      text: (t.uso || `📋 *Uso:* {prefix}{command} <@usuario>\n*Ejemplo:* {prefix}{command} @usuario\n\nPara resetear todos: {prefix}{command} todos`)
        .replace('{prefix}', usedPrefix).replaceAll('{command}', command)
    }, { quoted: m });
  }
  if (res.error) {
    return conn.sendMessage(m.chat, {
      text: (t.numero_invalido || `❌ *Número inválido.* Usa: {prefix}{command} <número>`)
        .replace('{prefix}', usedPrefix).replace('{command}', command)
    }, { quoted: m });
  }

  const hallado = buscarStats(res.numero);
  if (!hallado) {
    return conn.sendMessage(m.chat, {
      text: (t.sin_datos || `❌ El usuario @{numero} no tiene datos registrados.`).replace('{numero}', res.numero),
      mentions: [res.mention]
    }, { quoted: m });
  }

  const stats = hallado.stats;
  const clanInfo = getClanDeUsuario(hallado.key);
  const eraLider = clanInfo ? mismoUsuario(clanInfo.clan.lider, hallado.key) : false;
  const clanBackup = clanInfo ? { nombre: clanInfo.nombre, eraLider, data: JSON.parse(JSON.stringify(clanInfo.clan)) } : null;
  const previousStats = {
    exp: stats.exp || 0,
    level: stats.level || 0,
    money: stats.money || 0,
    joincount: stats.joincount || 0,
    premiumTime: stats.premiumTime || 0,
    mysticcoins: stats.mysticcoins || 0,
    lunaCoins: stats.lunaCoins || 0,
    role: stats.role || '🧰 Novato',
    limit: stats.limit ?? 10,
    banco: { ...bancoLimpio(), ...(stats.banco && typeof stats.banco === 'object' ? stats.banco : {}) }
  };

  await conn.sendMessage(m.chat, {
    text: (t.confirmar || `⚠️ *¿Resetear los datos de @{numero}?*\n\n`).replace('{numero}', res.numero) +
      `📊 *${t.datos || 'Datos actuales'}:*\n` +
      `• ${t.exp || 'Experiencia'}: ${previousStats.exp}\n` +
      `• ${t.dinero || 'Dinero'}: ${previousStats.money}\n` +
      `• MysticCoins: ${previousStats.mysticcoins}\n` +
      `• LunaCoins: ${previousStats.lunaCoins}\n` +
      `• Banco: ${previousStats.banco.money || 0} diamantes\n` +
      `• Clan: ${clanInfo ? clanInfo.nombre : 'sin clan'}\n\n` +
      (t.responder || '*Responde con "si" para confirmar o "no" para cancelar.*'),
    mentions: [res.mention]
  }, { quoted: m });

  const confirmation = await esperarConfirmacion(conn, { chatId: m.chat, senderId: m.sender, senderRaw: m.senderRaw, timeout: 30000 });
  if (!confirmation || !['si', 'sí', 'yes', 'confirmar'].includes(confirmation.toLowerCase())) {
    return conn.sendMessage(m.chat, { text: t.cancelada || '❌ *Operacion cancelada.*' }, { quoted: m });
  }

  try {
    if (!global.db.data.backups) global.db.data.backups = {};
    const backup = {
      userId: hallado.key,
      userNumber: res.numero,
      previousStats,
      clan: clanBackup,
      resetBy: m.sender,
      resetDate: ahora,
      expiresAt: ahora + BACKUP_MS,
      tipo: 'resetuser'
    };
    global.db.data.backups[hallado.key] = backup;
    global.db.data.backups[`${res.numero}@s.whatsapp.net`] = backup;

    marcarResetEconomia(hallado.key);
    setUserStats(hallado.key, {
      exp: 0, level: 0, money: 0, joincount: 0, premiumTime: 0,
      mysticcoins: 0, lunaCoins: 0, role: '🧰 Novato', limit: 10,
      dailyExp: 0, dailyMoney: 0, dailyMines: 0, banco: bancoLimpio()
    });
    if (global.db.data.users[hallado.key]) {
      Object.assign(global.db.data.users[hallado.key], {
        exp: 0,
        level: 0,
        money: 0,
        joincount: 0,
        premiumTime: 0,
        mysticcoins: 0,
        lunaCoins: 0,
        role: '🧰 Novato',
        limit: 10,
        banco: bancoLimpio()
      });
    }
    const clanRes = quitarUsuarioDeClanes(hallado.key);
    const clanTexto = clanRes
      ? clanRes.disuelto
        ? `🏰 *Clan:* ${clanRes.nombre} disuelto (eras el único miembro).`
        : `🏰 *Clan:* saliste de ${clanRes.nombre}${clanRes.eraLider ? ' y se transfirió el liderazgo.' : '.'}`
      : '';
    if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {};
    global.db.data.users[m.sender].lastResetUser = ahora;
    global.db.write?.();
    await notificarResetEconomia(res.numero, 'resetuser');

    await conn.sendMessage(m.chat, {
      text: (t.exito || `✅ *Datos reseteados para @{numero}*\n\n`).replace('{numero}', res.numero) +
        `• ${t.exp || 'Experiencia'}: ${previousStats.exp.toLocaleString()}\n` +
        `• Nivel: ${previousStats.level}\n` +
        `• ${t.dinero || 'Dinero'}: ${previousStats.money.toLocaleString()}\n` +
        `• Banco: ${previousStats.banco.money.toLocaleString()} diamantes\n` +
        (clanTexto ? `${clanTexto}\n` : '') +
        `\n💾 ${(t.valido || 'para restaurar (valido 24h)').replace('24h', '72h')}\n` +
        `🔄 Usa \`${usedPrefix}restoreuser @${res.numero}\``,
      mentions: [res.mention]
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
