
const MUSIC_KEYWORDS = [
  'descarga', 'descargar', 'música', 'musica', 'canción', 'cancion', 'audio', 'mp3',
  'play', 'reproduce', 'reproducir', 'busca', 'quiero escuchar', 'ponme', 'pon la',
  'buscar canción', 'buscar musica', 'dame la canción', 'dame la musica', 'me puedes descargar'
];

// palabras irrelevantes que suelen ensuciar el query
const CLEAN_WORDS = ['la', 'el', 'de', 'del', 'una', 'un', 'que', 'me', 'te', 'puedes'];

// quitar acentos y caracteres raros
function normalizeText(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function canHandle(text) {
  const lowerText = text.toLowerCase();
  return MUSIC_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

function extractMusicQuery(text) {
  let query = normalizeText(text.toLowerCase());

  // 1. Eliminar todos los keywords de la frase
  for (const keyword of MUSIC_KEYWORDS) {
    const regex = new RegExp(`\\b${normalizeText(keyword)}\\b`, 'gi');
    query = query.replace(regex, '');
  }

  // 2. Eliminar palabras de relleno comunes
  let words = query
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 0 && !CLEAN_WORDS.includes(w));

  // 3. Reconstruir la frase limpia
  return words.join(' ').trim();
}

async function handle(inputText, context, playHandler) {
  const { conn, msg, jid } = context;

  try {
    const musicQuery = extractMusicQuery(inputText);

    if (!musicQuery || musicQuery.length < 2) {
      await conn.sendMessage(
        jid,
        { text: '🎵 *Luna-Botv6-Project*\n\n¿Qué música quieres que busque? Especifica el nombre de la canción o artista.' },
        { quoted: msg }
      );
      return;
    }

    await conn.sendMessage(
      jid,
      { text: `🎵 *Luna-Botv6-Project*\n\n⏳ Buscando: *${musicQuery}*...\nProcesando tu solicitud...` },
      { quoted: msg }
    );

    const fakeM = { ...msg, chat: jid, key: { ...msg.key, remoteJid: jid } };
    await playHandler(fakeM, { conn, text: musicQuery, usedPrefix: '.', command: 'play' });

  } catch (musicError) {
    console.error('Error procesando música:', musicError.message);
    await conn.sendMessage(
      jid,
      { text: '⚠️ *Luna-Botv6-Project*\n\nError procesando tu solicitud musical. Intenta de nuevo o verifica el nombre.' },
      { quoted: msg }
    );
  }
}

export default { canHandle, handle, name: 'music', description: 'Plugin para descargar música' };

