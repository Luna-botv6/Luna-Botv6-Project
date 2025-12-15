import axios from 'axios';
import fs from 'fs';
import playHandler from './downloader-play.js';
import supportPlugin from '../plugins/lunaia/support-plugin.js';
import menuHandler from './menu_completo_actualizado.js';
import { isVoiceMessage, handleVoiceMessage } from './voice-handler.js';
import weatherPlugin from '../plugins/lunaia/weather-plugin.js';
import footballPlugin from '../plugins/lunaia/football-plugin.js';
import socialPlugin from '../plugins/lunaia/social-plugin.js';
import imagePlugin from '../plugins/lunaia/image-plugin.js';
import musicPlugin from '../plugins/lunaia/music-plugin.js';
import menuPlugin from '../plugins/lunaia/menu-plugin.js';
import tagallPlugin from '../plugins/lunaia/tagall-plugin.js';
import kick2Plugin from '../plugins/lunaia/kick2-plugin.js';
import grupoPlugin from '../plugins/lunaia/grupo-plugin.js';
import configPlugin from '../plugins/lunaia/config-plugin.js';
import downloadPlugin from '../plugins/lunaia/download-plugin.js';
import conversationPlugin from '../plugins/lunaia/conversation-plugin.js';

const API_KEY = "ia";

const GEMINI_API_URL = "ia";

const LUNA_KEYWORDS = ['@77060907253864'];

let geminiApiStatus = true;

