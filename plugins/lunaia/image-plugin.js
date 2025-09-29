import axios from 'axios';

const IMAGE_KEYWORDS = [
  'imagen', 'image', 'foto', 'picture', 'dibujo', 'draw', 'genera', 'create', 'crea',
  'ilustracion', 'illustration', 'diseno', 'design', 'arte', 'art', 'render'
];

const POLLINATIONS_IMAGE_API = 'https://image.pollinations.ai/prompt/';

function canHandle(text) {
  const lowerText = text.toLowerCase();
  return IMAGE_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

function extractImagePrompt(text) {
  const lowerText = text.toLowerCase();
  
  for (const keyword of IMAGE_KEYWORDS) {
    const index = lowerText.indexOf(keyword);
    if (index !== -1) {
      const afterKeyword = text.substring(index + keyword.length).trim();
      const prepositions = ['de', 'del', 'un', 'una', 'sobre', 'con', 'para', 'que'];
      const words = afterKeyword.split(' ');
      
      if (words.length > 0 && prepositions.includes(words[0])) {
        return words.slice(1).join(' ');
      }
      
      return afterKeyword || text.trim();
    }
  }
  
  return text.trim();
}

async function generateImage(prompt) {
  try {
    const enhancedPrompt = `${prompt}, high quality, detailed, professional, 8k resolution`;
    const imageUrl = `${POLLINATIONS_IMAGE_API}${encodeURIComponent(enhancedPrompt)}`;
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    return Buffer.from(response.data, 'binary');
  } catch (error) {
    throw new Error(`Error generando imagen: ${error.message}`);
  }
}

async function handle(inputText, context, geminiCallback) {
  const { conn, msg, jid, isPrivate } = context;
  
  await conn.sendMessage(jid, { text: '🖼️ *Generando imagen...* 🖼️' }, { quoted: msg });

  try {
    const imagePrompt = extractImagePrompt(inputText);
    let finalPrompt = imagePrompt;
    
    try {
      const enhancedPrompt = await geminiCallback(imagePrompt, true, isPrivate);
      finalPrompt = enhancedPrompt || imagePrompt;
    } catch (apiError) {
      console.log('🎨 Generando imagen sin mejorar prompt (API offline)');
      finalPrompt = imagePrompt;
    }
    
    const imageBuffer = await generateImage(finalPrompt);
    
    await conn.sendMessage(jid, {
      image: imageBuffer,
      caption: `🖼️*Luna-Botv6-Project* 🌙\n\n *Imagen generada:*\n${finalPrompt.substring(0, 200)}${finalPrompt.length > 200 ? '...' : ''}`
    }, { quoted: msg });

  } catch (imageError) {
    console.error('Error generando imagen:', imageError.message);
    await conn.sendMessage(jid, { text: '⚠️ *Luna-Botv6-Project*\n\nError temporal generando imagen. Intenta con otro prompt en unos segundos.' }, { quoted: msg });
  }
}

export default { canHandle, handle, name: 'image', description: 'Plugin para generar imágenes con IA' };