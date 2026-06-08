import { getConfig } from '../lib/funcConfig.js';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';

const toxicWarnings = new Map();
const MAX_TOXIC_WARNINGS = 3;

const toxicWords = [
  'idiota', 'estupido', 'estúpido', 'pendejo', 'cabron', 'cabrón', 'hijo de puta',
  'puto', 'puta', 'marica', 'maricon', 'maricón', 'joto', 'gay', 
  'retrasado', 'mongolico', 'mongólico', 'subnormal', 'imbécil', 'imbecil',
  'mierda', 'cagar', 'coño', 'joder', 'follar', 'chingar', 'verga',
  'pinche', 'mamada', 'mamón', 'culero', 'ojete', 'nalgas',
  'te mato', 'te voy a matar', 'muerte', 'suicidio', 'suicidate', 'suicídate',
  'matarte', 'golpearte', 'romper la cara', 'partirte', 'destruirte',
  'negro de mierda', 'india', 'indio', 'gordo', 'gorda', 'feo', 'fea',
  'enano', 'gigante', 'discapacitado', 'loco', 'loca', 'enfermo',
  'boludo', 'pelotudo', 'tarado', 'gil', 'gila', 'huevón', 'weón',
  'concha', 'conchudo', 'hijueputa', 'malparido', 'gonorrea',
  'mamagallina', 'mamagallo', 'triple hijueputa', 'chimba', 'berraco'
];

const toxicPatterns = [
  /k\s*k\s*k+/gi,
  /n\s*i\s*g+\s*[aeiou]+\s*r*/gi,
  /f\s*u\s*c\s*k/gi,
  /s\s*h\s*i\s*t/gi,
  /b\s*i\s*t\s*c\s*h/gi,
  /p\s*u\s*t\s*[ao]/gi,
  /m\s*i\s*e\s*r\s*d\s*a/gi,
  /c\s*o\s*ñ\s*o/gi,
];

function containsToxicContent(text) {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  for (const word of toxicWords) {
    if (lowerText.includes(word.toLowerCase())) {
      return { type: 'word', content: word };
    }
  }
  
  for (const pattern of toxicPatterns) {
    if (pattern.test(lowerText)) {
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

const handler = async (m, { conn }) => {
  try {
    if (!m.isGroup || !m.text) return;
    
    const config = getConfig(m.chat);
    if (!config.antiToxic) return;
    
    const groupData = await getGroupDataForPlugin(conn, m.chat, m.sender);
    const { isAdmin } = groupData;
    
    if (isAdmin) return;
    
    const toxicResult = containsToxicContent(m.text);
    if (!toxicResult) return;
    
    const warningCount = addToxicWarning(m.chat, m.sender);
    
    let messageDeleted = false;
    try {
      await conn.sendMessage(m.chat, { delete: m.key });
      messageDeleted = true;
    } catch (error) {
      messageDeleted = false;
    }
    
    if (warningCount >= MAX_TOXIC_WARNINGS) {
      let userBanned = false;
      try {
        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
        userBanned = true;
      } catch (error) {
        userBanned = false;
      }
      
      if (userBanned) {
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
    }
    
  } catch (error) {
    // Error silencioso
  }
};

handler.before = async function (m, extra) {
  return await handler(m, extra);
};

export default handler;