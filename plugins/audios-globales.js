import fetch from 'node-fetch';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import { PassThrough } from 'stream';
import { getConfig } from '../lib/funcConfig.js';
import { getSinPrefijo } from '../lib/sinPrefijo.js';
import { getCustomAudios, getAudioFilePath } from '../lib/funcion/audiosStore.js';

const BASE = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/audio';

export const AUDIOS_CATALOG = [
  { id: 'hola-bot', keywords: ['hola bot'], file: 'holis.mp3' },
  { id: 'que-no', keywords: ['que no'], file: 'elmo-si-o-no.mp3' },
  { id: 'anadieleimporta', keywords: ['anadieleimporta', 'a nadie le importa'], file: '01J6734W48PG8EA14QW517QR2K.mp3' },
  { id: 'araara', keywords: ['araara', 'ara ara'], file: 'ara-ara_NGiqCMS.mp3' },
  { id: 'miarda-de-bot', keywords: ['miarda de bot', 'mierda de bot', 'mearda de bot'], file: '01J673T2Q92H3A0AW5B8RHA2N0.mp3' },
  { id: 'banate', keywords: ['bañate'], file: '01J672VZBZ488TCVYA7KBB3TFG.mp3' },
  { id: 'baneado', keywords: ['baneado'], file: '01J672WYXHW6JM3T8PCNQHH6MN.mp3' },
  { id: 'bebito-fiu-fiu', keywords: ['bebito fiu fiu', 'bff'], file: '01J672XP5MW9J5APRSDFYRTTE9.mp3' },
  { id: 'buenas-noches', keywords: ['buenas noches', 'boanoite'], file: '01J672YMA8AS2Z8YFMHB68GBQX.mp3' },
  { id: 'buenas-tardes', keywords: ['buenas tardes', 'boatarde'], file: '01J672ZCDK26GJZQ5GDP60TZ37.mp3' },
  { id: 'buenos-dias', keywords: ['buenos dias', 'buenos días'], file: '01J6730WRS4KJEZ281N2KJR1SV.mp3' },
  { id: 'sexo', keywords: ['sexo', 'hora de sexo'], file: 'AUD-20250531-WA0049.mp3' },
  { id: 'gemidos', keywords: ['gemidos', 'gemime', 'gime'], file: '01J673B4CRSS9Z2CX6E4R8MZPZ.mp3' },
  { id: 'audio-hentai', keywords: ['audio hentai', 'audiohentai'], file: '01J673BTPKK29A7CVJW9WKXE9T.mp3' },
  { id: 'fiesta-del-admin', keywords: ['fiesta del admin'], file: '01J672T4VQFK8ZSSD1G0MXMPD3.mp3' },
  { id: 'te-amo', keywords: ['te amo', 'teamo'], file: '01J6748B0RYBJWX5TBMWQZYX95.mp3' },
  { id: 'siu', keywords: ['siu', 'siiuu', 'siuuu'], file: '01J6747RFN09GR42AXY18VFW10.mp3' },
  { id: 'uwu', keywords: ['uwu'], file: '01J674A7N7KNER6GY6FCYTTZSR.mp3' },
  { id: 'yamete', keywords: ['yamete', 'yamete kudasai'], file: 'yamete-kudasai-ah-made-with-Voicemod.mp3' },
  { id: 'vivan-los-novios', keywords: ['vivan los novios'], file: '01J674D3S12JTFDETTNF12V4W8.mp3' },
  { id: 'gatito', keywords: ['gatito', 'gato', 'oiia', 'oia', 'uiia'], file: 'gatoxd.mp3' },
  { id: 'free-fire', keywords: ['free fire', 'noche de free fire'], file: 'hoy-es-noche-de-free-fire-made-with-Voicemod.mp3' },
  { id: 'pasa-pack', keywords: ['pasa pack'], file: '01J6735MY23DV6ES9XHBP06K9R.mp3' },
  { id: 'la-bebesita', keywords: ['la bebesita', 'la bebecita', 'la bbsita', 'santurrona'], file: 'la-bebecita-saturado.mp3' },
  { id: '5-noche-con-mi-tio', keywords: ['5 noche con mi tío', '5 noches con mi tio', '5 noches con alfredo', 'fainas and freddy'], file: '5-noches-con-mi-tio.mp3' },
  { id: 'no-digas-mamadas', keywords: ['no digas mamadas', 'no mamadas', 'no digas eso'], file: 'no-digas-mamadas_4Q3vIm8.mp3' },
  { id: 'ay-despacito', keywords: ['ay despacito', 'ay despacio', 'ay suave'], file: 'ay-despacito.mp3' },
  { id: 'comando-estelar', keywords: ['comando estelar', 'estelar', 'refuerzos'], file: 'comando-estelar-necesito-ayuda.mp3' },
  { id: 'decir-estupideces', keywords: ['decir estupideces', 'estupideces', 'decir tonterías'], file: 'decir-estupideces.mp3' },
  { id: 'mil-quiniento', keywords: ['mil quiniento', 'pvtas', 'cuanto cobras'], file: '1500-es-hora-y-media.mp3' },
  { id: 'a-mi-se-me-hace-que', keywords: ['a mi se me hace que'], file: 'a-mi-se-me-hace-que-eres-marica_INzinVu.mp3' },
  { id: 'que-dificil', keywords: ['que dificil', 'dificil', 'complicado', 'que complicado'], file: 'que-dificil-me-la-pusiste-diablo.mp3' },
  { id: 'troleado', keywords: ['troleado', 'troll', 'trolls'], file: 'whatsapp-audio-2019-09-08-at-225441.mp3' },
  { id: 'por-fin-aparecio', keywords: ['por fin apareció', 'por fin apareciste', 'al fin llegas', 'te tarda', 'por fin llegas', 'por fin llegaste', 'te tardaste'], file: 'por-fin-apareciste-malnacido-picoro.mp3' },
  { id: 'el-senor-de-la-noche', keywords: ['el señor de la noche', 'soy el señor de la noche', 'don omar', 'el caballero de la noche', 'soy batman', 'mitad hombre mitad animal'], file: 'el-senor-de-la-noche-don-omar.mp3' },
  { id: 'con-la-carita-empapada', keywords: ['con la carita empapada', 'vegeta carita empapada', 'me puse a llorar', 'llegue tarde', 'vegeta llorando', 'esperaba que llegaras'], file: 'vegeta-con-la-carita-empapada.mp3' },
  { id: 'miku-miku-beam', keywords: ['miku miku beam', 'miku miku bim', 'rayo miku', 'ataque miku', 'miku beam', 'beam miku'], file: 'miku-miku-beam_GR1xBFx.mp3' },
  { id: 'noo-la-policia', keywords: ['noo la policia', 'ay no la policia', 'viene la gorra', 'la yuta', 'corran que viene la cana', 'oh no la policia'], file: 'noo-la-policia.mp3' }
];

