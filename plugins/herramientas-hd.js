import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

const PICWISH_KEY = 'wx7nsni3xk8655dxq';
const API_URL     = 'https://techhk.aoscdn.com/api/tasks/visual/scale';

async function createTask(imageBuffer) {
  const form = new FormData();
  form.append('image_file', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });

  const res  = await fetch(API_URL, {
    method:  'POST',
    headers: { 'X-API-KEY': PICWISH_KEY, ...form.getHeaders() },
    body:    form
  });
  const json = await res.json();
  if (!json?.data?.task_id) throw '❌ No se pudo crear la tarea en Picwish';
  return json.data.task_id;
}

async function pollResult(taskId, tries = 20, delay = 2000) {
  for (let i = 0; i < tries; i++) {
    await new Promise(r => setTimeout(r, delay));
    const res  = await fetch(`${API_URL}/${taskId}`, {
      headers: { 'X-API-KEY': PICWISH_KEY }
    });
    const json = await res.json();
    const data = json?.data;
    if (!data || data.state < 0) throw '❌ La tarea falló en Picwish';
    if (data.progress >= 100 && data.image) return data.image;
  }
  throw '⏰ Tiempo agotado esperando el resultado';
}

const handler = async (m, { conn, usedPrefix, command }) => {
  const idioma   = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const tradutor = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))?.plugins?.herramientas_hd;

  const isPrems = global.db?.data?.users?.[m.sender]?.premiumTime > 0;
  const isAdmin = m.isGroup
    ? (await (async () => { try { const meta = await conn.groupMetadata(m.chat); return meta.participants.find(p => p.id === m.sender)?.admin; } catch { return false; } })())
    : false;
  const ownerNums = (global.owner || []).map(o => String(Array.isArray(o) ? o[0] : o).replace(/\D/g, ''));
  const isOwner   = ownerNums.includes(m.sender.replace(/\D/g, ''));

  if (!isOwner && !isAdmin && !isPrems) {
    return m.reply('🌙 *Luna-Botv6-Project*\n\n⚠️ Este comando es solo para admins y usuarios premium 💎');
  }

  try {
    const q    = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || q.mediaType || '';

    if (!mime) throw `${tradutor?.texto1 || 'Enviá o respondé una imagen'} *${usedPrefix + command}*`;
    if (!/image\/(jpe?g|png|webp)/.test(mime)) throw `${tradutor?.texto2?.[0] || 'Solo imágenes'} (${mime})`;

    await m.reply(tradutor?.texto3 || '🔍 Mejorando imagen con IA, esperá un momento...');

    const imgBuffer = await q.download?.();
    if (!imgBuffer) throw tradutor?.texto4 || '❌ No se pudo descargar la imagen';

    const taskId   = await createTask(imgBuffer);
    const imageUrl = await pollResult(taskId);

    const result = await fetch(imageUrl);
    const buffer = Buffer.from(await result.arrayBuffer());

    await conn.sendMessage(m.chat, {
      image:   buffer,
      caption: '✨ *Imagen mejorada con IA* — Luna-Botv6'
    }, { quoted: m });

  } catch (e) {
    throw typeof e === 'string' ? e : (tradutor?.texto4 || '❌ Error al procesar la imagen');
  }
};

handler.help    = ['remini', 'hd', 'enhance'];
handler.tags    = ['ai', 'tools'];
handler.command = ['remini', 'hd', 'enhance'];
export default handler;