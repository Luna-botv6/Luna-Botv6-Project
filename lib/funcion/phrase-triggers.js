import fs from 'fs';
import { phraseTriggersStore } from './phrase-triggers-store.js';
import { getGroupDataForPlugin, isAdminNoTTL, hasAdminCacheForGroup } from './pluginHelper.js';
import { puedeUsarComando } from './custom-command-group-permissions.js';

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

  const senderNum = conn.decodeJid(sender).replace('@s.whatsapp.net', '');
  const isLidOwner = global.lidOwners?.includes(senderNum);
  const isGlobalOwner = global.owner?.some(([num]) => num === senderNum);
  const isOwner = !!(isLidOwner || isGlobalOwner);

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

export async function manejarPhraseTriggers(conn) {
  const inicioBotTimestamp = Date.now();

  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      if (type !== 'notify') return;
      if (Date.now() - inicioBotTimestamp < 10000) return;

      for (const message of messages) {
        if (!message?.message) continue;
        if (message.key?.fromMe) continue;

        const chatId = message.key?.remoteJid;
        if (!chatId?.endsWith('@g.us')) continue;

        const texto = message.message?.conversation
          || message.message?.extendedTextMessage?.text
          || '';
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

        try {
          if (imagenPath && fs.existsSync(imagenPath)) {
            const buffer = fs.readFileSync(imagenPath);
            await conn.sendMessage(chatId, { image: buffer, caption: mensajeAResponder }, { quoted: message });
          } else {
            await conn.sendMessage(chatId, { text: mensajeAResponder }, { quoted: message });
          }
        } catch {}
      }
    } catch (e) {}
  });
}
