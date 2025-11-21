import fs from "fs";
import path from "path";
import chalk from "chalk";
import { connectionManager } from "../lib/connection-manager.js";

const handler = (m) => m;


handler.all = async function (m, { conn }) {

  return !0;
};

export default handler;

export async function autoreconnectSubbots(mainConn) {
  console.log(chalk.blue("🔄 Iniciando restauración de sesiones..."));

  const subBotDir = "./sub-lunabot/";

  if (!fs.existsSync(subBotDir)) {
    console.log(chalk.yellow("📁 No hay sesiones guardadas"));
    return;
  }

  try {
    const userDirs = fs.readdirSync(subBotDir);
    const validSessions = [];

    for (const userId of userDirs) {
      const userPath = path.join(subBotDir, userId);

      if (!fs.statSync(userPath).isDirectory()) continue;

      const credsPath = path.join(userPath, "creds.json");
      if (!fs.existsSync(credsPath)) continue;

      try {
        const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));

        const hasValidData =
          creds &&
          (creds.me ||
            creds.account ||
            creds.signalIdentities ||
            creds.noiseKey ||
            creds.pairingEphemeralKeyPair ||
            creds.signedIdentityKey ||
            creds.registrationId ||
            Object.keys(creds).length > 8 ||
            JSON.stringify(creds).length > 1000);

        if (hasValidData) {
          const stats = fs.statSync(credsPath);
          const sessionAge = Date.now() - stats.mtime.getTime();
          const maxAge = 7 * 24 * 60 * 60 * 1000;

          if (sessionAge < maxAge) {
            validSessions.push({
              userId,
              userPath,
              sessionAge: Math.round(sessionAge / 1000 / 60 / 60),
            });
            console.log(
              chalk.green(
                `✅ Sesión válida: ${userId} (${Math.round(
                  sessionAge / 1000 / 60 / 60
                )}h)`
              )
            );
          } else {
            console.log(
              chalk.yellow(
                `🗑️ Sesión expirada: ${userId} (${Math.round(
                  sessionAge / 1000 / 60 / 60 / 24
                )} días)`
              )
            );
            fs.rmSync(userPath, { recursive: true, force: true });
          }
        } else {
          const credSize = JSON.stringify(creds || {}).length;
          const keyCount = Object.keys(creds || {}).length;

          if (!creds || (credSize < 50 && keyCount <= 2)) {
            console.log(
              chalk.yellow(`🗑️ Sesión vacía eliminada: ${userId}`)
            );
            fs.rmSync(userPath, { recursive: true, force: true });
          }
        }
      } catch (error) {
        console.log(chalk.red(`❌ Error procesando sesión: ${userId}`));

        try {
          const rawData = fs.readFileSync(credsPath, "utf8");
          if (rawData.length < 10) {
            fs.rmSync(userPath, { recursive: true, force: true });
            console.log(
              chalk.yellow(`🗑️ Archivo corrupto eliminado: ${userId}`)
            );
          }
        } catch (e) {
          fs.rmSync(userPath, { recursive: true, force: true });
          console.log(
            chalk.yellow(`🗑️ Archivo ilegible eliminado: ${userId}`)
          );
        }
      }
    }

    if (validSessions.length === 0) {
      console.log(chalk.green("✅ No hay sesiones para restaurar"));
      return;
    }

    console.log(
      chalk.blue(`📋 Sesiones encontradas: ${validSessions.length}`)
    );

    try {
      const imported = await import("./subbot.js");
      const initializeSubBot =
        imported.initializeSubBot || imported.default?.initializeSubBot;

      if (!initializeSubBot) {
        console.log(chalk.red("❌ Error: No se pudo importar el módulo"));
        return;
      }

      for (const session of validSessions) {
        try {
          console.log(
            chalk.blue(
              `🔄 Restaurando: ${session.userId} (${session.sessionAge}h)`
            )
          );

          const mockMessage = createMockMessage(mainConn, session.userId);

          await simulateSerbot(
            mockMessage,
            mainConn,
            initializeSubBot,
            session.userPath
          );

          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (error) {
          console.error(
            chalk.red(`❌ Error restaurando ${session.userId}`)
          );
        }
      }
    } catch (importError) {
      console.error(
        chalk.red(`❌ Error importando módulo: ${importError.message}`)
      );
      return;
    }

    setTimeout(async () => {
      try {
        const restoredCount = connectionManager
          ? connectionManager.getActiveConnectionCount()
          : 0;

        console.log(
          chalk.green(
            `✅ Restauración completada: ${restoredCount}/${validSessions.length} SubBots activos`
          )
        );
      } catch (error) {
        console.log(
          chalk.green(
            `✅ Proceso completado: ${validSessions.length} sesiones procesadas`
          )
        );
      }
    }, 10000);
  } catch (error) {
    console.error(chalk.red("❌ Error en restauración:"), error.message);
  }
}

