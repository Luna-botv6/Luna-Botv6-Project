// mentionListener.js
import axios from 'axios';
import fs from 'fs';

export default function mentionListener(conn) {
  conn.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg || !msg.message) return;

      const botJid = conn.user.jid;
      const mentionedJids =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

      if (!mentionedJids.includes(botJid)) return; // 💡 Solo si mencionan al bot

      // Extraer texto
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';
      const inputText = text
        .replace(new RegExp(`@${botJid.split('@')[0]}`, 'g'), '')
        .trim() || 'Hola, ¿cómo estás?';

      // Idioma (si tienes base de datos de idiomas)
      let idioma =
        global.db?.data?.users?.[msg.key.participant || msg.key.remoteJid]
          ?.language || global.defaultLenguaje;
      let tradutor;
      try {
        const _translate = JSON.parse(
          fs.readFileSync(`./src/languages/${idioma}.json`)
        );
        tradutor = _translate?.plugins?.herramientas?.chatgpt;
      } catch {
        tradutor = null;
      }

      const texts = tradutor || {
        texto1: ['❌ *Ingresa un texto*\n\n📌 Ejemplo: ', '', 'Hola, ¿cómo estás?'],
        texto3: 'Actúa como ChatGPT, la IA conversacional desarrollada por OpenAI. Responde de manera útil y amigable.',
        texto4: '❌ Error. Vuelva a intentarlo.'
      };

      // Llamada a la API Ryzen
      const apiUrl = 'https://api.ryzendesu.vip/api/ai/chatgpt';
      const url = `${apiUrl}?text=${encodeURIComponent(inputText)}`;

      const result = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Bot/1.0)' }
      });

      let response = result.data.response || result.data.result;
      if (!response) {
        await conn.sendMessage(
          msg.key.remoteJid,
          { text: '❌ *La API Ryzen no devolvió una respuesta válida.*' },
          { quoted: msg }
        );
        return;
      }

      if (response.length > 4000) {
        response =
          response.substring(0, 3950) + '\n\n_[Respuesta truncada]_';
      }

      await conn.sendMessage(
        msg.key.remoteJid,
        { text: `🌙 *Luna-Botv6*\n\n${response}` },
        { quoted: msg }
      );

    } catch (error) {
      console.error('❌ Error en mentionListener:', error);
    }
  });
}



