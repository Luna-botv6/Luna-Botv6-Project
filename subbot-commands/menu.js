export default async function handler(sock, m, args) {
  const menu = `
╭───〔 🤖 𝗠𝗘𝗡𝗨́ 𝗗𝗘𝗟 𝗦𝗨𝗕𝗕𝗢𝗧 〕───╮

✨ *Comandos Disponibles:*
│
├ 🧞‍♂️ */invocar* _<mensaje>_
│   └ 📢 Menciona a todos con texto
│
├ 💘 */love* _@tag @tag_
│   └ 💑 Descubre el amor entre dos
│ 
├📥 */facebook* _<enlace>_
│   └ 🎬 descarga videos de faceboock
│
├ 🎧 */play* _<nombre de canción>_
│   └ 🔊 Descarga música de YouTube
│
├ 🖼️ */s*
│   └ 🎨 Convierte imagen/video a sticker
│
├ 🏓 */ping*
│   └ ⏱️ Mide la velocidad del bot
│
├ 📱 */info*
│   └ 🧾 Muestra info del SubBot
│
├ ⏰ */uptime*
│   └ ⌛ Tiempo desde que está activo
│
└ 🧾 */menu*
    └ 📋 Muestra este mismo menú

━━━━━━━━━━━━━━━━━━━━━━━

💡 *Indicaciones:*
• Usa los comandos con prefijos: / . ! #
• Ejemplo: */invocar hola a todos*
• Ejemplo: */love @juan @lisa*

━━━━━━━━━━━━━━━━━━━━━━━

🛡️ *Estado:* ✅ En línea  
⚡ *Versión:* 2.0  
🤖 *Tipo:* SubBot Independiente  

╰───────────────────────╯
`.trim()

  await sock.sendMessage(m.chat, { text: menu }, { quoted: m })
}
