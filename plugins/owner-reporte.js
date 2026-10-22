import { getOwnerNumbers } from '../lib/funcion/system-owners.js';
import { idCanonico } from '../lib/identidad.js';

const COOLDOWN_MS = 60 * 1000;
const cooldowns = new Map();
const LOCALES = { es: 'es-AR', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', ru: 'ru-RU', ar: 'ar-SA' };

function limpiar(texto, max) {
  const limpio = String(texto || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
}

function render(tpl, fallback, valores) {
  let out = tpl || fallback;
  for (const [k, v] of Object.entries(valores)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

function destinosOwner() {
  return getOwnerNumbers()
    .map((n) => String(n).replace(/\D/g, ''))
    .filter((n) => n.length >= 5)
    .map((n) => `${n}@s.whatsapp.net`);
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const idioma = global.getIdioma?.(m) || 'es';
  const _tr = await global.loadTranslation(idioma);
  const t = _tr?.plugins?.owner_reporte || {};

  if (!text || !text.trim()) {
    throw (
      (t.ayuda ? t.ayuda
        .split('{comando}').join(usedPrefix + command)
        .split('{prefix}').join(usedPrefix) : null) ||
      '╭─「 *📋 REPORTE AL OWNER* 」\n' +
      '│\n' +
      '│ Enviá tu reporte así:\n' +
      `│ *${usedPrefix + command}* _descripción del problema_\n` +
      '│\n' +
      '│ 📌 Si es un bug de un comando incluí el prefijo:\n' +
      `│ *${usedPrefix + command}* El comando *${usedPrefix}play* no funciona\n` +
      '╰─'
    );
  }

  const descripcion = limpiar(text, 1000);
  if (descripcion.length < 10) throw (t.muy_corto || '⚠️ El reporte es muy corto. Describí el problema con más detalle.');
  if (text.length > 1000) throw (t.muy_largo || '⚠️ El reporte supera los 1000 caracteres. Resumí un poco.');

  const realJid = idCanonico(m.sender) || m.sender;
  const numero = String(realJid).includes('@lid') ? null : String(realJid).split('@')[0];
  const numeroVisible = numero || (t.desconocido || 'desconocido');

  const ultimo = cooldowns.get(realJid) || 0;
  const falta = COOLDOWN_MS - (Date.now() - ultimo);
  if (falta > 0) {
    throw render(t.espera, '⏳ Esperá *{seg}* segundos antes de mandar otro reporte.', { seg: Math.ceil(falta / 1000) });
  }

  let grupoNombre = (t.chat_privado || 'Chat privado');
  if (m.isGroup) {
    try {
      const meta = await conn.groupMetadata(m.chat);
      grupoNombre = limpiar(meta?.subject || m.chat, 60);
    } catch {}
  }

  const ahora = new Date();
  const locale = LOCALES[idioma] || 'es-AR';
  const fecha = ahora.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = ahora.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const ticket = `R-${ahora.getTime().toString(36).toUpperCase().slice(-6)}`;
  const cmdMatch = descripcion.match(/[!./,;]([a-zA-Z0-9]+)/);
  const comandoDetectado = cmdMatch ? cmdMatch[0] : null;

  let teks =
    (t.titulo_reporte || '╭─「 *🚨 NUEVO REPORTE* 」') + '\n' +
    '│\n' +
    render(t.linea_usuario, '├ 👤 *Usuario:* @{numero}', { numero: numeroVisible }) + '\n' +
    (numero ? render(t.linea_numero, '├ 📱 *Número:* wa.me/{numero}', { numero }) + '\n' : '') +
    render(t.linea_origen, '├ 📍 *Origen:* {origen}', { origen: grupoNombre }) + '\n' +
    render(t.linea_fecha, '├ 📅 *Fecha:* {fecha} — {hora}', { fecha, hora }) + '\n' +
    render(t.linea_ticket, '├ 🎫 *Ticket:* {ticket}', { ticket }) + '\n';

  if (comandoDetectado) {
    teks += render(t.linea_comando, '├ 🔧 *Comando reportado:* {comando}', { comando: comandoDetectado }) + '\n';
  }

  teks +=
    '│\n' +
    (t.linea_descripcion || '├ 📝 *Descripción:*') + '\n' +
    `│ ${descripcion}\n`;

  const citado = limpiar(m.quoted?.text || '', 200);
  if (citado) {
    teks +=
      '│\n' +
      (t.linea_mensaje_citado || '├ 💬 *Mensaje citado:*') + '\n' +
      `│ ${citado}\n`;
  }

  teks += '╰─';

  const destinos = destinosOwner();
  if (!destinos.length) throw (t.sin_destino || '⚠️ No hay ningún owner configurado para recibir reportes.');

  let entregados = 0;
  for (const jid of destinos) {
    try {
      await conn.sendMessage(jid, numero ? { text: teks, mentions: [realJid] } : { text: teks });
      entregados++;
    } catch {}
  }
  if (!entregados) throw (t.sin_destino || '⚠️ No hay ningún owner configurado para recibir reportes.');

  cooldowns.set(realJid, Date.now());
  m.reply((t.enviado || '✅ Tu reporte fue enviado correctamente.\n\nGracias por reportar, lo revisaremos a la brevedad 🙏') + `\n\n🎫 *${ticket}*`);
};

handler.help = ['reporte <mensaje>', 'report <mensaje>'];
handler.tags = ['info'];
handler.command = /^(report|request|reporte|bugs|bug|report-owner|reportes)$/i;

export default handler;
