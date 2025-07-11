(async () => {
  const menu = `
🤖 *MENÚ SUBBOT* 🤖

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ *COMANDOS DISPONIBLES:*

🔮 */invocar* _<mensaje>_
   ↳ Invoca a todos con un mensaje

💕 */love* _@tag @tag_
   ↳ Crea amor entre dos usuarios

🏓 */ping*
   ↳ Verifica latencia del bot

📱 */info*
   ↳ Información del subbot

⏰ */uptime*
   ↳ Tiempo activo del bot

📋 */menu*
   ↳ Muestra este menú

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *INFORMACIÓN:*
• Prefijos: / . ! #
• Ejemplo: /invocar hola todos
• Ejemplo: /love @ana @luis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 *Estado:* ✅ Activo
⚡ *Versión:* 2.0
🤖 *Tipo:* SubBot Independiente
  `.trim()
  
  await sock.sendMessage(m.chat, { text: menu }, { quoted: m })
})();