import fs from 'fs';
import chalk from 'chalk';
import { phraseTriggersStore } from './phrase-triggers-store.js';
import { getGroupDataForPlugin, isAdminNoTTL, hasAdminCacheForGroup } from './pluginHelper.js';
import { puedeUsarComando } from './custom-command-group-permissions.js';
import { buttonActions } from './button-actions.js';
import { esBotIgnorado, MARCA_LUNA } from './botsIgnorados.js';
import { isProtectedOwner } from './ownerGuard.js';

function normalizar(texto) {
  return (texto || '').toLowerCase().trim();
}

function encontrarDisparador(textoNormalizado) {
  const activos = phraseTriggersStore.listarActivos();
  for (const disparador of activos) {
    const coincide = disparador.frases.some((frase) => {
      const fraseNorm = normalizar(frase);
      return fraseNorm && textoNormalizado.includes(fraseNorm);
    });
    if (coincide) return disparador;
  }
  return null;
}

async function tienePermiso(conn, chatId, sender, permiso) {
  if (permiso === 'todos') return true;

  const isOwner = isProtectedOwner(sender, null, conn);

  if (permiso === 'owner') return isOwner;

  if (permiso === 'admin') {
    if (isOwner) return true;
    const isAdmin = hasAdminCacheForGroup(chatId)
      ? isAdminNoTTL(chatId, sender)
      : (await getGroupDataForPlugin(conn, chatId, sender)).isAdmin;
    return !!isAdmin;
  }

  return false;
}

let _phraseTriggersHandler = null;

export async function manejarPhraseTriggers(conn) {
  const inicioBotTimestamp = Date.now();

  if (_phraseTriggersHandler) conn.ev.off('messages.upsert', _phraseTriggersHandler);
  _phraseTriggersHandler = async ({ messages, type }) => {
    try {
      if (type !== 'notify') return;
      if (Date.now() - inicioBotTimestamp < 10000) return;

      for (const message of messages) {
        if (!message?.message) continue;
        if (message.key?.fromMe) continue;

        const esRespuestaDeBoton = !!(
          message.message.buttonsResponseMessage
          || message.message.templateButtonReplyMessage
          || message.message.listResponseMessage
          || message.message.interactiveResponseMessage
        );
        if (esRespuestaDeBoton) continue;

        const chatId = message.key?.remoteJid;
        const senderJid = message.key?.participant || message.key?.remoteJid;
        const texto = message.message?.conversation
          || message.message?.extendedTextMessage?.text
          || '';
        if (texto.includes(MARCA_LUNA)) continue;
        if (esBotIgnorado(senderJid, chatId)) {
          console.log(chalk.cyan(`[Ignorado] usuario posible bot ${String(senderJid).replace(/[^0-9]/g, '')}${chatId ? ` en chat ${chatId}` : ''}`));
          continue;
        }

        if (!chatId?.endsWith('@g.us')) continue;

        if (!texto) continue;

        const textoNormalizado = normalizar(texto);
        const disparador = encontrarDisparador(textoNormalizado);
        if (!disparador) continue;

        if (!puedeUsarComando(disparador.id, chatId)) continue;

        const sender = message.key.participant || message.key.remoteJid;
        if (!sender) continue;

        const permitido = await tienePermiso(conn, chatId, sender, disparador.permiso);
        if (!permitido) continue;

        let mensajeAResponder = disparador.mensajePrincipal;
        let imagenPath = disparador.imagenPrincipalPath;

        if (disparador.repetirDistinto) {
          const visto = phraseTriggersStore.yaVisto(disparador.id, chatId, sender);
          if (visto) {
            mensajeAResponder = disparador.mensajeSecundario || disparador.mensajePrincipal;
            imagenPath = disparador.mensajeSecundario ? disparador.imagenSecundarioPath : disparador.imagenPrincipalPath;
          } else {
            phraseTriggersStore.marcarVisto(disparador.id, chatId, sender);
          }
        }

        if (!mensajeAResponder) continue;

        let botones = null;
        try { botones = buttonActions.armarBotones('frase', disparador.id); } catch {}

        try {
          if (imagenPath && fs.existsSync(imagenPath)) {
            const buffer = fs.readFileSync(imagenPath);
            await conn.sendMessage(chatId, { image: buffer, caption: mensajeAResponder, ...(botones ? { buttons: botones } : {}) }, { quoted: message });
          } else {
            await conn.sendMessage(chatId, { text: mensajeAResponder, ...(botones ? { buttons: botones } : {}) }, { quoted: message });
          }
        } catch {}
      }
    } catch (e) {}
  };
  conn.ev.on('messages.upsert', _phraseTriggersHandler);
}
