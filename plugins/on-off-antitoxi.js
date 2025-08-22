import fs from 'fs';
import { getConfig } from '../lib/funcConfig.js';

// Sistema de advertencias para contenido tóxico
const toxicWarnings = new Map();
const MAX_TOXIC_WARNINGS = 3;

// Palabras y frases tóxicas a detectar
const toxicWords = [
  // Insultos comunes
  'idiota', 'estupido', 'estúpido', 'pendejo', 'cabron', 'cabrón', 'hijo de puta',
  'puto', 'puta', 'marica', 'maricon', 'maricón', 'joto', 'gay', 
  'retrasado', 'mongolico', 'mongólico', 'subnormal', 'imbécil', 'imbecil',
  
  // Groserías
  'mierda', 'cagar', 'coño', 'joder', 'follar', 'chingar', 'verga',
  'pinche', 'mamada', 'mamón', 'culero', 'ojete', 'nalgas',
  
  // Amenazas
  'te mato', 'te voy a matar', 'muerte', 'suicidio', 'suicidate', 'suicídate',
  'matarte', 'golpearte', 'romper la cara', 'partirte', 'destruirte',
  
  // Discriminación
  'negro de mierda', 'india', 'indio', 'gordo', 'gorda', 'feo', 'fea',
  'enano', 'gigante', 'discapacitado', 'loco', 'loca', 'enfermo',
  
  // Palabras adicionales en español latino
  'boludo', 'pelotudo', 'tarado', 'gil', 'gila', 'huevón', 'weón',
  'concha', 'conchudo', 'hijueputa', 'malparido', 'gonorrea',
  'mamagallina', 'mamagallo', 'triple hijueputa', 'chimba', 'berraco'
];

// Patrones más complejos
const toxicPatterns = [
  /k\s*k\s*k+/gi, // kkk
  /n\s*i\s*g+\s*[aeiou]+\s*r*/gi, // variaciones de insultos raciales
  /f\s*u\s*c\s*k/gi, // fuck con espacios
  /s\s*h\s*i\s*t/gi, // shit con espacios
  /b\s*i\s*t\s*c\s*h/gi, // bitch con espacios
  /p\s*u\s*t\s*[ao]/gi, // puta/puto con espacios
  /m\s*i\s*e\s*r\s*d\s*a/gi, // mierda con espacios
  /c\s*o\s*ñ\s*o/gi, // coño con espacios
];

function containsToxicContent(text) {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  console.log('🔍 ANTITOXIC: Verificando texto:', text);
  
  // Verificar palabras tóxicas exactas
  for (const word of toxicWords) {
    if (lowerText.includes(word.toLowerCase())) {
      console.log('🚨 ANTITOXIC: Palabra tóxica detectada:', word);
      return { type: 'word', content: word };
    }
  }
  
  // Verificar patrones
  for (const pattern of toxicPatterns) {
    if (pattern.test(lowerText)) {
      console.log('🚨 ANTITOXIC: Patrón tóxico detectado:', pattern.source);
      return { type: 'pattern', content: pattern.source };
    }
  }
  
  return false;
}

function addToxicWarning(chatId, userId) {
  if (!toxicWarnings.has(chatId)) {
    toxicWarnings.set(chatId, {});
  }
  const chatWarnings = toxicWarnings.get(chatId);
  chatWarnings[userId] = (chatWarnings[userId] || 0) + 1;
  return chatWarnings[userId];
}

function resetToxicWarnings(chatId, userId) {
  const chatWarnings = toxicWarnings.get(chatId);
  if (chatWarnings?.[userId]) {
    delete chatWarnings[userId];
  }
}

