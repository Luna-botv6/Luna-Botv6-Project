import { connectionManager } from "../lib/funcion/connection-manager.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender;

  let id;
  if (m.isGroup) {
    const groupMetadata = conn.chats[m.chat]?.metadata ||
      await conn.groupMetadata(m.chat).catch(_ => null) || {};
    const participants = groupMetadata.participants || [];
    const participantData = participants.find(u =>
      conn.decodeJid(u.id) === who ||
      u.id === who ||
      u.lid === who
    );
    id = (participantData?.id || who).split('@')[0];
  } else {
    id = who.split('@')[0];
  }

  if (!id) {
    return m.reply("❌ No se pudo resolver tu número real.");
  }

  let subbotPath = path.join(`./sub-lunabot/`, id);

  if (command === "stopbot" || command === "stop") {
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
    if (!fs.existsSync(subbotPath)) {
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
