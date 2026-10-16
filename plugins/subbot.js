import { getConfig } from '../lib/funcConfig.js';
import { getLidMapping } from '../lib/stats.js';
import * as manager from '../lib/funcion/subbot-manager.js';
import { sistemaActivo } from '../lib/funcion/subbot-seguridad.js';
import { crearSubbot } from '../lib/funcion/subbot-socket.js';
import fs from 'fs';
import path from 'path';

function msToTime(ms) {
  const s = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
  const m = Math.floor((ms / 60000) % 60).toString().padStart(2, '0');
  return `${m}m ${s}s`;
}

const ayuda = (prefijo) => `🤖 *Ser SubBot de Luna*\n\nTu número se vuelve un bot con sus propios datos.\n\n🔢 *Por código (más fácil):*\n*${prefijo}serbot <tu número> --code*\nEj: *${prefijo}serbot 5493483466763 --code*\n\n📱 *Por QR (solo en privado):*\n*${prefijo}serbot*\n\n⚠️ No uses tu cuenta principal.`;

let handler = async (m, { conn, args, usedPrefix }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.subbot || {};
  if (!sistemaActivo()) return m.reply((t.sistema_desactivado || `❌ El sistema de SubBots está desactivado.`));

  const sender = m.sender;
  if (!global.db.data.users[sender]) global.db.data.users[sender] = {};
  const ultimo = global.db.data.users[sender].Subs || 0;

  if (Date.now() - ultimo < manager.COOLDOWN_MS) {
    return m.reply((t.cooldown?.replace('{tiempo}', msToTime(manager.COOLDOWN_MS - (Date.now() - ultimo))) || `⏳ Espera ${msToTime(manager.COOLDOWN_MS - (Date.now() - ultimo))} para volver a intentarlo.`));
  }

  const phoneArg = (args || []).find(a => /^[0-9]{7,15}$/.test(String(a || '').trim()));
  const quiereCode = (args || []).some(a => /(--code|^code$)/.test(String(a || '').trim()));

  if (!phoneArg && !quiereCode && m.isGroup) return m.reply(ayuda(usedPrefix));

  if (!await manager.hayEspacio()) {
    if (manager.conteoActivos() >= manager.MAX_SUBBOTS) return m.reply((t.sin_espacio || '❌ No hay espacio disponible para más SubBots.'));
    return m.reply('❌ RAM insuficiente ahora mismo. Probá de nuevo en unos minutos.');
  }

  let who = m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender);
  let userId;

  if (phoneArg) {
    userId = String(phoneArg).trim();
  } else if (m.isGroup) {
    const meta = conn.chats[m.chat]?.metadata || await conn.groupMetadata(m.chat).catch(() => ({}));
    const participant = (meta.participants || []).find(p => conn.decodeJid(p.id) === who || p.id === who || p.lid === who);
    const resolvedId = participant?.id || who;
    const cleanId = resolvedId.split('@')[0];
    userId = resolvedId.includes('@lid') || /^[0-9]{15,}$/.test(cleanId)
      ? (getLidMapping(resolvedId) || '').replace('@s.whatsapp.net', '') || cleanId
      : cleanId;
  } else {
    const cleanWho = who.split('@')[0];
    userId = who.includes('@lid')
      ? (getLidMapping(who) || '').replace('@s.whatsapp.net', '') || cleanWho
      : cleanWho;
  }

  if (!userId || userId.length > 13 || /^[0-9]{15,}$/.test(userId)) {
    return m.reply((t.lid_no_resuelto || `⚠️ Aún no conozco tu número real.\n\nMandame cualquier mensaje en privado y después usá:\n\n*${usedPrefix}serbot <tu número> --code*\nEjemplo: *${usedPrefix}serbot 5493483466763 --code*`));
  }

  if (manager.conectando(userId)) return m.reply((t.conexion_en_progreso || '⏳ Ya tienes una conexión en progreso.'));
  if (manager.conectado(userId)) return m.reply((t.ya_activo || '✅ Ya tienes un SubBot activo. Usa *.setsubbot* para personalizarlo.'));

  const subbotPath = path.join('./sub-lunabot/', userId);
  if (!fs.existsSync(subbotPath)) fs.mkdirSync(subbotPath, { recursive: true });

  global.db.data.users[sender].Subs = Date.now();

  await m.reply(quiereCode || phoneArg ? '🔢 Generando tu código de vinculación…' : '📱 Generando tu QR de vinculación…');
  crearSubbot({ subbotPath, m, conn, args, userId, dueno: sender }).catch(() => {});
};

handler.command = ['jadibot', 'serbot'];
handler.help = ['serbot', 'serbot <número> --code'];
handler.tags = ['socket'];
export default handler;
