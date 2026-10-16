import * as manager from '../lib/funcion/subbot-manager.js';
import { leerIdentidad } from '../lib/funcion/subbot-seguridad.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

let handler = async (m, { conn, usedPrefix }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.listasubbots || {};
  try {
    const subBotDir = './sub-lunabot/';

    if (!fs.existsSync(subBotDir)) {
      return m.reply((t.sin_subbots || '📋 *Lista de SubBots*\n\n❌ No hay SubBots activos en este momento.'));
    }

    const userDirs = fs.readdirSync(subBotDir);
    const subbots = [];
    let guardados = 0;

    for (const dirName of userDirs) {
      const userPath = path.join(subBotDir, dirName);
      const credsPath = path.join(userPath, 'creds.json');

      if (!fs.statSync(userPath).isDirectory()) continue;
      if (!fs.existsSync(credsPath)) continue;

      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

        if (!creds.me) continue;

        let realNumber;
        if (creds.me.jid && !creds.me.jid.endsWith('@lid')) {
          realNumber = creds.me.jid.split('@')[0];
        } else {
          realNumber = dirName;
        }

        const userJid = `${realNumber}@s.whatsapp.net`;
        const nombrePropio = leerIdentidad(dirName)?.nombre;

        if (manager.conectado(dirName)) {
          let displayName = nombrePropio || realNumber;
          if (!nombrePropio) {
            try {
              const name = conn.getName(userJid);
              if (name && name !== realNumber && name.replace(/\D/g, '') !== realNumber) {
                displayName = name;
              }
            } catch {}
          }

          const socket = manager.socketDe(dirName);
          const status = socket?.user?.jid ? (t.conectado || '🟢 Conectado') : (t.activo || '🟢 Activo');

          subbots.push({ jid: userJid, displayName, userId: realNumber, dirName, status });
        } else {
          guardados++;
        }
      } catch (e) {
        console.log(chalk.yellow(`⚠️ Error leyendo creds de ${dirName}`));
        continue;
      }
    }

    if (subbots.length === 0) {
      const extra = guardados > 0 ? `\n\n💾 Hay ${guardados} sesión(es) guardada(s) pero desconectadas.` : '';
      return m.reply((t.sin_subbots || '📋 *Lista de SubBots*\n\n❌ No hay SubBots activos en este momento.') + extra);
    }

    let message = (t.titulo_activos || '📋 *Lista de SubBots Activos*\n\n');
    message += (t.total?.replace('{cantidad}', subbots.length) || `🤖 *Total conectados:* ${subbots.length} SubBot${subbots.length > 1 ? 's' : ''}\n`);
    if (guardados > 0) message += `💾 *Guardados:* ${guardados}\n`;
    message += '\n';

    subbots.forEach((bot, index) => {
      message += (t.item_num?.replace('{num}', index + 1).replace('{estado}', bot.status) || `*${index + 1}.* ${bot.status}`) + '\n';
      message += (t.item_nombre?.replace('{nombre}', bot.displayName) || `   👤 ${bot.displayName}`) + '\n';
      message += (t.item_numero?.replace('{numero}', bot.userId) || `   📱 +${bot.userId}`) + '\n';
      message += `   @${bot.userId}\n\n`;
    });

    message += (t.tip?.replace('{prefix}', usedPrefix) || `\n💡 *Tip:* Usa *${usedPrefix}stopbot* para detener tu SubBot`);

    const mentions = subbots.map((bot) => bot.jid);

    return conn.reply(m.chat, message, m, { mentions });
  } catch (error) {
    console.error(chalk.red('❌ Error en listasubbots:'), error);
    return m.reply((t.error || '❌ Error al obtener la lista de SubBots.'));
  }
};

handler.command = ['listasubbots', 'listabots', 'bots'];
handler.help = ['listasubbots'];
handler.tags = ['socket'];

export default handler;
