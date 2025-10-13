const STRICT_MODE = false; // false = modo flexible, detecta frases naturales

const SUPPORT_RESPONSES = {
  "instalar en termux": `📱 **INSTALACIÓN EN TERMUX (ANDROID)**

1️⃣ Instala Termux desde Play Store  
2️⃣ Actualiza paquetes:
\`\`\`bash
pkg update && pkg upgrade -y
\`\`\`
3️⃣ Instala dependencias:
\`\`\`bash
pkg install nodejs git python make clang pkg-config -y
\`\`\`
4️⃣ Clona el repo:
\`\`\`bash
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
cd Luna-Botv6-Project
npm install
npm start
\`\`\`
✨ ¡Listo! Luna-BotV6 funcionará sin problemas.`,

  "instalar en boxmine": `🖥️ **INSTALACIÓN EN BOXMINEWORLD – Método completo (actualizado)**

📦 *Boxmine no usa instalación manual por consola como Termux.*  
Se instala automáticamente desde su **panel web** siguiendo estos pasos:

1️⃣ Crea una cuenta en [https://dash.boxmineworld.com](https://dash.boxmineworld.com)  
   - Vinculá tu cuenta de **Discord** y tu **Gmail**.

2️⃣ En el panel, abrí la sección **"Servidores"** y elegí **"Crear servidor"**.  
   - En el *catálogo* buscá **"Luna-BotV6"** (está listado como tipo "Bot de WhatsApp").  
   - Seleccioná el **tipo de nodo** y el **plan** (hay gratuitos, VIP, etc.).

3️⃣ Una vez creado, entrá al servidor y en el panel de la derecha buscá la **Consola**.  
   - Hacé clic en el botón 🟢 **“Start”**.  
   - Esperá unos segundos mientras carga el entorno.

4️⃣ En la consola aparecerá el mensaje de vinculación a WhatsApp:
   - Opción **1:** QR (para escanear desde WhatsApp Web).  
   - Opción **2:** Código de **8 dígitos** (para vinculación por número).

5️⃣ Elegí tu método preferido, completá la vinculación, ¡y listo! 🚀  
   El bot se conectará automáticamente.

💡 *Ventajas de Boxmine:*  
✅ Reinicio automático si se cae.  
✅ Panel de logs en tiempo real.  
✅ Sin necesidad de usar comandos manuales.

✨ ¡Ya tenés Luna-BotV6 funcionando en BoxmineWorld!`,

  "instalar en windows": `🪟 **INSTALACIÓN EN WINDOWS**

\`\`\`bash
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
cd Luna-Botv6-Project
npm install
npm start
\`\`\`
💡 Podés editar la configuración con:
\`\`\`bash
notepad config.js
\`\`\`
🚀 Compatible con Node.js v18+.`,

  "instalar en linux": `🐧 **INSTALACIÓN EN LINUX**

\`\`\`bash
sudo apt update
sudo apt install nodejs npm git ffmpeg imagemagick python3 -y
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
cd Luna-Botv6-Project
npm install
npm start
\`\`\`
💡 Recomendado: mantenerlo online con PM2.
\`\`\`bash
npm install -g pm2
pm2 start main.js --name "LunaBot"
\`\`\``,

"crear comandos": `🛠️⚡ *Crea Tus Propios Comandos Personalizados* ⚡🛠️

🎯 *¡Ahora puedes crear tus propios comandos sin escribir código!*  
El bot te guiará paso a paso para que personalices tu experiencia al máximo 🌟  

━━━━━━━━━━━━━━━
🎨 *¿Qué puedes crear?*
━━━━━━━━━━━━━━━
📝 *Mensajes personalizados* – Respuestas únicas con tu toque  
🏷️ *Etiquetas inteligentes* – Decide quién será mencionado automáticamente  
🖼️ *Comandos con imágenes* – Agrega contenido visual a tus respuestas  

━━━━━━━━━━━━━━━
📋 *Guía paso a paso*
━━━━━━━━━━━━━━━
🚀 *1️⃣ /createcode* → Inicia el creador de comandos  
📝 *2️⃣ /setmessage* → Define el mensaje de respuesta  
🏷️ *3️⃣ /settag* → Configura las menciones  
🖼️ *4️⃣ /setimage* → Añade soporte para imágenes  
⚡ *5️⃣ /setcommand* → Establece el nombre del comando  

🧩 *Ejemplo práctico:*  
\`\`\`
/createcode
/setmessage ¡Hola mundo!
/settag no
/setimage no
/setcommand saludo
\`\`\`

━━━━━━━━━━━━━━━
💡 *Características destacadas*
━━━━━━━━━━━━━━━
🤖 *Guiado inteligente* – El bot te dice exactamente qué hacer  
👑 *Exclusivo para owners* – Solo los propietarios pueden crear comandos  
⚡ *Sin código* – No necesitas saber programar  

🎨 *Personalización total* – Crea comandos únicos con tu estilo  
📱 *Fácil de usar* – Comandos intuitivos  
🔧 *Configuración flexible* – Opciones avanzadas disponibles  

━━━━━━━━━━━━━━━
🌟 *¡Desata tu creatividad!* 🌟  
━━━━━━━━━━━━━━━
Con esta función, el límite es tu imaginación ✨  
Crea comandos únicos, divertidos y completamente personalizados  
que hagan de tu bot algo *realmente especial*. 💫

──────────────────────
💬 _Para más ayuda escribe:_ *contacto oficial*
──────────────────────.`,

  "actualizar bot": `🔄 **ACTUALIZAR LUNA BOT**

\`\`\`bash
/actualizacion
/gitpull omite
\`\`\`
✅ Actualiza el bot sin perder configuración.
⚠️ En caso de errores:
\`\`\`bash
/gitpull --force
\`\`\`
Solo usar si algo se corrompe.`,

  "restaurar backup": `🛡️ **RESTAURAR BACKUP**

Recupera archivos importantes:
\`\`\`bash
/restaurar
\`\`\`
Y para limpiar backups viejos:
\`\`\`bash
/eliminarbackup
\`\`\`
💾 Ideal para restaurar config.js o base de datos.`,

  "contacto oficial": `📞 **CONTACTO Y SOPORTE OFICIAL**

👨‍💻 Creador: *Germán Miño*  
📱 WhatsApp: [wa.me/5493483466763]
📢 Canal: [https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y](https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y)  
🌐 GitHub: [Luna-Botv6-Project](https://github.com/Luna-botv6/Luna-Botv6-Project)  
💬 Discord: german_coto  
📧 Email: lunabotv6@gmail.com`,

  "quien es tu creador": `👨‍💻 **CREADOR DE LUNA BOT**

🌙 *Luna-BotV6* fue desarrollada por **Germán Miño**, experto en automatización e inteligencia artificial.
📱 WhatsApp: [wa.me/5493483466763](https://wa.me/5493483466763)
🌐 GitHub: https://github.com/Luna-botv6/Luna-Botv6-Project`
};


