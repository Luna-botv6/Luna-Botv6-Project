// lib/menu.js
import { getUserTotalExp } from './exp.js';

export async function menu(m, client) {
  try {
    const userid = m.sender || m.from;
    const { total, detalle } = getUserTotalExp(userid);

    let texto = "🌟 *Tu Perfil de Experiencia* 🌟\n\n";
    texto += `✨ *Experiencia Total:* ${total}\n\n`;
    texto += "📊 *Detalle por módulos:*\n";

    for (const [modulo, data] of Object.entries(detalle)) {
      texto += `\n🔹 *${modulo.charAt(0).toUpperCase() + modulo.slice(1)}*\n`;
      texto += `➤ Exp: ${data.exp || 0}\n`;
      texto += `➤ Nivel: ${data.nivel || 0}\n`;
      texto += `➤ Diamantes: ${data.diamantes || 0}\n`;
    }

    texto += "\nSigue jugando y subiendo de nivel!";

    await client.sendMessage(m.chat, { text: texto }, { quoted: m });
  } catch (e) {
    console.error('Error en comando menú:', e);
    await client.sendMessage(m.chat, { text: 'Ocurrió un error al cargar tu perfil.' }, { quoted: m });
  }
}