/* ---------------------------------------------------------------------------------------
  🍀 • By https://github.com/ALBERTO9883
  🍀 • ⚘Alberto Y Ashly⚘
-----------------------------------------------------------------------------------------*/

import { randomBytes } from 'crypto';
import fetch from 'node-fetch'; // Necesitamos la librería fetch para hacer peticiones HTTP

// Link de WhatsApp
const link = /chat.whatsapp.com/;

// Función que maneja los mensajes
const handler = async (m, { conn, text, groupMetadata }) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.owner_chatgp;

  // Si el mensaje es de un baileys (mensaje de prueba del bot) o enviado por el propio bot, no hace nada
  if (m.isBaileys && m.fromMe) return;

  // Verificar que el mensaje esté en un grupo
  if (!m.isGroup) return;

  // Si no hay texto después del comando, enviar error
  if (!text) throw tradutor.texto1;

  // Verificar que el mensaje no tenga el link
  const linkThisGroup = `${link}`;
  if (m.text.includes(linkThisGroup)) return conn.reply(m.chat, tradutor.texto2, m);

  // Verificar el tiempo de espera entre mensajes
  const time = global.db.data.users[m.sender].msgwait + 300000;
  if (new Date() - db.data.users[m.sender].msgwait < 300000) {
    throw `${tradutor.texto3[0]} ${msToTime(time - new Date())} ${tradutor.texto3[1]}`;
  }

  // Obtener el nombre del usuario y los grupos donde enviar el mensaje
  const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender;
  const name = await conn.getName(m.sender);
  const groups = Object.entries(conn.chats)
    .filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats && !chat.metadata?.read_only && !chat.metadata?.announce)
    .map((v) => v[0]);

  // Crear el mensaje
  const teks = `${tradutor.texto4[0]} ${groupMetadata.subject}\n${tradutor.texto4[1]}${name}\n*${tradutor.texto4[2]} wa.me/${who.split`@`[0]}\n*${tradutor.texto4[3]} ${text}`;

  // Enviar el mensaje a todos los grupos
  for (const id of groups) {
    await conn.sendMessage(id, { text: teks }, { quoted: fakegif });
    global.db.data.users[m.sender].msgwait = new Date() * 1;
  }

  // Aquí es donde se va a hacer la petición a la API de ChatGPT
  try {
    const response = await getChatGptResponse(text); // Obtener respuesta de ChatGPT
    conn.reply(m.chat, response, m); // Enviar respuesta a WhatsApp
  } catch (error) {
    // Si algo falla, enviamos un mensaje de error
    console.error("Error al obtener respuesta de la API:", error); // Esto te dará más detalles del error en la consola
    conn.reply(m.chat, 'Hubo un error al obtener la respuesta. Por favor intenta de nuevo.', m);
  }
};

// Función para hacer la petición a la API de ChatGPT (o cualquier otra API que uses)
async function getChatGptResponse(prompt) {
  const apiKey = 'YOUR_API_KEY'; // Reemplaza con tu clave de API

  try {
    // Hacemos la petición a la API de OpenAI (por ejemplo)
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-davinci-003', // Usa el modelo adecuado
        prompt: prompt, // El texto que el usuario envió
        max_tokens: 150, // Limitar la cantidad de tokens
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en la respuesta de la API: ${response.statusText}`);
    }

    const data = await response.json(); // Parsear la respuesta JSON
    return data.choices[0].text.trim(); // Obtener la respuesta y quitar espacios
  } catch (error) {
    console.error("Error en la conexión con la API:", error);
    throw error; // Re-lanzar el error para que lo maneje el bloque catch principal
  }
}

// Función para convertir milisegundos en tiempo legible
function msToTime(duration) {
  const milliseconds = parseInt((duration % 1000) / 100);
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  hours = (hours < 10) ? '0' + hours : hours;
  minutes = (minutes < 10) ? '0' + minutes : minutes;
  seconds = (seconds < 10) ? '0' + seconds : seconds;
  return minutes + ' m ' + seconds + ' s ';
}

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);
const randomID = (length) => randomBytes(Math.ceil(length * .5)).toString('hex').slice(0, length);

handler.command = /^(msg)$/i;
handler.owner = true;
handler.group = true;
export default handler;