function findClosestMatch(text) {
  const lower = text.toLowerCase();

  if (lower.includes('boxmine')) return 'instalar en boxmine';
  if (lower.includes('termux')) return 'instalar en termux';
  if (lower.includes('windows')) return 'instalar en windows';
  if (lower.includes('linux')) return 'instalar en linux';
  if (lower.includes('crear') && lower.includes('comando')) return 'crear comandos';
  if (lower.includes('actualizar')) return 'actualizar bot';
  if (lower.includes('backup') || lower.includes('restaurar')) return 'restaurar backup';
  if (lower.includes('contacto') || lower.includes('soporte')) return 'contacto oficial';
  if (lower.includes('creador') || lower.includes('quien te hizo')) return 'quien es tu creador';
  if (lower.includes('instalar') || lower.includes('instalo')) return 'instalar en termux'; // fallback
  return null;
}

function canHandle(text) {
  const lower = text.trim().toLowerCase();
  if (STRICT_MODE) return Object.keys(SUPPORT_RESPONSES).includes(lower);
  return Boolean(findClosestMatch(lower));
}

async function handle(inputText, context) {
  const { conn, msg, jid } = context;
  const lower = inputText.trim().toLowerCase();
  const key = STRICT_MODE ? lower : findClosestMatch(lower);
  const response = SUPPORT_RESPONSES[key];
  if (response) {
    await conn.sendMessage(jid, { text: response }, { quoted: msg });
  }
}

export default {
  canHandle,
  handle,
  name: 'support',
  description: 'Responde preguntas naturales sobre instalación y soporte (incluye BoxmineWorld)'
};
