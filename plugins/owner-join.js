import fs from 'fs';

const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
let enviando = false;
let requestCount = new Map(); // Control de rate limiting por usuario
const MAX_REQUESTS_PER_HOUR = 3;
const COOLDOWN_TIME = 60 * 60 * 1000; // 1 hora en milisegundos

// Función para limpiar rate limiting
const cleanupRateLimit = () => {
  const now = Date.now();
  for (const [user, data] of requestCount.entries()) {
    if (now - data.lastReset > COOLDOWN_TIME) {
      requestCount.delete(user);
    }
  }
};

// Función para verificar rate limiting
const checkRateLimit = (userId) => {
  const now = Date.now();
  const userKey = userId.split('@')[0];
  
  if (!requestCount.has(userKey)) {
    requestCount.set(userKey, { count: 1, lastReset: now });
    return true;
  }
  
  const userData = requestCount.get(userKey);
  
  // Reset counter si ha pasado más de una hora
  if (now - userData.lastReset > COOLDOWN_TIME) {
    requestCount.set(userKey, { count: 1, lastReset: now });
    return true;
  }
  
  // Verificar si excede el límite
  if (userData.count >= MAX_REQUESTS_PER_HOUR) {
    return false;
  }
  
  userData.count++;
  return true;
};

// Función para validar el enlace más estrictamente
const validateGroupLink = (link) => {
  if (!link || typeof link !== 'string') return false;
  
  // Verificar formato del enlace
  if (!linkRegex.test(link)) return false;
  
  // Verificar que el enlace esté completo
  if (!link.startsWith('https://chat.whatsapp.com/')) return false;
  
  return true;
};

// Función para agregar delay natural
const naturalDelay = () => {
  const delay = Math.random() * 2000 + 1000; // Entre 1-3 segundos
  return new Promise(resolve => setTimeout(resolve, delay));
};

const handler = async (m, { conn, text, isMods, isOwner, isPrems }) => {
  const idioma = global.defaultLenguaje || 'es';
  
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.owner.join;
  } catch (error) {
    // Fallback messages en caso de error al cargar traducciones
    tradutor = {
      texto1: "❌ Por favor, proporciona un enlace válido de grupo de WhatsApp.",
      texto2: "✅ Me he unido al grupo exitosamente.",
      texto3: "📋 Tu solicitud ha sido enviada al administrador del bot para revisión.",
      texto4: "⏳ Has excedido el límite de solicitudes. Intenta más tarde.",
      texto5: "❌ Ha ocurrido un error al procesar tu solicitud.",
      texto6: "🔒 Solicitud de unión a grupo rechazada por políticas de seguridad."
    };
  }

  // Verificar si ya está procesando una solicitud
  if (enviando) {
    await conn.sendMessage(m.chat, { 
      text: "⏳ Por favor espera, estoy procesando otra solicitud..." 
    }, { quoted: m });
    return;
  }

  // Limpiar rate limiting periódicamente
  cleanupRateLimit();

  try {
    enviando = true;
    const link = text?.trim();

    // Validación mejorada del enlace
    if (!validateGroupLink(link)) {
      throw new Error(tradutor.texto1);
    }

    const [_, code] = link.match(linkRegex) || [];
    if (!code) {
      throw new Error(tradutor.texto1);
    }

    // Verificar privilegios del usuario
    if (isPrems || isMods || isOwner || m.fromMe) {
      // Agregar delay natural antes de unirse
      await naturalDelay();
      
      try {
        await conn.groupAcceptInvite(code);
        await conn.sendMessage(m.chat, { text: tradutor.texto2 }, { quoted: m });
      } catch (inviteError) {
        console.error('Error al aceptar invitación:', inviteError);
        throw new Error("❌ No pude unirme al grupo. El enlace podría ser inválido o haber expirado.");
      }
      
    } else {
      // Verificar rate limiting para usuarios normales
      if (!checkRateLimit(m.sender)) {
        await conn.sendMessage(m.chat, { text: tradutor.texto4 }, { quoted: m });
        return;
      }

      // Validaciones adicionales de seguridad
      const senderNumber = m.sender.split('@')[0];
      
      // Verificar que el usuario no esté en lista negra (opcional)
      // if (isBlacklisted(senderNumber)) {
      //   await conn.sendMessage(m.chat, { text: tradutor.texto6 }, { quoted: m });
      //   return;
      // }

      await conn.sendMessage(m.chat, { text: tradutor.texto3 }, { quoted: m });

      // Delay antes de enviar notificación a owners
      await naturalDelay();

      // Notificar a los propietarios de manera más profesional
      const dataArray = global.owner?.filter(([id]) => id) || [];
      
      if (dataArray.length > 0) {
        const notificationMessage = `🔔 *Nueva Solicitud de Grupo*\n\n` +
          `👤 Usuario: @${senderNumber}\n` +
          `📱 Número: ${senderNumber}\n` +
          `🔗 Enlace: ${link}\n` +
          `⏰ Hora: ${new Date().toLocaleString()}\n\n` +
          `_Usa /approve o /reject para responder_`;

        for (const entry of dataArray) {
          try {
            const number = Array.isArray(entry) ? entry[0] : entry;
            await naturalDelay(); // Delay entre cada envío
            
            await conn.sendMessage(number + '@s.whatsapp.net', {
              text: notificationMessage,
              mentions: [m.sender]
            });
          } catch (notifyError) {
            console.error('Error al notificar owner:', notifyError);
          }
        }
      }
    }

  } catch (err) {
    console.error('Error en handler join:', err);
    
    const errorMessage = err.message || tradutor.texto5;
    await conn.sendMessage(m.chat, { text: errorMessage }, { quoted: m });
    
  } finally {
    enviando = false;
  }
};

// Configuración del handler
handler.help = ['join [chat.whatsapp.com]'];
handler.tags = ['premium'];
handler.command = /^(join|nuevogrupo)$/i;
handler.private = true;

// Límites adicionales para evitar spam
handler.limit = true;
handler.register = true;

export default handler;

