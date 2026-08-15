import fs from 'fs';
import { getConfig, updateConfig, getStats, resetUser, resetWarmup } from '../lib/funcion/private-rate-limit.js';

const handler = async (m, { conn, args, usedPrefix, isOwner, isROwner }) => {
  if (!isOwner && !isROwner) {
    return conn.reply(m.chat, '❌ *Solo los owners pueden usar este comando.*', m);
  }

  const action = args[0]?.toLowerCase();
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
  
  let t = {};
  try {
    t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8')).plugins?.owner_ratelimit || {};
  } catch {
    t = {};
  }

  if (!action) {
    const config = getConfig();
    const stats = m.chat && !m.chat.endsWith('@g.us') ? getStats(m.chat) : null;
    
    let texto = `📊 *Configuración de Rate-Limiting Privado*\n\n`;
    texto += `⚙️ *Límites actuales:*\n`;
    texto += `• Máximo por minuto: ${config.maxMessagesPerMinute}\n`;
    texto += `• Máximo por hora: ${config.maxTotalPerHour}\n`;
    texto += `• Cooldown entre mensajes: ${config.cooldownBetweenMessages / 1000}s\n\n`;
    
    if (stats) {
      texto += `📈 *Estadísticas de este chat:*\n`;
      texto += `• Mensajes último minuto: ${stats.messagesLastMinute}\n`;
      texto += `• Mensajes última hora: ${stats.messagesLastHour}\n`;
      texto += `• Advertencias: ${stats.warningCount}\n`;
      texto += `• Bloqueado: ${stats.isBlocked ? '✅' : '❌'}\n`;
      if (stats.blockedUntil) {
        texto += `• Desbloqueo: ${stats.blockedUntil.toLocaleString()}\n`;
      }
    }
    
    texto += `\n🔧 *Comandos:*\n`;
    texto += `• ${usedPrefix}ratelimit set <parametro> <valor>\n`;
    texto += `• ${usedPrefix}ratelimit reset <usuario>\n`;
    texto += `• ${usedPrefix}ratelimit stats <usuario>\n`;
    texto += `• ${usedPrefix}ratelimit resetwarmup [usuario]\n\n`;
    texto += `*Parámetros disponibles:* minute, hour, cooldown`;
    
    return conn.reply(m.chat, texto, m);
  }

  if (action === 'set') {
    const param = args[1]?.toLowerCase();
    const value = parseInt(args[2]);

    if (!param || isNaN(value)) {
      return conn.reply(m.chat, `❌ *Uso incorrecto*\n\nEjemplo:\n${usedPrefix}ratelimit set minute 15\n${usedPrefix}ratelimit set hour 100\n${usedPrefix}ratelimit set cooldown 3000`, m);
    }

    const configMap = {
      'minute': 'maxMessagesPerMinute',
      'hour': 'maxTotalPerHour',
      'cooldown': 'cooldownBetweenMessages'
    };

    const configKey = configMap[param];
    if (!configKey) {
      return conn.reply(m.chat, `❌ *Parámetro inválido*\n\nUsa: minute, hour, o cooldown`, m);
    }

    const newConfig = {};
    newConfig[configKey] = value;
    updateConfig(newConfig);

    return conn.reply(m.chat, `✅ *Configuración actualizada*\n\n${param}: ${value}`, m);
  }

  if (action === 'reset') {
    let targetJid = args[1];
    
    if (!targetJid) {
      if (m.quoted && m.quoted.sender) {
        targetJid = m.quoted.sender;
      } else {
        return conn.reply(m.chat, `❌ *Debes especificar un usuario*\n\nEjemplo:\n${usedPrefix}ratelimit reset 5493483466763\n${usedPrefix}ratelimit reset @usuario`, m);
      }
    }

    // Limpiar el número
    targetJid = targetJid.replace(/[^0-9]/g, '');
    if (targetJid.length < 10) {
      return conn.reply(m.chat, '❌ *Número inválido*', m);
    }

    const jid = `${targetJid}@s.whatsapp.net`;
    resetUser(jid);

    return conn.reply(m.chat, `✅ *Rate-limiting reseteado para ${targetJid}*`, m);
  }

  if (action === 'stats') {
    let targetJid = args[1];
    
    if (!targetJid) {
      if (m.quoted && m.quoted.sender) {
        targetJid = m.quoted.sender;
      } else {
        return conn.reply(m.chat, `❌ *Debes especificar un usuario*\n\nEjemplo:\n${usedPrefix}ratelimit stats 5493483466763\n${usedPrefix}ratelimit stats @usuario`, m);
      }
    }

    // Limpiar el número
    targetJid = targetJid.replace(/[^0-9]/g, '');
    if (targetJid.length < 10) {
      return conn.reply(m.chat, '❌ *Número inválido*', m);
    }

    const jid = `${targetJid}@s.whatsapp.net`;
    const stats = getStats(jid);

    let texto = `📊 *Estadísticas de Rate-Limiting*\n\n`;
    texto += `👤 *Usuario:* ${targetJid}\n`;
    texto += `📈 *Mensajes último minuto:* ${stats.messagesLastMinute}\n`;
    texto += `📈 *Mensajes última hora:* ${stats.messagesLastHour}\n`;
    texto += `⚠️ *Advertencias:* ${stats.warningCount}\n`;
    texto += `🚫 *Bloqueado:* ${stats.isBlocked ? '✅ Sí' : '❌ No'}\n`;
    
    if (stats.blockedUntil) {
      texto += `⏰ *Desbloqueo:* ${stats.blockedUntil.toLocaleString()}\n`;
    }

    return conn.reply(m.chat, texto, m);
  }

  if (action === 'resetwarmup') {
    let targetJid = args[1];

    if (!targetJid) {
      resetWarmup();
      return conn.reply(m.chat, `✅ *Warm-up global reseteado*\n\nSe vació el contador diario del número. Ya no queda nadie bloqueado por el tope global de hoy.`, m);
    }

    // Limpiar el número
    targetJid = targetJid.replace(/[^0-9]/g, '');
    if (targetJid.length < 10) {
      return conn.reply(m.chat, '❌ *Número inválido*', m);
    }

    const jid = `${targetJid}@s.whatsapp.net`;
    resetWarmup(jid);

    return conn.reply(m.chat, `✅ *Warm-up individual reseteado para ${targetJid}*`, m);
  }

  return conn.reply(m.chat, `❌ *Acción inválida*\n\nUsa: set, reset, stats, o resetwarmup`, m);
};

handler.command = /^(ratelimit|rate-limit|limitprivado)$/i;
handler.owner = true;
handler.tags = ['owner'];
handler.help = ['ratelimit', 'ratelimit set', 'ratelimit reset', 'ratelimit stats', 'ratelimit resetwarmup'];

export default handler;
