import axios from 'axios';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const execAsync = promisify(exec);
const ASSEMBLY_KEY = '7ec845a48f6d44ec99c9e9f4b59453e6';

async function uploadAudio(filePath) {
  const audioBuffer = fs.readFileSync(filePath);
  const response = await axios.post('https://api.assemblyai.com/v2/upload', audioBuffer, {
    headers: { authorization: ASSEMBLY_KEY, 'content-type': 'application/octet-stream' }
  });
  return response.data.upload_url;
}

async function transcribeAudio(filePath) {
  try {
    const audioUrl = await uploadAudio(filePath);
    const createResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      { 
        audio_url: audioUrl,
        language_code: 'es',
        punctuate: true,
        format_text: true,
        auto_chapters: false,
        dual_channel: false,
        speech_model: 'best',
        word_boost: ['hola', 'como', 'estas', 'bien', 'mal', 'gracias', 'por favor', 'ayuda'],
        boost_param: 'high'
      },
      { headers: { authorization: ASSEMBLY_KEY } }
    );
    const transcriptId = createResponse.data.id;

    while (true) {
      const statusRes = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: ASSEMBLY_KEY }
      });
      const status = statusRes.data.status;
      if (status === 'completed') {
        let transcription = statusRes.data.text;
        transcription = cleanTranscription(transcription);
        return transcription;
      }
      if (status === 'failed') return null;
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (err) {
    console.error('Error transcribiendo con AssemblyAI:', err.message);
    return null;
  }
}

function cleanTranscription(text) {
  if (!text) return text;
  
  let cleaned = text.toLowerCase();
  
  const corrections = {
    'ola': 'hola',
    'olacomo': 'hola como',
    'tas': 'estas',
    'stás': 'estas',
    'q tal': 'que tal',
    'k tal': 'que tal',
    'bn': 'bien',
    'gracias': 'gracias',
    'x favor': 'por favor',
    'xfavor': 'por favor',
    'ayudame': 'ayúdame',
    'necesito': 'necesito'
  };
  
  Object.entries(corrections).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    cleaned = cleaned.replace(regex, correct);
  });
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  return cleaned;
}

async function downloadAudio(msg) {
  try {
    const stream = await downloadContentFromMessage(msg.message.audioMessage, 'audio');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
  } catch (error) {
    console.error('Error descargando audio:', error.message);
    return null;
  }
}

export async function handleVoiceMessage(conn, msg, jid, processedMessages) {
  const tempDir = './temp_audio';
  try {
    if (jid.endsWith('@g.us')) {
      return;
    }

    const msgId = msg.key.id;
if (processedVoiceMessages.has(msgId)) {
  const timestamp = processedVoiceMessages.get(msgId);
  if (Date.now() - timestamp < 5000) return;
}
processedVoiceMessages.set(msgId, Date.now());

    await conn.sendMessage(jid, { text: '🎤 *Procesando tu nota de voz...* ⏳' }, { quoted: msg });

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const audioBuffer = await downloadAudio(msg);
    if (!audioBuffer) throw new Error('No se pudo descargar el audio');

    const timestamp = Date.now();
    const audioPath = path.join(tempDir, `voice_${timestamp}.ogg`);
    const wavPath = path.join(tempDir, `voice_${timestamp}.wav`);
    fs.writeFileSync(audioPath, audioBuffer);

    await execAsync(`ffmpeg -i "${audioPath}" -ar 22050 -ac 1 -acodec pcm_s16le -af "highpass=f=200,lowpass=f=8000,volume=2.0" "${wavPath}"`);

    let transcription = await transcribeAudio(wavPath);

    fs.unlinkSync(audioPath);
    fs.unlinkSync(wavPath);

    if (!transcription || transcription.trim().length === 0) {
      await conn.sendMessage(jid, {
        text: `🎤 *Luna-Botv6-Project* 🌙\n\n¡Hola! Recibí tu nota de voz pero no pude procesarla correctamente. ¿Puedes escribirme qué necesitas o intentar enviar el audio de nuevo? 😊`
      }, { quoted: msg });
      return;
    }

    if (transcription.length < 5) {
      await conn.sendMessage(jid, {
        text: `🎤 *Luna-Botv6-Project* 🌙\n\n📝 *Entendí:* "${transcription}"\n\n💬 ¡Hola! Recibí tu audio pero fue muy corto. ¿Puedes repetir tu mensaje un poco más claro? 😊`
      }, { quoted: msg });
      return;
    }

    const API_KEY = 'AIzaSyDp3km2WKWiMS-BlFDV2R5TqWjUjZtobXc';
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    const requestBody = {
      contents: [{
        parts: [{
          text: `Eres Luna-Botv6-Project, un asistente inteligente creado por German Miño. El usuario te envió una nota de voz que dice: "${transcription}". 

IMPORTANTE: Si la transcripción parece tener errores obvios de transcripción de audio (como "ola" en lugar de "hola", "tas" en lugar de "estas", etc.), interpreta el mensaje de manera inteligente y responde basándote en lo que el usuario realmente quiso decir.

Responde de manera natural y amigable en español.`
        }]
      }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
    };

    const response = await axios.post(GEMINI_API_URL, requestBody, { headers: { 'Content-Type': 'application/json' } });
    const botResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta.';

    await conn.sendMessage(jid, { 
      text: `🎤 *Luna-Botv6-Project* 🌙\n\n📝 *Entendí:* "${transcription}"\n\n💬 ${botResponse}` 
    }, { quoted: msg });

  } catch (error) {
    console.error('Error handleVoiceMessage:', error.message);
    await conn.sendMessage(jid, {
      text: `🎤 *Luna-Botv6-Project* 🌙\n\n¡Hola! Recibí tu nota de voz. Aunque tengo algunos problemitas técnicos ahora, estoy aquí para ayudarte. ¿Puedes escribirme qué necesitas? 😊`
    }, { quoted: msg });
  }
}

export function isVoiceMessage(msg) {
  return msg.message?.audioMessage && msg.message.audioMessage.ptt === true;
}
