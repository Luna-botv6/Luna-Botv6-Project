import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const toM = (a) => '@' + a.split('@')[0];
const BOT = () => global.BotName || 'Luna';

const T = {
  es: {
    texto1: '❌ No se encontraron participantes en el grupo.',
    texto2: '❌ Se necesitan al menos 2 participantes para formar una pareja.',
    texto9: 'PAREJA IDEAL',
    texto10: 'debería hacer pareja con',
    texto11: 'Compatibilidad',
    texto12: '❌ Ocurrió un error al intentar formar la pareja.',
  },
  en: {
    texto1: '❌ No participants found in the group.',
    texto2: '❌ At least 2 participants needed to form a couple.',
    texto9: 'IDEAL COUPLE',
    texto10: 'should be paired with',
    texto11: 'Compatibility',
    texto12: '❌ An error occurred trying to form the couple.',
  },
  pt: {
    texto1: '❌ Nenhum participante encontrado no grupo.',
    texto2: '❌ São necessários pelo menos 2 participantes para formar um casal.',
    texto9: 'CASAL IDEAL',
    texto10: 'deveria fazer par com',
    texto11: 'Compatibilidade',
    texto12: '❌ Ocorreu um erro ao tentar formar o casal.',
  }
};

const CARTAS = {
  es: [
    {
      rango: [0, 10], emoji: '💔', titulo: 'Sin esperanza romántica',
      frases: [
        'Los astros han hablado... y no tienen buenas noticias.',
        'Su energía se repele como polos iguales de un imán.',
        'Quizás en otra vida, en otro universo paralelo.',
        'El universo tiene otros planes para cada uno.',
      ]
    },
    {
      rango: [11, 30], emoji: '🥀', titulo: 'Apenas una chispa',
      frases: [
        'Hay algo muy pequeño, casi imperceptible.',
        'Una amistad podría florecer, pero el amor... lo dudo.',
        'Las cartas dicen: disfruten la compañía sin expectativas.',
        'Un vínculo débil que el tiempo podría fortalecer o apagar.',
      ]
    },
    {
      rango: [31, 50], emoji: '🌸', titulo: 'Conexión en construcción',
      frases: [
        'El destino los puso en el mismo camino, pero aún no saben por qué.',
        'Hay potencial escondido esperando ser descubierto.',
        'Con esfuerzo y paciencia, las estrellas podrían alinearse.',
        'Un lazo que aún está siendo tejido por el universo.',
      ]
    },
    {
      rango: [51, 70], emoji: '💞', titulo: 'Buen augurio',
      frases: [
        'Las cartas revelan una conexión genuina y especial.',
        'Sus energías se complementan de manera sorprendente.',
        'El corazón de uno late un poco más rápido cerca del otro.',
        'Los planetas sonríen cuando sus nombres se pronuncian juntos.',
      ]
    },
    {
      rango: [71, 90], emoji: '🔥💘', titulo: '¡Fuego y pasión!',
      frases: [
        'La química entre ellos es tan intensa que se puede sentir.',
        'Sus almas se reconocen como si ya se hubieran encontrado antes.',
        'El universo conspira para mantenerlos cerca.',
        'Juntos podrían conquistar cualquier desafío que la vida les ponga.',
      ]
    },
    {
      rango: [91, 100], emoji: '💖👩‍❤️‍👨', titulo: '¡Almas gemelas!',
      frases: [
        'Rarísima lectura: dos almas escritas la una para la otra.',
        'El cosmos entero celebra esta unión desde el principio de los tiempos.',
        'Su amor tiene el poder de mover montañas y calmar tormentas.',
        'Están destinados a escribir juntos la historia más hermosa.',
      ]
    }
  ],
  en: [
    {
      rango: [0, 10], emoji: '💔', titulo: 'No romantic hope',
      frases: [
        'The stars have spoken... and the news is not good.',
        'Their energy repels like same poles of a magnet.',
        'Maybe in another life, in another parallel universe.',
        'The universe has other plans for each of them.',
      ]
    },
    {
      rango: [11, 30], emoji: '🥀', titulo: 'Just a spark',
      frases: [
        'There is something very small, almost imperceptible.',
        'A friendship could bloom, but love... I doubt it.',
        'The cards say: enjoy the company without expectations.',
        'A weak bond that time could strengthen or extinguish.',
      ]
    },
    {
      rango: [31, 50], emoji: '🌸', titulo: 'Connection in progress',
      frases: [
        'Destiny put them on the same path, but they don\'t know why yet.',
        'There is hidden potential waiting to be discovered.',
        'With effort and patience, the stars could align.',
        'A bond still being woven by the universe.',
      ]
    },
    {
      rango: [51, 70], emoji: '💞', titulo: 'Good omen',
      frases: [
        'The cards reveal a genuine and special connection.',
        'Their energies complement each other in surprising ways.',
        'One\'s heart beats a little faster near the other.',
        'The planets smile when their names are spoken together.',
      ]
    },
    {
      rango: [71, 90], emoji: '🔥💘', titulo: 'Fire and passion!',
      frases: [
        'The chemistry between them is so intense you can feel it.',
        'Their souls recognize each other as if they had met before.',
        'The universe conspires to keep them close.',
        'Together they could conquer any challenge life throws at them.',
      ]
    },
    {
      rango: [91, 100], emoji: '💖👩‍❤️‍👨', titulo: 'Soulmates!',
      frases: [
        'Rarest reading: two souls written for each other.',
        'The entire cosmos celebrates this union since the beginning of time.',
        'Their love has the power to move mountains and calm storms.',
        'They are destined to write the most beautiful story together.',
      ]
    }
  ],
  pt: [
    {
      rango: [0, 10], emoji: '💔', titulo: 'Sem esperança romântica',
      frases: [
        'Os astros falaram... e as notícias não são boas.',
        'Sua energia se repele como polos iguais de um ímã.',
        'Talvez em outra vida, em outro universo paralelo.',
        'O universo tem outros planos para cada um.',
      ]
    },
    {
      rango: [11, 30], emoji: '🥀', titulo: 'Apenas uma faísca',
      frases: [
        'Há algo muito pequeno, quase imperceptível.',
        'Uma amizade poderia florescer, mas o amor... duvido.',
        'As cartas dizem: aproveitem a companhia sem expectativas.',
        'Um vínculo fraco que o tempo pode fortalecer ou apagar.',
      ]
    },
    {
      rango: [31, 50], emoji: '🌸', titulo: 'Conexão em construção',
      frases: [
        'O destino os colocou no mesmo caminho, mas ainda não sabem por quê.',
        'Há potencial escondido esperando para ser descoberto.',
        'Com esforço e paciência, as estrelas podem se alinhar.',
        'Um laço que ainda está sendo tecido pelo universo.',
      ]
    },
    {
      rango: [51, 70], emoji: '💞', titulo: 'Bom presságio',
      frases: [
        'As cartas revelam uma conexão genuína e especial.',
        'Suas energias se complementam de forma surpreendente.',
        'O coração de um bate um pouco mais rápido perto do outro.',
        'Os planetas sorriem quando seus nomes são pronunciados juntos.',
      ]
    },
    {
      rango: [71, 90], emoji: '🔥💘', titulo: 'Fogo e paixão!',
      frases: [
        'A química entre eles é tão intensa que dá para sentir.',
        'Suas almas se reconhecem como se já tivessem se encontrado antes.',
        'O universo conspira para mantê-los perto.',
        'Juntos poderiam conquistar qualquer desafio que a vida trouxer.',
      ]
    },
    {
      rango: [91, 100], emoji: '💖👩‍❤️‍👨', titulo: 'Almas gêmeas!',
      frases: [
        'Leitura raríssima: duas almas escritas uma para a outra.',
        'O cosmos inteiro celebra essa união desde o início dos tempos.',
        'Seu amor tem o poder de mover montanhas e acalmar tempestades.',
        'Estão destinados a escrever juntos a história mais bonita.',
      ]
    }
  ]
};

