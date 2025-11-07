import { connectionManager } from "../lib/connection-manager.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";

let handler = async (m, { conn, usedPrefix }) => {
  try {
    const subBotDir = "./sub-lunabot/";
    
    if (!fs.existsSync(subBotDir)) {
      return m.reply("📋 *Lista de SubBots*\n\n❌ No hay SubBots activos en este momento.");
    }

    const userDirs = fs.readdirSync(subBotDir);
    const subbots = [];

    for (const dirName of userDirs) {
      const userPath = path.join(subBotDir, dirName);
      const credsPath = path.join(userPath, "creds.json");
      
      if (!fs.statSync(userPath).isDirectory()) continue;
      if (!fs.existsSync(credsPath)) continue;

      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));
        
        if (!creds.me) continue;

        const realNumber = creds.me.jid ? creds.me.jid.split('@')[0] : dirName;
        const userJid = `${realNumber}@s.whatsapp.net`;
        
        const isConnected = connectionManager.isConnected(dirName);

        if (isConnected) {
          let displayName = realNumber;
          try {
            const name = conn.getName(userJid);
            if (name && name !== realNumber && name.replace(/\D/g, "") !== realNumber) {
              displayName = name;
            }
          } catch (e) {
            displayName = realNumber;
          }

          const socket = connectionManager.getSocket(dirName);
          const status = socket?.user?.jid ? "🟢 Conectado" : "🟢 Activo";
          
          subbots.push({
            jid: userJid,
            displayName: displayName,
            userId: realNumber,
            dirName: dirName,
            status: status
          });
        }
      } catch (e) {
        console.log(chalk.yellow(`⚠️ Error leyendo creds de ${dirName}`));
        continue;
      }
    }

    if (subbots.length === 0) {
      return m.reply("📋 *Lista de SubBots*\n\n❌ No hay SubBots activos en este momento.");
    }

    let message = `📋 *Lista de SubBots Activos*\n\n`;
    message += `🤖 *Total:* ${subbots.length} SubBot${subbots.length > 1 ? 's' : ''}\n\n`;

    subbots.forEach((bot, index) => {
      message += `*${index + 1}.* ${bot.status}\n`;
      message += `   👤 ${bot.displayName}\n`;
      message += `   📱 +${bot.userId}\n`;
      message += `   @${bot.userId}\n\n`;
    });

    message += `\n💡 *Tip:* Usa *${usedPrefix}stopbot* para detener tu SubBot`;

    const mentions = subbots.map(bot => bot.jid);

    return conn.reply(m.chat, message, m, { mentions });

  } catch (error) {
    console.error(chalk.red("❌ Error en listasubbots:"), error);
    return m.reply("❌ Error al obtener la lista de SubBots.");
  }
};

handler.command = ["listasubbots", "listabots", "bots"];
handler.help = ["listasubbots"];
handler.tags = ["socket"];

export default handler;