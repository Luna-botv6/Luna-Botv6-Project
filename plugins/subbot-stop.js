import { connectionManager } from "../lib/funcion/connection-manager.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";

function findSubbotIdByPhone(phoneNumber) {
  const subBotDir = "./sub-lunabot/";
  if (!fs.existsSync(subBotDir)) return null;

  const dirs = fs.readdirSync(subBotDir);

  if (dirs.includes(phoneNumber)) return phoneNumber;

  for (const dirName of dirs) {
    const credsPath = path.join(subBotDir, dirName, "creds.json");
    if (!fs.existsSync(credsPath)) continue;
    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));
      if (!creds.me?.jid) continue;
      const credsPhone = creds.me.jid.split("@")[0];
      if (credsPhone === phoneNumber) return dirName;
    } catch (e) {}
  }

  return null;
}

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender;

  let resolvedPhone;
  if (m.isGroup) {
    const groupMetadata = conn.chats[m.chat]?.metadata ||
      await conn.groupMetadata(m.chat).catch(_ => null) || {};
    const participants = groupMetadata.participants || [];
    const participantData = participants.find(u =>
      conn.decodeJid(u.id) === who ||
      u.id === who ||
      u.lid === who
    );
    resolvedPhone = (participantData?.id || who).split('@')[0];
  } else {
    resolvedPhone = who.split('@')[0];
  }

  if (!resolvedPhone) {
    return m.reply("❌ No se pudo resolver tu número real.");
  }

  const id = findSubbotIdByPhone(resolvedPhone);
  const subbotPath = path.join(`./sub-lunabot/`, id || resolvedPhone);

  if (command === "stopbot" || command === "stop") {
    if (!id) {
      return m.reply("❌ No tienes un SubBot activo para detener.");
    }

    const socket = connectionManager.getSocket(id);

    if (!socket) {
      return m.reply("❌ No tienes un SubBot activo para detener.");
    }

    if (!connectionManager.isConnected(id)) {
      return m.reply("⚠️ Tu SubBot no está conectado actualmente.");
    }

    try {
      console.log(chalk.yellow(`🛑 Deteniendo SubBot: ${id}`));

      if (socket?.ws?.socket) {
        socket.ws.close();
      }

      if (socket?.ev) {
        socket.ev.removeAllListeners();
      }

      connectionManager.removeConnection(id);

      console.log(chalk.green(`✅ SubBot ${id} detenido correctamente`));
      return m.reply(`✅ SubBot detenido correctamente.\n\n💡 *Tip:* Usa *${usedPrefix}deletebot* para eliminar la sesión completamente.`);
    } catch (error) {
      console.error(chalk.red(`❌ Error deteniendo SubBot ${id}:`), error);
      return m.reply(`❌ Error al detener el SubBot: ${error.message}`);
    }
  }

  if (command === "deletebot" || command === "delbot") {
    if (!id || !fs.existsSync(subbotPath)) {
      return m.reply("❌ No tienes una sesión de SubBot para eliminar.");
    }

    try {
      console.log(chalk.yellow(`🗑️ Eliminando sesión de SubBot: ${id}`));

      const socket = connectionManager.getSocket(id);
      if (socket) {
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
      }

      connectionManager.removeConnection(id);

      await fs.promises.rm(subbotPath, { recursive: true, force: true });

      console.log(chalk.green(`✅ Sesión de SubBot ${id} eliminada correctamente`));
      return m.reply(`✅ Sesión de SubBot eliminada correctamente.\n\n🤖 Usa *${usedPrefix}serbot* para crear un nuevo SubBot.`);
    } catch (error) {
      console.error(chalk.red(`❌ Error eliminando sesión de SubBot ${id}:`), error);
      return m.reply(`❌ Error al eliminar la sesión: ${error.message}`);
    }
  }
};

handler.command = ["stopbot", "stop", "deletebot", "delbot"];
handler.help = ["stopbot", "deletebot"];
handler.tags = ["socket"];
export default handler;
