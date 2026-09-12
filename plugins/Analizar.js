import axios from 'axios';

const IMAGGA_AUTH = 'Basic YWNjX2MyOGM4YzA1NDVkZjhjNjo1NTUxNzFkZWRmNDMzNDc1YmI1NzIxZjY5NzhmZTVmZQ==';

const handler = async (m, { conn }) => {
  const idioma = global.getIdioma?.(m) || 'es';
  const _tr = await global.loadTranslation(idioma);
  const t = _tr?.plugins?.analizar || {};
  const colores = t.colores || {};

  const traducirColor = (nombre) => {
    const clave = nombre.toLowerCase();
    for (const [en, traducido] of Object.entries(colores)) {
      if (clave.includes(en)) return nombre.replace(new RegExp(en, 'i'), traducido);
    }
    return nombre;
  };

  const msg = m.quoted || m;
  const mime = msg.mimetype || '';

  if (!mime.startsWith('image')) return m.reply(t.sin_imagen || 'Envía o cita una imagen 🖼️');

  m.reply(t.analizando || '⏳ Analizando imagen...');

  const media = await msg.download();
  const base64 = media.toString('base64');

  const params = new URLSearchParams({ image_base64: base64 });
  const paramsTags = new URLSearchParams({ image_base64: base64, language: idioma });

  const [tagsRes, colorsRes] = await Promise.all([
    axios.post('https://api.imagga.com/v2/tags', paramsTags, {
      headers: { Authorization: IMAGGA_AUTH }
    }),
    axios.post('https://api.imagga.com/v2/colors', params, {
      headers: { Authorization: IMAGGA_AUTH }
    })
  ]);

  const tags = tagsRes.data.result.tags
    .slice(0, 8)
    .map(tg => `› ${tg.tag[idioma] || tg.tag.en} — ${Math.round(tg.confidence)}%`)
    .join('\n');

  const coloresTexto = colorsRes.data.result.colors.image_colors
    .slice(0, 5)
    .map(c => `› ${traducirColor(c.closest_palette_color)} (${c.percent.toFixed(1)}%)`)
    .join('\n');

  const texto = (t.resultado || '🏷️ *Etiquetas detectadas:*\n{tags}\n\n🎨 *Colores predominantes:*\n{colores}')
    .replace('{tags}', tags)
    .replace('{colores}', coloresTexto);

  conn.sendFile(m.chat, media, 'analisis.jpg', texto, m);
};

handler.help = ['analizar', 'analyze'];
handler.tags = ['internet', 'tools'];
handler.command = /^(analizar|analyze|imginfo)$/i;
export default handler;
