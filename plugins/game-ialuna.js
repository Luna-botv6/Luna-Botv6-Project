
import axios from 'axios';
import fs from 'fs';

export default function mentionListener(conn) {
  // Cache para evitar procesamiento repetitivo
  const processedMessages = new Set();
  let botNumber = null;

  try {
    conn.ev.on('messages.upsert', async (chatUpdate) => {
      try {
        // Verificaciones rápidas primero
        if (!chatUpdate?.messages?.[0]?.message) return;

        const msg = chatUpdate.messages[0];
        
        // ⚡ FILTROS RÁPIDOS - Salir inmediatamente si:
        
        // 1. Es mensaje del propio bot
        if (msg.key.fromMe) return;
        
        // 2. Es mensaje de estado
        if (msg.key.remoteJid === 'status@broadcast') return;
        
        // 3. Ya procesamos este mensaje
        const msgId = msg.key.id;
        if (processedMessages.has(msgId)) return;
        
        // 4. Obtener número del bot solo una vez
        if (!botNumber && conn.user?.id) {
          botNumber = conn.user.id.split('@')[0].split(':')[0];
        }
        if (!botNumber) return;

        // 5. Extraer texto de manera eficiente
        const rawText = msg.message.conversation || 
                       msg.message.extendedTextMessage?.text || 
                       msg.message.imageMessage?.caption || 
                       msg.message.videoMessage?.caption || '';
        
        if (!rawText) return;

        // 6. Verificar mención rápidamente
        const isMentioned = rawText.includes(`@${botNumber}`) || 
                           msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.some(jid => 
                             jid.includes(botNumber));

        if (!isMentioned) return;

        // ✅ SOLO si pasa todos los filtros, procesar
        processedMessages.add(msgId);
        
        // Limpiar cache cada 100 mensajes para evitar memory leak
        if (processedMessages.size > 100) {
          processedMessages.clear();
        }

        // Extraer texto limpio
        let inputText = rawText.replace(new RegExp(`@${botNumber}`, 'g'), '').trim();
        if (!inputText) inputText = 'Hola';

        // Llamada a la API (sin logs innecesarios)
        const apiUrl = 'https://api.ryzendesu.vip/api/ai/chatgpt';
        
        let response;
        try {
          const result = await axios.get(`${apiUrl}?text=${encodeURIComponent(inputText)}`, {
            timeout: 12000,
            headers: { 
              'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Bot/1.0)',
              'Accept': 'application/json'
            }
          });

          response = result.data?.result || result.data?.response || result.data?.answer || '';
          
        } catch (apiError) {
          // Solo log de errores importantes
          console.error('❌ [Luna-IA] Error API:', apiError.message);
          await conn.sendMessage(msg.key.remoteJid, 
            { text: '❌ *Error temporal. Intenta en unos segundos.*' }, 
            { quoted: msg });
          return;
        }

        // Validar y enviar respuesta
        if (!response?.trim()) {
          await conn.sendMessage(msg.key.remoteJid, 
            { text: '❌ *No pude generar una respuesta.*' }, 
            { quoted: msg });
          return;
        }

        // Truncar si es muy largo
        if (response.length > 4000) {
          response = response.substring(0, 3950) + '\n\n_[Respuesta truncada]_';
        }

        // Enviar respuesta
        await conn.sendMessage(msg.key.remoteJid, 
          { text: `🌙 *Luna-Bot IA*\n\n${response}` }, 
          { quoted: msg });

        // Solo log de éxito si quieres
        // console.log('✅ [Luna-IA] Respuesta enviada');

      } catch (error) {
        // Solo log de errores críticos
        console.error('❌ [Luna-IA] Error crítico:', error.message);
      }
    });

  } catch (error) {
    console.error('❌ [Luna-IA] Error inicialización:', error.message);
  }
}