const handler = (m) => m;

function isAudioEnabled(audiosConfig, id) {
  return audiosConfig[id] !== false;
}

function convertToOgg(mp3Buffer) {
  return new Promise((resolve, reject) => {
    const input = new Readable();
    input.push(mp3Buffer);
    input.push(null);

    const output = new PassThrough();
    const chunks = [];
    output.on('data', chunk => chunks.push(chunk));
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);

    ffmpeg(input)
      .inputFormat('mp3')
      .noVideo()
      .audioCodec('libopus')
      .audioChannels(1)
      .audioFrequency(48000)
      .audioBitrate('128k')
      .outputOptions(['-map', '0:a:0', '-map_metadata', '-1', '-application', 'voip', '-frame_duration', '20', '-packet_loss', '0'])
      .format('ogg')
      .on('error', reject)
      .pipe(output);
  });
}

handler.all = async function (m, { conn }) {
  try {
    if (!m || m.fromMe || m.isBaileys || !m.id) return;
    if (!conn?.user) return;
    if (!m.chat.endsWith('@g.us')) return;

    const text = (m.text || '').trim();
    if (!text) return;

    const sinPrefijoActivo = getSinPrefijo(m.chat);
    if (sinPrefijoActivo) return;

    const first = text.trim().split(/\s+/)[0];
    const prefijos = ['.', '#', '/', '!', '?', '$', '%', '&', '*'];
    if (prefijos.includes(first[0])) return;
    if (m.isCommand) return;
    if (m.commandSinPrefijo) return;
    if (text.length < 2) return;

    const chat = getConfig(m.chat) || {};
    const audiosEnabled = chat.audios !== undefined ? chat.audios : true;
    if (chat.isBanned) return;
    if (!audiosEnabled) return;

    const audiosConfig = chat.audiosConfig || {};
    const lower = text.toLowerCase();

    let matchedFile = null;
    let matchedIsCustom = false;

    for (const entry of AUDIOS_CATALOG) {
      if (!isAudioEnabled(audiosConfig, entry.id)) continue;
      if (entry.keywords.find(k => lower.includes(k))) {
        matchedFile = entry.file;
        break;
      }
    }

    if (!matchedFile) {
      const customAudios = getCustomAudios();
      for (const [trigger, data] of Object.entries(customAudios)) {
        if (!isAudioEnabled(audiosConfig, trigger)) continue;
        if (lower.includes(trigger)) {
          matchedFile = data.file;
          matchedIsCustom = true;
          break;
        }
      }
    }

    if (!matchedFile) return;

    let oggBuffer;

    if (matchedIsCustom) {
      try {
        oggBuffer = fs.readFileSync(getAudioFilePath(matchedFile));
      } catch {
        return;
      }
    } else {
      const audioUrl = `${BASE}/${encodeURIComponent(matchedFile)}`;
      const res = await fetch(audioUrl);
      if (!res.ok) return;
      const mp3Buffer = Buffer.from(await res.arrayBuffer());
      oggBuffer = await convertToOgg(mp3Buffer);
    }

    await conn.sendPresenceUpdate('recording', m.chat);
    await new Promise(res => setTimeout(res, 1200));

    if (!conn?.user) return;

    await conn.sendMessage(m.chat, { audio: oggBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m });

  } catch (e) {
    console.error('[AUDIO-DEBUG] 💥 Error inesperado:', e);
  }

  return false;
};

export default handler;
