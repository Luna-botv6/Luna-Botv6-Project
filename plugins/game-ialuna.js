import axios from 'axios';
import fs from 'fs';

const handler = async (m, {conn}) => {
    try {
        const botJid = conn.user.jid;
        const isTagged = m.mentionedJid && m.mentionedJid.includes(botJid);

        if (!isTagged) return; // Solo responder si el bot es mencionado

        // Extraer texto sin la mención
        let inputText = m.text.replace(new RegExp(`@${botJid.split('@')[0]}`, 'g'), '').trim();

        // Si no hay texto, usar saludo por defecto
        if (!inputText) inputText = "Hola, ¿cómo estás?";

        // Leer idioma usuario (puedes adaptarlo si quieres)
        let idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;

        let tradutor;
        try {
            const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
            tradutor = _translate?.plugins?.herramientas?.chatgpt;
        } catch {
            tradutor = null;
        }

        const texts = tradutor || {
            texto1: ['❌ *Ingresa un texto*\n\n📌 Ejemplo: ', '', 'Hola, ¿cómo estás?'],
            texto3: 'Actúa como ChatGPT, la IA conversacional desarrollada por OpenAI. Responde de manera útil y amigable.',
            texto4: '❌ Error. Vuelva a intentarlo.'
        };

        conn.sendPresenceUpdate('composing', m.chat);

        const prompt = texts.texto3;

        // API Ryzen
        const apiUrl = 'https://api.ryzendesu.vip/api/ai/chatgpt';
        const url = `${apiUrl}?text=${encodeURIComponent(inputText)}`;

        const result = await axios.get(url, {
            timeout: 10000,
            headers: {'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Bot/1.0)'}
        });

        let response = result.data.response || result.data.result;

        if (!response) {
            m.reply('❌ *La API Ryzen no devolvió una respuesta válida.*');
            return;
        }

        if (response.length > 4000) {
            response = response.substring(0, 3950) + '\n\n_[Respuesta truncada]_';
        }

        // Responder mencionando al usuario
        m.reply(`🌙 *Luna-Botv6*\n\n${response}`, null, { mentions: [m.sender] });

    } catch (error) {
        console.error('Error en handler Ryzen:', error);
        m.reply('❌ Error interno. Inténtalo nuevamente.');
    }
};

handler.customPrefix = /@/; // Detecta menciones
handler.command = new RegExp(); // Sin comando
handler.rowner = false;
handler.register = false;

export default handler;