function getCarta(porcentaje, idioma) {
  const cartas = CARTAS[idioma] || CARTAS.es;
  const carta = cartas.find(c => porcentaje >= c.rango[0] && porcentaje <= c.rango[1]);
  const frase = carta.frases[Math.floor(Math.random() * carta.frases.length)];
  return { ...carta, frase };
}

async function handler(m, { conn }) {
  let t = null;
  try {
    const idioma = global.db.data.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
    t = T[idioma] || T.es;

    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    const participants = groupData?.participants || [];

    if (!participants || participants.length === 0) return m.reply(t.texto1);
    const ps = participants.map(v => v.id);
    if (ps.length < 2) return m.reply(t.texto2);

    const a = ps[Math.floor(Math.random() * ps.length)];
    let b;
    do { b = ps[Math.floor(Math.random() * ps.length)]; } while (b === a);

    const porcentaje = Math.floor(Math.random() * 101);
    const totalBloques = 12;
    const bloquesLlenos = Math.floor((porcentaje / 100) * totalBloques);
    const barra = '▰'.repeat(bloquesLlenos) + '▱'.repeat(totalBloques - bloquesLlenos);

    const carta = getCarta(porcentaje, idioma);

    const estrellas = porcentaje >= 80 ? '⭐⭐⭐⭐⭐'
      : porcentaje >= 60 ? '⭐⭐⭐⭐'
      : porcentaje >= 40 ? '⭐⭐⭐'
      : porcentaje >= 20 ? '⭐⭐'
      : '⭐';

    const mensaje =
`╭━━━━━━━━━━━━━━━━━━━━━╮
│  💘 *${t.texto9}* 💘
╰━━━━━━━━━━━━━━━━━━━━━╯

✨ *${toM(a)}*
💕 ${t.texto10}
✨ *${toM(b)}*

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

${carta.emoji} *${carta.titulo}*
${estrellas}

❤️ *${t.texto11}:* ${porcentaje}%
${barra}

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

_✦ ${carta.frase}_

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
🌙 _${BOT()}_`;

    m.reply(mensaje, null, { mentions: [a, b] });

  } catch (e) {
    console.error('Error en formarpareja:', e);
    m.reply(t?.texto12 || '❌ Ocurrió un error al intentar formar la pareja.');
  }
}

handler.help = ['formarpareja'];
handler.tags = ['main', 'fun'];
handler.command = ['formarpareja', 'formarparejas'];
handler.group = true;

export default handler;