const handler = async (m, { conn, isAdmin, isOwner }) => {
  try {
    // Solo grupos y con texto
    if (!m.isGroup || !m.text) return;
    
    // Verificar configuración
    const config = getConfig(m.chat);
    if (!config.antiToxic) return;
    
    console.log('🔍 ANTITOXIC: Verificando mensaje...');
    console.log('👤 De:', m.sender);
    console.log('📝 Texto:', m.text);
    console.log('👑 Es admin:', isAdmin);
    console.log('👨‍💼 Es owner:', isOwner);
    
    // No procesar admins ni owner
    if (isAdmin || isOwner) {
      console.log('✅ Usuario es admin/owner, ignorando');
      return;
    }
    
    // Verificar contenido tóxico
    const toxicResult = containsToxicContent(m.text);
    if (!toxicResult) {
      console.log('✅ No hay contenido tóxico detectado');
      return;
    }
    
    console.log('🚨 CONTENIDO TÓXICO DETECTADO! Procesando...');
    
    // FORZAR PERMISOS - Si antitoxic está activado, asumimos que el bot debe tener permisos
    const FORCE_PERMISSIONS = true;
    
    // Agregar advertencia
    const warningCount = addToxicWarning(m.chat, m.sender);
    console.log(`📊 Advertencia tóxica ${warningCount}/${MAX_TOXIC_WARNINGS} para ${m.sender}`);
    
    // Intentar eliminar mensaje
    let messageDeleted = false;
    if (FORCE_PERMISSIONS) {
      try {
        console.log('🗑️ Intentando eliminar mensaje tóxico...');
        await conn.sendMessage(m.chat, { delete: m.key });
        messageDeleted = true;
        console.log('✅ Mensaje tóxico eliminado exitosamente');
      } catch (error) {
        console.log('❌ Error eliminando mensaje:', error.message);
        messageDeleted = false;
      }
    }
    
    if (warningCount >= MAX_TOXIC_WARNINGS) {
      console.log('🚫 Máximo de advertencias tóxicas alcanzado, intentando banear...');
      
      // Intentar banear
      let userBanned = false;
      if (FORCE_PERMISSIONS) {
        try {
          await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
          userBanned = true;
          console.log('✅ Usuario baneado por toxicidad exitosamente');
        } catch (error) {
          console.log('❌ Error baneando usuario tóxico:', error.message);
          userBanned = false;
        }
      }
      
      if (userBanned) {
        // Mensaje de confirmación de baneo
        const banMsg = `🚫 *USUARIO ELIMINADO POR CONTENIDO TÓXICO*

👤 *Usuario:* @${m.sender.split('@')[0]}
📊 *Total advertencias:* ${warningCount}/${MAX_TOXIC_WARNINGS}
📋 *Motivo:* Uso repetido de lenguaje ofensivo/tóxico
🚨 *Contenido detectado:* ${toxicResult.type === 'word' ? 'Palabra ofensiva' : 'Patrón ofensivo'}
⚡ *Acción:* Eliminación automática del grupo

✅ *El usuario ha sido removido exitosamente.*

🤝 *Mantenemos un ambiente respetuoso para todos.*`;

        await conn.sendMessage(m.chat, {
          text: banMsg,
          mentions: [m.sender]
        });
        
        resetToxicWarnings(m.chat, m.sender);
        
      } else {
        // Si no pudo banear, notificar a admins
        const failMsg = `🚨 *ERROR: NO SE PUDO ELIMINAR USUARIO TÓXICO*

👤 *Usuario:* @${m.sender.split('@')[0]}
📊 *Advertencias:* ${warningCount}/${MAX_TOXIC_WARNINGS}
📋 *Motivo:* Lenguaje tóxico/ofensivo
🚨 *Tipo:* ${toxicResult.type === 'word' ? 'Palabra ofensiva' : 'Patrón ofensivo'}

❌ **EL BOT NECESITA PERMISOS DE ADMINISTRADOR**

🔧 *Solución:*
1️⃣ Hacer al bot administrador del grupo
2️⃣ Dar permisos de "Eliminar mensajes" y "Remover participantes"
3️⃣ O eliminar manualmente al usuario

⚠️ *Administradores, mantengan el ambiente respetuoso.*`;

        await conn.sendMessage(m.chat, {
          text: failMsg,
          mentions: [m.sender]
        });
      }
      
    } else {
      // Enviar advertencia normal
      const remaining = MAX_TOXIC_WARNINGS - warningCount;
      
      let warningMsg = `⚠️ *ADVERTENCIA ${warningCount}/${MAX_TOXIC_WARNINGS} - CONTENIDO TÓXICO*

👤 *Usuario:* @${m.sender.split('@')[0]}
🚨 *Motivo:* Uso de lenguaje ofensivo/tóxico
🔍 *Detectado:* ${toxicResult.type === 'word' ? 'Palabra inapropiada' : 'Patrón ofensivo'}
⏰ *Advertencias restantes:* ${remaining}

${warningCount === MAX_TOXIC_WARNINGS - 1 ? 
  '🔥 **¡ÚLTIMA ADVERTENCIA!**\n⚡ *Próximo mensaje tóxico = ELIMINACIÓN AUTOMÁTICA*' : 
  '⚡ *Continúa con lenguaje ofensivo y serás eliminado*'
}

${messageDeleted ? 
  '🗑️ *Tu mensaje fue eliminado automáticamente*' : 
  '⚠️ *No pude eliminar tu mensaje - Bot necesita permisos de admin*'
}

🤝 *Por favor usa un lenguaje respetuoso.*
💬 *Mantengamos un ambiente positivo para todos.*`;

      await conn.sendMessage(m.chat, {
        text: warningMsg,
        mentions: [m.sender]
      });
      
      console.log(`✅ Advertencia tóxica ${warningCount}/${MAX_TOXIC_WARNINGS} enviada`);
    }
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO en antitoxic:', error);
    
    // Mensaje de error para debug
    await conn.sendMessage(m.chat, {
      text: `❌ **ERROR EN SISTEMA ANTITOXIC**\n\nError: ${error.message}\n\n🔧 *Contacta al administrador del bot.*`
    });
  }
};

handler.before = async function (m, extra) {
  return await handler(m, extra);
};

export default handler;