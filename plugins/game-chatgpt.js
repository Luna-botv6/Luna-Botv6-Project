/* -------------------------------------------------------*/
/* [❗]                      [❗]                      [❗] */
/*                                                       */
/*       |- [ ⚠ ] - CREDITOS DEL CODIGO - [ ⚠ ] -|      */
/*     —◉ DESAROLLADO POR OTOSAKA:                       */
/*     ◉ Otosaka (https://github.com/6otosaka9)          */
/*     ◉ Número: wa.me/51993966345                       */
/*                                                       */
/*     —◉ FT:                                            */
/*     ◉ BrunoSobrino (https://github.com/BrunoSobrino)  */
/*                                                       */
/* [❗]                      [❗]                      [❗] */
/* -------------------------------------------------------*/
import axios from 'axios';
import fs from 'fs';

// Lista de APIs alternativas para ChatGPT
const APIs = [
    {
        name: 'Skynex',
        url: 'https://skynex.boxmine.xyz/docs/ai/myprompt',
        params: (text, prompt) => `?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(prompt)}&apikey=BrunoSobrino`,
        response: (data) => data.answer
    },
    {
        name: 'Widipe',
        url: 'https://api.widipe.com/openai',
        params: (text) => `?text=${encodeURIComponent(text)}`,
        response: (data) => data.result || data.response || data.answer
    },
    {
        name: 'Vihangayt',
        url: 'https://api.vihangayt.com/tools/chatgpt',
        params: (text) => `?q=${encodeURIComponent(text)}`,
        response: (data) => data.data || data.result
    },
    {
        name: 'Lolhuman',
        url: 'https://api.lolhuman.xyz/api/openai',
        params: (text) => `?apikey=GataDios&text=${encodeURIComponent(text)}`,
        response: (data) => data.result
    },
    {
        name: 'Ryzen',
        url: 'https://api.ryzendesu.vip/api/ai/chatgpt',
        params: (text) => `?text=${encodeURIComponent(text)}`,
        response: (data) => data.response || data.result
    }
];

const handler = async (m, {conn, text, usedPrefix, command}) => {
    try {
        const datas = global;
        const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
        
        // Detectar si el bot fue etiquetado
        const botJid = conn.user.jid;
        const isTagged = m.mentionedJid && m.mentionedJid.includes(botJid);
        
        // Si es una etiqueta, extraer el texto después de la mención
        let inputText = text;
        if (isTagged && m.text) {
            // Remover la etiqueta del texto
            inputText = m.text.replace(/@\d+/g, '').trim();
        }
        
        // Leer y parsear el archivo de idioma con mejor manejo de errores
        let _translate;
        let tradutor;
        
        try {
            _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
            // Verificar si existe la ruta completa del traductor
            tradutor = _translate?.plugins?.herramientas?.chatgpt;
        } catch (langError) {
            console.log('Error leyendo archivo de idioma:', langError);
            // Usar valores por defecto si no se puede leer el archivo
            tradutor = null;
        }
        
        // Definir textos por defecto si no se pueden cargar del archivo de idioma
        const defaultTexts = {
            texto1: ['❌ *Ingresa un texto*\n\n📌 Ejemplo: ', '', 'Hola, ¿cómo estás?'],
            texto3: 'Actúa como ChatGPT, la IA conversacional desarrollada por OpenAI. Responde de manera útil y amigable.',
            texto4: '❌ Error. Vuelva a intentarlo.'
        };
        
        // Usar traductor si existe, sino usar textos por defecto
        const texts = tradutor || defaultTexts;
        
        if (usedPrefix == 'a' || usedPrefix == 'A') return;
        
        // Si no hay texto y no es una etiqueta, mostrar error
        if (!inputText && !isTagged) {
            const errorMsg = texts.texto1 
                ? `${texts.texto1[0]} ${usedPrefix + command} ${texts.texto1[1]} ${usedPrefix + command} ${texts.texto1[2]}`
                : `❌ *Ingresa un texto*\n\n📌 Ejemplo: ${usedPrefix + command} Hola, ¿cómo estás?\n\n💡 *También puedes etiquetarme:* @Luna-Bot ¿Cómo estás?`;
            throw errorMsg;
        }
        
        // Si es una etiqueta sin texto, usar un saludo por defecto
        if (isTagged && !inputText) {
            inputText = "Hola, ¿cómo estás?";
        }
        
        conn.sendPresenceUpdate('composing', m.chat);
        
        const prompt = texts.texto3 || 'Actúa como ChatGPT, la IA conversacional desarrollada por OpenAI. Responde de manera útil y amigable.';
        
        // Intentar con cada API hasta que una funcione
        let response = null;
        let lastError = null;
        
        for (const api of APIs) {
            try {
                console.log(`🔄 Intentando con API: ${api.name}`);
                
                const url = api.url + api.params(inputText, prompt);
                
                const result = await axios.get(url, {
                    timeout: 15000, // 15 segundos por API
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Bot/1.0)'
                    }
                });
                
                const data = result.data;
                const answer = api.response(data);
                
                if (answer && answer.trim()) {
                    response = answer.trim();
                    console.log(`✅ API ${api.name} funcionó correctamente`);
                    break;
                } else {
                    console.log(`⚠️ API ${api.name} no retornó respuesta válida`);
                }
                
            } catch (error) {
                console.log(`❌ API ${api.name} falló:`, error.response?.status || error.code || error.message);
                lastError = error;
                continue;
            }
        }
        
        if (response) {
            // Limitar la respuesta a 4000 caracteres para evitar mensajes muy largos
            if (response.length > 4000) {
                response = response.substring(0, 3950) + '\n\n_[Respuesta truncada]_';
            }
            
            // Si fue etiquetado, mencionar al usuario
            if (isTagged) {
                m.reply(`🌙 *Luna-Botv6*\n\n${response}`, null, { mentions: [m.sender] });
            } else {
                m.reply(`🌙 *Luna-Botv6*\n\n${response}`);
            }
        } else {
            throw new Error('Todas las APIs fallaron');
        }
        
    } catch (error) {
        console.error('Error en ChatGPT handler:', error.message || error);
        
        // Manejo específico de errores
        if (error.message === 'Todas las APIs fallaron') {
            m.reply('❌ *Todas las APIs de ChatGPT están temporalmente fuera de servicio.*\n\n⏰ _Intenta nuevamente en unos minutos._');
        } else if (typeof error === 'string') {
            // Es un error de validación (como falta de texto)
            m.reply(error);
        } else if (error.code === 'ENOTFOUND') {
            m.reply('❌ *Error de conexión*\n\n📡 _Verifica tu conexión a internet._');
        } else if (error.code === 'ETIMEDOUT') {
            m.reply('❌ *Tiempo de espera agotado*\n\n⏰ _La solicitud tardó demasiado. Inténtalo nuevamente._');
        } else {
            // Usar mensaje de error del traductor si está disponible
            const errorMsg = texts?.texto4 || '❌ Error. Vuelva a intentarlo.';
            m.reply(errorMsg);
        }
    }
};

handler.command = /^(openai|chatgpt|ia|robot|openai2|chatgpt2|ia2|robot2|Mystic|MysticBot)$/i;
export default handler;