import { connectionManager } from '../lib/funcion/connection-manager.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  if (!isOwner) {
    return m.reply('❌ Este comando solo puede ser usado por el owner del bot.');
  }

  if (!args[0]) {
    return m.reply(`❓ *Uso del comando:*\n\n*${usedPrefix + command}* <número>\n\n*Ejemplo:*\n${usedPrefix + command} 5493483447772`);
  }

  let targetNumber = args[0].replace(/[^0-9]/g, '');

  if (!targetNumber) {
    return m.reply('❌ Número inválido. Usa solo números sin símbolos.');
  }

  const subBotDir = './sub-lunabot/';
  
  if (!fs.existsSync(subBotDir)) {
    return m.reply(`❌ No existe ningún SubBot con el número: +${targetNumber}`);
  }

  const userDirs = fs.readdirSync(subBotDir);
  let foundDir = null;
  let realNumber = null;

  for (const dirName of userDirs) {
    const userPath = path.join(subBotDir, dirName);
    const credsPath = path.join(userPath, 'creds.json');

    if (!fs.statSync(userPath).isDirectory()) continue;
    if (!fs.existsSync(credsPath)) continue;

    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      const number = creds.me?.jid ? creds.me.jid.split('@')[0] : null;

      if (number === targetNumber) {
        foundDir = dirName;
        realNumber = number;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!foundDir) {
    return m.reply(`❌ No existe ningún SubBot con el número: +${targetNumber}`);
  }

  const subbotPath = path.join(subBotDir, foundDir);
  const socket = connectionManager.getSocket(foundDir);
  const isConnected = connectionManager.isConnected(foundDir);

  try {
    console.log(chalk.yellow(`🔨 Owner eliminando SubBot: ${realNumber} (${foundDir})`));

    if (socket || isConnected) {
      console.log(chalk.blue(`🔌 Cerrando conexión de ${realNumber}...`));
      
      try {
        if (socket?.ws?.socket) {
          socket.ws.close();
        }
        if (socket?.ev) {
          socket.ev.removeAllListeners();
        }
      } catch (e) {
        console.log(chalk.yellow(`⚠️ Error cerrando socket: ${e.message}`));
      }

      connectionManager.removeConnection(foundDir);
      console.log(chalk.green(`✅ Conexión de ${realNumber} cerrada`));
    }

    if (fs.existsSync(subbotPath)) {
      console.log(chalk.blue(`🗑️ Eliminando carpeta de sesión de ${realNumber}...`));
      await fs.promises.rm(subbotPath, { recursive: true, force: true });
      console.log(chalk.green(`✅ Carpeta de ${realNumber} eliminada`));
    }

    const userJid = `${realNumber}@s.whatsapp.net`;
    let displayName = realNumber;
    try {
      const name = conn.getName(userJid);
      if (name && name !== realNumber) {
        displayName = `${name} (+${realNumber})`;
      } else {
        displayName = `+${realNumber}`;
      }
    } catch (e) {
      displayName = `+${realNumber}`;
    }

    console.log(chalk.green(`✅ SubBot ${realNumber} eliminado completamente por el owner`));

    return m.reply(
      '✅ *SubBot eliminado exitosamente*\n\n' +
      `👤 Usuario: ${displayName}\n` +
      `📱 Número: +${realNumber}\n` +
      `📁 Carpeta: ${foundDir}\n\n` +
      `${isConnected ? '🔌 Conexión cerrada\n' : ''}` +
      '🗑️ Sesión eliminada\n\n' +
      `El usuario deberá usar *${usedPrefix}serbot* para crear un nuevo SubBot.`
    );

  } catch (error) {
    console.error(chalk.red(`❌ Error eliminando SubBot ${realNumber}:`), error);
    return m.reply(`❌ Error al eliminar el SubBot: ${error.message}`);
  }
};

handler.command = ['kickbot', 'eliminarbot'];
handler.help = ['kickbot <número>'];
handler.tags = ['socket'];
handler.owner = true;

export default handler;