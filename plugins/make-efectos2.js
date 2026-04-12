import mumaker from 'mumaker';

const efectos = {
  metallic:   'https://en.ephoto360.com/impressive-decorative-3d-metal-text-effect-798.html',
  ice:        'https://en.ephoto360.com/ice-text-effect-online-101.html',
  snow:       'https://en.ephoto360.com/create-a-snow-3d-text-effect-free-online-621.html',
  paint:      'https://en.ephoto360.com/create-3d-colorful-paint-text-effect-online-801.html',
  matrix:     'https://en.ephoto360.com/matrix-text-effect-154.html',
  light:      'https://en.ephoto360.com/light-text-effect-futuristic-technology-style-648.html',
  neon:       'https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html',
  devil:      'https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html',
  purple:     'https://en.ephoto360.com/purple-text-effect-online-100.html',
  thunder:    'https://en.ephoto360.com/thunder-text-effect-online-97.html',
  leaves:     'https://en.ephoto360.com/green-brush-text-effect-typography-maker-online-153.html',
  hacker:     'https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html',
  sand:       'https://en.ephoto360.com/write-names-and-messages-on-the-sand-online-582.html',
  blackpink:  'https://en.ephoto360.com/create-a-blackpink-style-logo-with-members-signatures-810.html',
  bornpink:   'https://en.ephoto360.com/create-blackpink-s-born-pink-album-logo-online-779.html',
  glitch:     'https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html',
  fire:       'https://en.ephoto360.com/flame-lettering-effect-372.html',
  dragonball: 'https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-809.html',
  deadpool:   'https://en.ephoto360.com/create-text-effects-in-the-style-of-the-deadpool-logo-818.html',
  naruto:     'https://en.ephoto360.com/naruto-shippuden-logo-style-text-effect-online-808.html',
  balloon:    'https://en.ephoto360.com/beautiful-3d-foil-balloon-effects-for-holidays-and-birthday-803.html',
  comic:      'https://en.ephoto360.com/create-online-3d-comic-style-text-effects-817.html',
  silver:     'https://en.ephoto360.com/create-glossy-silver-3d-text-effect-online-802.html',
  glass:      'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html',
  fog:        'https://en.ephoto360.com/handwritten-text-on-foggy-glass-online-680.html',
  pavement:   'https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html',
  typography: 'https://en.ephoto360.com/create-online-typography-art-effects-with-multiple-layers-811.html',
  space:      'https://en.ephoto360.com/latest-space-3d-text-effect-online-559.html',
  gold:       'https://en.ephoto360.com/gold-text-effect-pro-271.html',
  arena:      'https://en.ephoto360.com/create-cover-arena-of-valor-by-mastering-360.html',
};

const menu = `🎨 *EFECTOS DE TEXTO*

💡 *¿Cómo funciona?*
Escribe el nombre del efecto seguido de tu texto y el bot te genera una imagen con ese estilo.

📌 *Ejemplo:*
/fire Goku
/neon Hola mundo
/dragonball Vegeta

─────────────────
🔥 *Fuego y Acción*
▸ fire ▸ thunder ▸ devil
▸ matrix ▸ glitch ▸ hacker ▸ arena

🧊 *Naturaleza y Ambiente*
▸ ice ▸ snow ▸ sand
▸ leaves ▸ fog ▸ glass ▸ pavement

✨ *Artístico y 3D*
▸ metallic ▸ silver ▸ gold
▸ paint ▸ neon ▸ light ▸ purple
▸ space ▸ balloon ▸ comic ▸ typography

🎭 *Personajes y Marcas*
▸ dragonball ▸ deadpool ▸ naruto
▸ blackpink ▸ bornpink
─────────────────`;

const handler = async (m, { conn, text, command }) => {
  const cmd = command.toLowerCase();

  if (cmd === 'efectos') return m.reply(menu);

  const url = efectos[cmd];
  if (!text) return m.reply(`✏️ Escribe un texto después del comando.\n📌 Ejemplo: /${cmd} Hola mundo\n\nVer todos los efectos: /efectos`);

  m.reply('⏳ Generando imagen...');

  try {
    const result = await mumaker.ephoto(url, text);
    if (!result || !result.image) return m.reply('❌ No se pudo generar la imagen, intenta de nuevo.');
    conn.sendFile(m.chat, result.image, 'efecto.png', `✅ *Efecto:* ${cmd}\n📝 *Texto:* ${text}`, m);
  } catch (e) {
    m.reply('❌ No se pudo generar la imagen, intenta de nuevo.');
  }
};

handler.help = ['efectos'];
handler.tags = ['tools'];
handler.command = ['efectos', ...Object.keys(efectos)];
export default handler;