function createMockMessage(mainConn, userId) {
  const senderJid = `${userId}@s.whatsapp.net`;
  const chatJid = mainConn.user?.jid || "status@broadcast";

  return {
    key: {
      remoteJid: chatJid,
      fromMe: false,
      id: `AUTO_RECONNECT_${userId}_${Date.now()}`,
      participant: senderJid,
    },
    message: {
      conversation: "/serbot",
      extendedTextMessage: {
        text: "/serbot",
      },
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
    sender: senderJid,
    chat: chatJid,
    fromMe: false,
    isGroup: false,
    mentionedJid: [],
    body: "/serbot",
    text: "/serbot",
    reply: async (text) => Promise.resolve(),
  };
}

async function simulateSerbot(
  mockMessage,
  mainConn,
  initializeSubBot,
  userPath
) {
  const userId = path.basename(userPath);

  if (!global.db) {
    global.db = { data: { users: {} } };
  }

  if (!global.db.data.users[mockMessage.sender]) {
    global.db.data.users[mockMessage.sender] = {
      Subs: 0,
      banned: false,
      premium: false,
      registered: false,
      language: "es",
    };
  }

  const oldSubsValue = global.db.data.users[mockMessage.sender].Subs;
  global.db.data.users[mockMessage.sender].Subs = 0;

  const options = {
    subbotPath: userPath,
    m: mockMessage,
    conn: mainConn,
    args: [],
    usedPrefix: "/",
    command: "serbot",
  };

  try {
    await initializeSubBot(options);
    global.db.data.users[mockMessage.sender].Subs = new Date() * 1;
    console.log(chalk.green(`✅ SubBot ${userId} reconectado`));
  } catch (error) {
    global.db.data.users[mockMessage.sender].Subs = oldSubsValue;
    console.error(chalk.red(`❌ Error reconectando ${userId}`));
    throw error;
  }
}

export async function validateAndCleanSessions() {
  const subBotDir = "./sub-lunabot/";

  if (!fs.existsSync(subBotDir)) return;

  try {
    const userDirs = fs.readdirSync(subBotDir);
    let cleanedCount = 0;

    for (const userId of userDirs) {
      const userPath = path.join(subBotDir, userId);
      const credsPath = path.join(userPath, "creds.json");

      if (!fs.statSync(userPath).isDirectory()) continue;

      let shouldDelete = false;
      let reason = "";

      if (!fs.existsSync(credsPath)) {
        shouldDelete = true;
        reason = "sin credenciales";
      } else {
        try {
          const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));

          const hasNoValidData =
            !creds ||
            (Object.keys(creds).length <= 2 &&
              !creds.me &&
              !creds.account &&
              !creds.signalIdentities &&
              !creds.noiseKey &&
              !creds.pairingEphemeralKeyPair &&
              !creds.signedIdentityKey &&
              !creds.registrationId &&
              JSON.stringify(creds).length < 50);

          if (hasNoValidData) {
            shouldDelete = true;
            reason = "sin datos válidos";
          } else {
            const stats = fs.statSync(credsPath);
            const sessionAge = Date.now() - stats.mtime.getTime();
            const maxAge = 7 * 24 * 60 * 60 * 1000;

            if (sessionAge > maxAge) {
              shouldDelete = true;
              reason = `expirado (${Math.round(
                sessionAge / 1000 / 60 / 60 / 24
              )} días)`;
            }
          }
        } catch (error) {
          try {
            const rawData = fs.readFileSync(credsPath, "utf8");
            if (rawData.length < 10) {
              shouldDelete = true;
              reason = "archivo corrupto";
            }
          } catch (e) {
            shouldDelete = true;
            reason = "ilegible";
          }
        }
      }

      if (shouldDelete) {
        try {
          fs.rmSync(userPath, { recursive: true, force: true });
          console.log(
            chalk.yellow(`🗑️ Sesión eliminada: ${userId} (${reason})`)
          );
          cleanedCount++;
        } catch (error) {
          console.log(chalk.red(`❌ Error eliminando ${userId}`));
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(
        chalk.green(
          `✅ Limpieza completada: ${cleanedCount} sesiones eliminadas`
        )
      );
    }
  } catch (error) {
    console.error(chalk.red("❌ Error en validación de sesiones"));
  }
}


setInterval(validateAndCleanSessions, 60 * 60 * 1000);
