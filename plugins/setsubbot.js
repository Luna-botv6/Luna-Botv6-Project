import fs from 'fs';
import { menuPathsFor, ensureMenuDir } from '../lib/funcion/menu-media.js';
import { idSubbotDe, leerIdentidad, guardarIdentidad, esDuenoSubbot, digitos } from '../lib/funcion/subbot-seguridad.js';
import { dbDelSubbot } from '../lib/funcion/subbot-db.js';

async function guardarNombre(userId, conn, nombre) {
  guardarIdentidad(userId, { nombre });
  try {
    const db = await dbDelSubbot(userId);
    const jid = conn?.user?.jid || `${userId}@s.whatsapp.net`;
    if (!db.data.settings) db.data.settings = {};
    if (!db.data.settings[jid]) db.data.settings[jid] = {};
    db.data.settings[jid].botName = nombre;
    await db.write().catch(() => {});
  } catch {}
}

const handler = async (m, { conn, args, text }) => {
  if (!conn?.isSubBot) return m.reply('❌ Este comando solo funciona en un SubBot.');
  const userId = idSubbotDe(conn);
  if (!userId) return m.reply('❌ No se pudo identificar este SubBot.');
  if (!esDuenoSubbot(m, conn)) return m.reply('🔒 Solo el dueño del SubBot puede cambiar su identidad.');

  const sub = String(args?.[0] || '').toLowerCase();
  const identidad = leerIdentidad(userId) || {};
  const nombreActual = identidad.nombre || conn?.user?.name || 'Luna-Botv6';

  if (!sub || sub === 'ver') {
    const { img } = menuPathsFor(conn);
    const tieneFoto = fs.existsSync(img);
    return m.reply(`🤖 *Identidad del SubBot*\n\n📛 Nombre: *${nombreActual}*\n🖼️ Foto de menú: ${tieneFoto ? '✅ puesta' : '❌ no puesta'}\n📱 Número: +${digitos(conn?.user?.jid) || userId}\n\nUsá:\n• *.setsubbot nombre <nombre>*\n• *.setsubbot foto* (respondiendo una imagen)\n• *.setsubbot borrarfoto*`);
  }

  if (sub === 'nombre') {
    const nombre = String(text || '').replace(/^\s*nombre\s*/i, '').trim();
    if (!nombre) return m.reply('❓ Uso: *.setsubbot nombre <nombre>*\nEjemplo: *.setsubbot nombre Luna Azul*');
    if (nombre.length > 40) return m.reply('⚠️ Nombre muy largo (máx 40 caracteres).');
    await guardarNombre(userId, conn, nombre);
    return m.reply(`✅ SubBot renombrado a *${nombre}*.`);
  }

  if (sub === 'foto') {
    const q = m.quoted || null;
    if (!q || !/image/.test(q?.mtype || '')) {
      return m.reply('❓ Respondé con *.setsubbot foto* a la imagen que querés de menú.');
    }
    try {
      const buffer = await q.download();
      if (!buffer) return m.reply('❌ No se pudo descargar la imagen.');
      await ensureMenuDir(conn);
      const { img } = menuPathsFor(conn);
      fs.writeFileSync(img, buffer);
      return m.reply('✅ Foto de menú actualizada.');
    } catch (e) {
      return m.reply(`❌ Error guardando la foto: ${e.message}`);
    }
  }

  if (sub === 'borrarfoto') {
    try {
      const { img } = menuPathsFor(conn);
      if (fs.existsSync(img)) fs.unlinkSync(img);
      return m.reply('✅ Foto de menú eliminada. Se usa la del bot principal.');
    } catch (e) {
      return m.reply(`❌ Error: ${e.message}`);
    }
  }

  return m.reply('❓ Uso:\n• *.setsubbot ver*\n• *.setsubbot nombre <nombre>*\n• *.setsubbot foto* (respondiendo imagen)\n• *.setsubbot borrarfoto*');
};

handler.command = ['setsubbot'];
handler.help = ['setsubbot ver', 'setsubbot nombre <nombre>', 'setsubbot foto'];
handler.tags = ['socket'];

export default handler;
