/**
 * 📣 Plugin de Difusión — Solo grupos
 * Comandos: bc, broadcast, comunicar, comunicado, broadcastall, bcgc, bcgc2, informaragrupos
 * Acceso: Solo owner
 * Envía ÚNICAMENTE a grupos (@g.us) donde esté el bot, nunca a chats privados.
 */

import fs from 'fs';

const BOT = () => global.BotName || 'Luna';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const DELAY_ENTRE_ENVIOS = 2500; // ms entre cada grupo

const handler = async (m, { conn, text, usedPrefix, command }) => {
  // ── Protección: solo owner ──────────────────────────────────────────
  const isOwner =
    global.db?.data?.users?.[m.sender]?.isOwner ||
    (Array.isArray(global.owner) && global.owner.some((o) => m.sender.startsWith(o[0])));

  if (!isOwner) {
    return conn.reply(m.chat, `❌ Este comando es exclusivo del *Owner*.`, m);
  }

  // ── Obtener el mensaje a difundir ────────────────────────────────────
  const esCitado = !!m.quoted;
  const mensajeTexto = m.quoted?.text || text;

  if (!mensajeTexto && !esCitado) {
    return conn.reply(
      m.chat,
      `📣 *Difusión — ${BOT()}*\n\n` +
        `Uso:\n` +
        `› *${usedPrefix}${command} <mensaje>*  → texto\n` +
        `› Responde un mensaje + *${usedPrefix}${command}*  → reenvía ese mensaje\n\n` +
        `Solo se envía a los grupos donde está el bot.\n` +
        `Delay entre envíos: ${DELAY_ENTRE_ENVIOS / 1000}s`,
      m
    );
  }

  // ── Obtener solo grupos ──────────────────────────────────────────────
  let grupoIds = [];
  try {
    const allGroups = await conn.groupFetchAllParticipating();
    grupoIds = Object.keys(allGroups).filter((jid) => jid.endsWith('@g.us'));
  } catch {
    return conn.reply(m.chat, '❌ No se pudieron obtener los grupos del bot.', m);
  }

  if (!grupoIds.length) {
    return conn.reply(m.chat, '❌ El bot no está en ningún grupo.', m);
  }

  // ── Confirmación de inicio ───────────────────────────────────────────
  await conn.reply(
    m.chat,
    `📣 *${BOT()}* — Iniciando difusión a *${grupoIds.length}* grupos...\n⏳ Delay: ${DELAY_ENTRE_ENVIOS / 1000}s por grupo`,
    m
  );

  let enviados = 0;
  let fallidos = 0;

  // ── Envío ─────────────────────────────────────────────────────────────
  for (const gid of grupoIds) {
    try {
      if (esCitado && m.quoted?.fakeObj) {
        // Reenvío de mensaje citado (texto, imagen, video, audio, etc.)
        await conn.sendMessage(gid, { forward: m.quoted.fakeObj });
      } else {
        // Texto plano con encabezado del bot
        const cuerpo =
          `*📣 Comunicado oficial — ${BOT()}*\n\n` +
          `${mensajeTexto}\n\n` +
          `⭐ Gracias por estar aquí.`;
        await conn.sendMessage(gid, { text: cuerpo });
      }
      enviados++;
    } catch {
      fallidos++;
    }
    await delay(DELAY_ENTRE_ENVIOS);
  }

  // ── Reporte final ────────────────────────────────────────────────────
  await conn.reply(
    m.chat,
    `✅ *Difusión completada*\n\n` +
      `📤 Enviados: *${enviados}*\n` +
      `❌ Fallidos: *${fallidos}*\n` +
      `📊 Total grupos: *${grupoIds.length}*`,
    m
  );
};

handler.help = ['bc <mensaje>', 'broadcast <mensaje>', 'comunicar <mensaje>', 'informaragrupos <mensaje>'];
handler.tags = ['owner'];
handler.command = /^(bc|broadcast|broadcastall|comunicar|comunicado|bcgc|bcgc2|informaragrupos)$/i;
handler.owner = true;

export default handler;
