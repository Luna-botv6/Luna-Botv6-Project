import axios from 'axios';

const IMAGGA_AUTH = 'Basic YWNjX2MyOGM4YzA1NDVkZjhjNjo1NTUxNzFkZWRmNDMzNDc1YmI1NzIxZjY5NzhmZTVmZQ==';

const coloresES = {
  black: 'Negro', white: 'Blanco', red: 'Rojo', green: 'Verde', blue: 'Azul',
  yellow: 'Amarillo', orange: 'Naranja', purple: 'Morado', pink: 'Rosa',
  brown: 'Café', grey: 'Gris', gray: 'Gris', cyan: 'Cian', magenta: 'Magenta',
  graphite: 'Grafito', almond: 'Almendra', fiesta: 'Fiesta', champagne: 'Champagne',
  cerulean: 'Cerúleo', navy: 'Azul marino', beige: 'Beige', coral: 'Coral',
  cream: 'Crema', gold: 'Dorado', silver: 'Plateado', teal: 'Verde azulado',
  maroon: 'Granate', olive: 'Oliva', ivory: 'Marfil', indigo: 'Índigo',
  violet: 'Violeta', turquoise: 'Turquesa', salmon: 'Salmón', khaki: 'Caqui',
  lavender: 'Lavanda', lilac: 'Lila', mint: 'Menta', peach: 'Durazno',
  tan: 'Tostado', crimson: 'Carmesí', amber: 'Ámbar', emerald: 'Esmeralda',
  jade: 'Jade', cobalt: 'Cobalto', mauve: 'Malva', taupe: 'Taupé',
  charcoal: 'Carbón', sand: 'Arena', rust: 'Óxido', mustard: 'Mostaza'
};

const traducirColor = (nombre) => {
  const clave = nombre.toLowerCase();
  for (const [en, es] of Object.entries(coloresES)) {
    if (clave.includes(en)) return nombre.replace(new RegExp(en, 'i'), es);
  }
  return nombre;
};

const handler = async (m, { conn }) => {
  const msg = m.quoted || m;
  const mime = msg.mimetype || '';

  if (!mime.startsWith('image')) return m.reply('Envía o cita una imagen 🖼️');

  m.reply('⏳ Analizando imagen...');

  const media = await msg.download();
  const base64 = media.toString('base64');

  const params = new URLSearchParams({ image_base64: base64 });
  const paramsEs = new URLSearchParams({ image_base64: base64, language: 'es' });

  const [tagsRes, colorsRes] = await Promise.all([
    axios.post('https://api.imagga.com/v2/tags', paramsEs, {
      headers: { Authorization: IMAGGA_AUTH }
    }),
    axios.post('https://api.imagga.com/v2/colors', params, {
      headers: { Authorization: IMAGGA_AUTH }
    })
  ]);

  const tags = tagsRes.data.result.tags
    .slice(0, 8)
    .map(t => `› ${t.tag.es || t.tag.en} — ${Math.round(t.confidence)}%`)
    .join('\n');

  const colors = colorsRes.data.result.colors.image_colors
    .slice(0, 5)
    .map(c => `› ${traducirColor(c.closest_palette_color)} (${c.percent.toFixed(1)}%)`)
    .join('\n');

  const texto = `🏷️ *Etiquetas detectadas:*\n${tags}\n\n🎨 *Colores predominantes:*\n${colors}`;

  conn.sendFile(m.chat, media, 'analisis.jpg', texto, m);
};

handler.help = ['analizar', 'analyze'];
handler.tags = ['internet', 'tools'];
handler.command = /^(analizar|analyze|imginfo)$/i;
export default handler;