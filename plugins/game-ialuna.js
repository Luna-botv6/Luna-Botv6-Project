// plugins/game-ialuna.js
import axios from 'axios';
import fs from 'fs';

export default function mentionListener(conn) {
  try {
    conn.ev.on('messages.upsert', async (m) => {
      const msg = m.messages?.[0];
      if (!msg || !msg.message) return;

      const botJid = conn.user?.id || conn.user?.jid;
      const mentionedJids =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

      // ✅ Solo responder si mencionan al bot
      if (!mentionedJids.includes(botJid)) return;

      // 📦 Extraer el texto limpio (sin la mención al bot)
      const rawText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';
      const inputText = rawText
        .replace(new RegExp(`@${botJid.split('@')[0]}`, 'g'), '')
        .trim() || 'Hola, ¿cómo estás?';

      // 🌍 Obtener idioma del usuario o idioma por defecto
      const userJid = msg.key.participant || msg.key.remoteJid;
      const idioma =
        global.db?.data?.users?.[userJid]?.language || global.defaultLenguaje || 'es';

      // 📁 Cargar traducciones si existen
      let traductor;
      try {
        const traduccionPath = `./src/languages/${idioma}.json`;
        if (fs.existsSync(traduccionPath)) {
          const _translate = JSON.parse(fs.readFileSync(traduccionPath));
          traductor = _translate?.plugins?.herramientas?.chatgpt;
        }
      } catch (error) {
        console.error('[❌] Error cargando archivo de traducción:', error.message);
      }

      // 📝 Mensajes por defecto si no hay traducción
      const texts = traductor || {
        texto1: ['❌ *Ingresa un texto*\n\n📄 Ejemplo: ', '', 'Hola, ¿cómo estás?'],
        texto3: 'Actúa como ChatGPT, la IA conversacional desarrollada por OpenAI. Responde de manera útil y amigable.',
        texto4: '❌ Error. Vuelva a intentarlo.'
      };

      // 🌐 Llamada a la API Ryzen
      const apiUrl = 'https://api.ryzendesu.vip/api/ai/chatgpt';
      const url = `${apiUrl}?text=${encodeURIComponent(inputText)}`;

      let response;
      try {
        const result = await axios.get(url, {
          timeout: 10000, // 10 segundos
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Bot/1.0)' }
        });
        response = result.data?.response || result.data?.result || '';
      } catch (apiError) {
        console.error('[❌] Error llamando a la API Ryzen:', apiError.message);
        await conn.sendMessage(
          msg.key.remoteJid,
          { text: '❌ *Error al contactar la API Ryzen. Intenta más tarde.*' },
          { quoted: msg }
        );
        return;
      }

      // ⚠️ Validación de respuesta
      if (!response || typeof response !== 'string') {
        await conn.sendMessage(
          msg.key.remoteJid,
          { text: '❌ *La API Ryzen no devolvió una respuesta válida.*' },
          { quoted: msg }
        );
        return;
      }

      // ✂️ Truncar si es demasiado largo
      if (response.length > 4000) {
        response = response.substring(0, 3950) + '\n\n_[Respuesta truncada]_';
      }

      // 📤 Enviar respuesta final
      try {
        await conn.sendMessage(
          msg.key.remoteJid,
          { text: `🌐 *Luna-Botv6*\n\n${response}` },
          { quoted: msg }
        );
      } catch (sendError) {
        console.error('[❌] Error enviando respuesta:', sendError.message);
      }
    });
  } catch (error) {
    console.error('[❌] Error general en mentionListener:', error.message);
  }
}