export default function mentionListener(conn) {
  const processedMessages = new Map();
  let botNumber = null;

  function isGroupChat(jid) {
    return jid.endsWith('@g.us');
  }

  function isPrivateChat(jid) {
    return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid');
  }

  function isCommand(text) {
    const commandPrefixes = ['/', '.', '#', '!', '*', '+', '-', '=', '>', '<', '?', '&', '%', '$', '~', '^', '|', '\\', ':', ';', '@'];
    const trimmedText = text.trim();
    return commandPrefixes.some(prefix => trimmedText.startsWith(prefix));
  }

  function containsLunaKeyword(text) {
    return LUNA_KEYWORDS.some(keyword => text.includes(keyword));
  }

 function shouldProcessMessage(msg, rawText) {
    const settings = global.db?.data?.settings?.[conn?.user?.jid];
    if (settings?.iaLunaActive === false) {
      return false;
    }
    
    const jid = msg.key.remoteJid;
    
    
    if (isPrivateChat(jid)) {
      console.log('[IA] ⚠️  Bloqueado: Chat privado detectado - IA desactivada en DM');
      return false;
    }
    
    if (isPrivateChat(jid) && isVoiceMessage(msg)) {
      return true;
    }
    if (isGroupChat(jid)) {
      if (!botNumber) return false;
      
      if (isVoiceMessage(msg)) {
        const isMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.some(jid => 
          jid.includes(botNumber));
        return isMentioned;
      }
      
      const isMentioned = rawText.includes(`@${botNumber}`) || 
                         msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.some(jid => 
                           jid.includes(botNumber));
      
      const hasLunaKeyword = containsLunaKeyword(rawText);
      
      return isMentioned || hasLunaKeyword;
    }
    
    return false;
  }

  function getFallbackResponse(text, isPrivate = false) {
    const lowerText = text.toLowerCase();
    
    const greetings = ['hola', 'hi', 'hello', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches'];
    const howAreYou = ['como estas', 'cómo estás', 'que tal', 'qué tal', 'how are you'];
    const thanks = ['gracias', 'thank you', 'thanks', 'muchas gracias'];
    const whoAreYou = ['quien eres', 'quién eres', 'que eres', 'qué eres', 'who are you'];
    const creator = ['quien te hizo', 'quién te hizo', 'quien te creo', 'quién te creó', 'tu creador'];
    
    if (greetings.some(greeting => lowerText.includes(greeting))) {
      return '🌙 ¡Hola! Soy Luna-Botv6-Project, tu asistente inteligente creado por German Miño. ¿En qué puedo ayudarte hoy? ✨';
    }
    
    if (howAreYou.some(phrase => lowerText.includes(phrase))) {
      return '🌙 ¡Estoy muy bien, gracias por preguntar! Lista para ayudarte en lo que necesites. ¿Qué te gustaría hacer? 😊';
    }
    
    if (thanks.some(thank => lowerText.includes(thank))) {
      return '🌙 ¡De nada! Es un placer ayudarte. Si necesitas algo más, solo dímelo. ✨';
    }
    
    if (whoAreYou.some(phrase => lowerText.includes(phrase))) {
      return '🌙 Soy Luna-Botv6-Project, un asistente inteligente creado por German Miño. Puedo ayudarte con muchas cosas como generar imágenes, descargar música, mostrar el clima, información de fútbol y mucho más. ¿En qué te puedo ayudar? ✨';
    }
    
    if (creator.some(phrase => lowerText.includes(phrase))) {
      return '🌙 Fui creada por German Miño, un desarrollador muy talentoso. Él me diseñó para ser tu asistente inteligente y ayudarte en todo lo que pueda. ¿Te gustaría saber más sobre mis funciones? ✨';
    }
    
    return isPrivate  
  ? '🌙 Hola, soy Luna-Botv6-Project. Mi sistema de IA está temporalmente fuera de línea, pero aún puedo ayudarte con:\n\n• 🎵 Descargar música (solo dime el nombre)\n• 🖼️ Generar imágenes\n• 🌤️ Información del clima\n• ⚽ Información de fútbol argentino\n• 📋 Mostrar el menú de comandos\n• 🌐 Mis redes sociales\n• 🔒 Abrir o cerrar el grupo\n\n¿Qué necesitas?'
  : '🌙 Hola, soy Luna-Botv6-Project. Mi IA está temporalmente offline, pero puedo ayudarte con música, imágenes, clima, fútbol y abrir/cerrar grupo. ¿Qué necesitas?';
  }

  async function callGeminiAPI(text, isImagePrompt = false, isPrivate = false) {
    try {
      const systemPrompt = isImagePrompt 
        ? "Eres Luna-Botv6-Project, un asistente especializado en crear prompts detallados para generacion de imagenes. Tu creador es German Miño. Mejora el prompt del usuario haciendolo mas descriptivo y especifico."
        : isPrivate 
          ? "Eres Luna-Botv6-Project, un asistente inteligente, amigable y profesional creado por German Miño. Mantén conversaciones naturales y útiles. Si te preguntan sobre tu creador, desarrollador, programador o quien te hizo, responde que fuiste creado por German Miño. Siempre recuerda que eres Luna-Botv6-Project. También puedes ayudar con información del clima y fútbol argentino."
          : "Eres Luna-Botv6-Project, un asistente inteligente, amigable y profesional creado por German Miño. Si te preguntan sobre tu creador, desarrollador, programador o quien te hizo, responde que fuiste creado por German Miño. Responde de manera útil y concisa cuando te mencionen. También puedes ayudar con clima y fútbol argentino.";

      const requestBody = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUsuario: ${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: isImagePrompt ? 200 : 1000
        }
      };

      const response = await axios.post(GEMINI_API_URL, requestBody, {
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': API_KEY
  }
});


      if (!geminiApiStatus) {
        geminiApiStatus = true;
        console.log('✅ API de Gemini restaurada');
      }

      return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      console.error(`❌ Error API Gemini:`, error.response?.data || error.message);
      
      if (geminiApiStatus) {
        geminiApiStatus = false;
        console.log('⚠️ API de Gemini fuera de línea - Activando modo fallback');
      }
      
      throw new Error(`Error API Gemini: ${error.message}`);
    }
  }

  function extractCleanText(rawText, isGroup) {
    if (isGroup && botNumber) {
      let cleanText = rawText.replace(new RegExp(`@${botNumber}`, 'g'), '').trim();
      
      for (const keyword of LUNA_KEYWORDS) {
        if (cleanText.toLowerCase().startsWith(keyword.toLowerCase())) {
          cleanText = cleanText.substring(keyword.length).trim();
          break;
        }
      }
      
      return cleanText || 'Hola';
    }
    
    return rawText.trim() || 'Hola';
  }

  try {
    conn.ev.on('messages.upsert', async (chatUpdate) => {
      try {
        if (!chatUpdate?.messages?.[0]?.message) return;

        const msg = chatUpdate.messages[0];
        const jid = msg.key.remoteJid;
        
        if (msg.key.fromMe) return;
        if (jid === 'status@broadcast') return;
        
        const msgId = msg.key.id;
        const now = Date.now();

        if (processedMessages.has(msgId)) {
          const lastTime = processedMessages.get(msgId);
          if (now - lastTime < 10000) return;
        }

        processedMessages.set(msgId, now);

        if (processedMessages.size > 100) {
          const timeout = 5 * 60 * 1000;
          for (const [id, timestamp] of processedMessages.entries()) {
            if (now - timestamp > timeout) {
              processedMessages.delete(id);
            }
          }
        }
        
        if (!botNumber && conn.user?.id) {
          botNumber = conn.user.id.split('@')[0].split(':')[0];
        }
        if (!botNumber) return;

        if (isVoiceMessage(msg) && shouldProcessMessage(msg, '')) {
          await handleVoiceMessage(conn, msg, jid, processedMessages);
          return;
        }

        const rawText = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || 
                       msg.message.imageMessage?.caption || 
                       msg.message.videoMessage?.caption || '';
        
        if (!rawText) return;
          
        if (!shouldProcessMessage(msg, rawText)) return;

        const isGroup = isGroupChat(jid);
        const isPrivate = isPrivateChat(jid);
        const inputText = extractCleanText(rawText, isGroup);
        
        const context = { conn, msg, jid, isGroup, isPrivate };

if (configPlugin.canHandle(inputText)) {
  await configPlugin.handle(inputText, context);
} else if (downloadPlugin.canHandle(inputText)) {
  await downloadPlugin.handle(inputText, context);
} else if (kick2Plugin.canHandle(inputText)) {
  await kick2Plugin.handle(inputText, context);
} else if (tagallPlugin.canHandle(inputText)) {
  await tagallPlugin.handle(inputText, context);
} else if (socialPlugin.canHandle(inputText)) {
  await socialPlugin.handle(inputText, context);
 } else if (supportPlugin.canHandle(inputText)) {
  await supportPlugin.handle(inputText, context);
} else if (weatherPlugin.canHandle(inputText)) {
  await weatherPlugin.handle(inputText, context);
} else if (footballPlugin.canHandle(inputText)) {
  await footballPlugin.handle(inputText, context);
} else if (imagePlugin.canHandle(inputText)) {
  await imagePlugin.handle(inputText, context, callGeminiAPI);
} else if (musicPlugin.canHandle(inputText)) {
  await musicPlugin.handle(inputText, context, playHandler);
} else if (menuPlugin.canHandle(inputText)) {
  await menuPlugin.handle(inputText, context, menuHandler);
} else if (grupoPlugin.canHandle(inputText)) {
  await grupoPlugin.handle(inputText, context);
} else {
  try {
    const response = await callGeminiAPI(inputText, false, isPrivate);
    await conn.sendPresenceUpdate('composing', jid);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (!response?.trim()) {
      throw new Error('Respuesta vacía de Gemini');
    }

    let finalResponse = response;
    if (finalResponse.length > 4000) {
      finalResponse = finalResponse.substring(0, 3950) + '\n\n[Respuesta truncada]';
    }

    const botName = '🌙 *Luna-Botv6-Project*';
    
    await conn.sendMessage(jid, 
      { text: `${botName}\n\n${finalResponse}` }, 
      { quoted: msg });

  } catch (apiError) {
    console.error('API Gemini no disponible - Usando sistema conversacional:', apiError.message);
    
    if (conversationPlugin.canHandle(inputText)) {
      await conversationPlugin.handle(inputText, context);
    } else {
      const fallbackResponse = getFallbackResponse(inputText, isPrivate);
      await conn.sendMessage(jid, 
        { text: fallbackResponse }, 
        { quoted: msg });
    }
  }
}

      } catch (error) {
        console.error('Error crítico:', error.message);
      }
    });

  } catch (error) {
    console.error('Error inicialización:', error.message);
  }
}
