import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const BASE_IMG = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/otros/personalidad/';

const SLUGS = [
  'hombre', 'mujer', 'homosexual', 'bisexual', 'pansexual', 'feminista',
  'heterosexual', 'macho-alfa', 'mujerzona', 'marimacha', 'palosexual',
  'playstationsexual', 'sr-manuela', 'pollosexual', 'gamer', 'otaku',
  'vago', 'dormilon', 'tacano', 'mentiroso'
];

const DEFAULT_GENEROS = {
  hombre: 'Hombre', mujer: 'Mujer', homosexual: 'Homosexual', bisexual: 'Bisexual',
  pansexual: 'Pansexual', feminista: 'Feminista', heterosexual: 'Heterosexual',
  'macho-alfa': 'Macho alfa', mujerzona: 'Mujerzona', marimacha: 'Marimacha',
  palosexual: 'Palosexual', playstationsexual: 'PlayStationSexual',
  'sr-manuela': 'Sr. Manuela', pollosexual: 'Pollosexual', gamer: 'Gamer',
  otaku: 'Otaku', vago: 'Vago', dormilon: 'Dormilón', tacano: 'Tacaño', mentiroso: 'Mentiroso'
};

const DEFAULT_TRADUCTOR = {
  titulo: 'PERSONALIDAD',
  nombre: 'Nombre',
  genero: 'Género',
  buena: 'Buena Moral',
  mala: 'Mala Moral',
  tipo: 'Tipo de persona',
  estado: 'Siempre está',
  inteligencia: 'Inteligencia',
  morosidad: 'Morosidad',
  coraje: 'Coraje',
  miedo: 'Miedo',
  fama: 'Fama',
  simpeo: 'Nivel de simpeo',
  redflags: 'Red flags',
  frase: 'Frase célebre',
  generos: DEFAULT_GENEROS,
  tipos: ['De buen corazón','Arrogante','Tacaño','Generoso','Humilde','Tímido','Cobarde','Entrometido','Cristal','No binarie XD','Pendejo'],
  estados: ['Pesado','De malas','Distraído','De molestoso','Chismoso','De compras','Viendo anime','Chateando porque está soltero','Acostado bueno para nada','De mujeriego','En el celular'],
  frases: [
    'No es una fase, es un estilo de vida',
    'Lo diagnostiqué yo y le di la razón',
    'Pide seguirme pero con respeto',
    'Su única red flag es que existe',
    'Hoy no, mañana tampoco',
    'Vine a romperla y me rompí yo',
    'No soy tóxico, soy exclusivo',
    'Conmigo o con la tabla de multiplicar'
  ]
};

const pick = list => list[Math.floor(Math.random() * list.length)];
const pct = () => Math.floor(Math.random() * 101);
const barra = p => {
  const llenos = Math.round(p / 10);
  return '█'.repeat(llenos) + '░'.repeat(10 - llenos);
};
const linea = (emoji, label, p) => `┃ ${emoji} *${label}* › ${barra(p)} ${p}%`;

const resolveLid = async (jid, conn, m) => {
  if (!jid.includes('@lid') || !m.isGroup) return jid;
  const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender);
  return participants.find(p => p.lid === jid)?.id || jid;
};

var handler = async (m, { conn, text }) => {

  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es';

  let _translate = {};
  try {
    _translate = (await global.loadTranslation(idioma)) || {};
  } catch {
    _translate = {};
  }

  const base = _translate?.plugins?.personalidad;
  const tradutor = {
    ...DEFAULT_TRADUCTOR,
    ...(base && typeof base === 'object' ? base : {}),
    generos: { ...DEFAULT_GENEROS, ...(base?.generos && typeof base.generos === 'object' ? base.generos : {}) }
  };
  if (!Array.isArray(tradutor.tipos) || !tradutor.tipos.length) tradutor.tipos = DEFAULT_TRADUCTOR.tipos;
  if (!Array.isArray(tradutor.estados) || !tradutor.estados.length) tradutor.estados = DEFAULT_TRADUCTOR.estados;
  if (!Array.isArray(tradutor.frases) || !tradutor.frases.length) tradutor.frases = DEFAULT_TRADUCTOR.frases;

  let nombre = text?.trim();
  let mentions = [];

  if (m.mentionedJid?.length) {
    const realJid = await resolveLid(m.mentionedJid[0], conn, m);
    mentions = [realJid];
    nombre = `@${realJid.split('@')[0]}`;
  }

  if (!nombre) {
    const realSender = await resolveLid(m.sender, conn, m);
    mentions = [realSender];
    nombre = `@${realSender.split('@')[0]}`;
  }

  const slug = pick(SLUGS);
  const genero = tradutor.generos[slug] || DEFAULT_GENEROS[slug] || slug;

  const resultado =
    `╭━━━「 🎭 *${tradutor.titulo}* 」━━━╮\n` +
    '┃\n' +
    `┃ 👤 *${tradutor.nombre}* › ${nombre}\n` +
    `┃ 🌈 *${tradutor.genero}* › ${genero}\n` +
    `┃ 💎 *${tradutor.tipo}* › ${pick(tradutor.tipos)}\n` +
    `┃ ⏰ *${tradutor.estado}* › ${pick(tradutor.estados)}\n` +
    '┃\n' +
    `${linea('✅', tradutor.buena, pct())}\n` +
    `${linea('❌', tradutor.mala, pct())}\n` +
    `${linea('🧠', tradutor.inteligencia, pct())}\n` +
    `${linea('💤', tradutor.morosidad, pct())}\n` +
    `${linea('🔥', tradutor.coraje, pct())}\n` +
    `${linea('😱', tradutor.miedo, pct())}\n` +
    `${linea('🌟', tradutor.fama, pct())}\n` +
    `${linea('😳', tradutor.simpeo, pct())}\n` +
    `${linea('🚩', tradutor.redflags, pct())}\n` +
    '┃\n' +
    `┃ 💬 *${tradutor.frase}* › _${pick(tradutor.frases)}_\n` +
    '┃\n' +
    '╰━━━━━━━━━━━━━━━━━━━━━━━╯';

  try {
    await conn.sendMessage(
      m.chat,
      { image: { url: BASE_IMG + slug + '.png' }, caption: resultado, mentions },
      { quoted: m }
    );
  } catch {
    await conn.sendMessage(
      m.chat,
      { text: resultado, mentions },
      { quoted: m }
    );
  }
};

handler.tags = ['fun'];
handler.command = ['personalidad'];

export default handler;
