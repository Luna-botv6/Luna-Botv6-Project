import { getUserStats, getRoleByLevel } from '../lib/stats.js'

const handler = async (m, { conn, usedPrefix, isPrems }) => {

  try {
    const stats   = getUserStats(m.sender)
    const role    = getRoleByLevel(stats.level)
    const { money, exp, level, limit, premiumTime } = stats
    const taguser = `@${m.sender.split('@')[0]}`
    const isPrem  = premiumTime > 0 || isPrems

    // Mención dinámica del bot (se ve como @NombreDelBot en WhatsApp)
    const botJid  = conn.user?.jid || conn.user?.id || ''
    const botTag  = `@${botJid.split('@')[0]}`

    const more     = String.fromCharCode(8206)
    const readMore = more.repeat(850)

    const str = `✦ 𝗜𝗡𝗧𝗘𝗟𝗜𝗚𝗘𝗡𝗖𝗜𝗔 𝗔𝗥𝗧𝗜𝗙𝗜𝗖𝗜𝗔𝗟 ✦
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

👤 *Perfil de* ${taguser}
┌ 📊 Nivel ${level}  ·  ⭐ ${exp} exp
├ 🎯 Rango: *${role}*
├ 💰 $${money}  ·  🎫 Límite: ${limit}
└ 💎 Premium: ${isPrem ? '✅ Activo' : '❌ Inactivo'}
${readMore}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
🧠 *¿CÓMO USAR LA IA?*

Sin comandos. Solo mencioname y hablá natural.
Así de simple 👇

> ${botTag} ¿cómo se hace una pizza casera?

Eso es todo. La IA entiende tu pregunta y responde al instante.

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
📚 *BUSCAR INFORMACIÓN*

*🍽️ Recetas y preparación*
> ${botTag} receta de alfajores
> ${botTag} como se preparan los canelones

*📖 Definiciones y conceptos*
> ${botTag} qué es la fotosíntesis
> ${botTag} qué fue la Guerra Fría

*🧑 Personas y personajes*
> ${botTag} quién fue Nikola Tesla
> ${botTag} quién inventó el avión

*📅 Fechas e historia*
> ${botTag} cuándo fue la Revolución Francesa
> ${botTag} cuándo nació Lionel Messi

*🌍 Lugares y geografía*
> ${botTag} dónde queda la Patagonia
> ${botTag} capital de Japón

*❓ Por qué y cómo funciona*
> ${botTag} por qué el cielo es azul
> ${botTag} cómo funciona el GPS

*📏 Medidas y datos*
> ${botTag} cuánto mide la Torre Eiffel
> ${botTag} cuánto tarda en llegar a Marte

*💬 Significados*
> ${botTag} significado de empatía
> ${botTag} origen del tango

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
🎮 *JUEGOS*

👁️ *Veo veo*
> ${botTag} veo veo
> ${botTag} dame una pista
> ${botTag} cancela el juego

🪢 *Ahorcado*
> ${botTag} ahorcado fácil / medio / difícil
> ${botTag} dame una pista
> _[escribí una letra para adivinar]_

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⚔️ *RPG & RANGOS*

> ${botTag} mi exp / mis estadísticas
> ${botTag} ver mi perfil de juego
> ${botTag} top del grupo / ver ranking
> ${botTag} reclamar recompensa diaria
> ${botTag} quiero minar diamantes

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
🧮 *MATEMÁTICAS*

> ${botTag} cuánto es 2 + 2
> ${botTag} la mitad de 5000
> ${botTag} derivada de x³
> ${botTag} 20% de 800
> ${botTag} promedio de 4, 7, 9

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
🖼️ *IMÁGENES & MEDIA*

🎨 *Generar con IA*
> ${botTag} genera una imagen de un dragón
> ${botTag} crea un dibujo de paisaje espacial

😂 *Stickers y fotos*
> ${botTag} hacer sticker  _↩ respondé una imagen_
> ${botTag} pasar sticker a imagen
> ${botTag} foto de gato / foto de perro
> ${botTag} quiero un meme

👁️ *Leer imagen (OCR)*
> ${botTag} qué dice la imagen  _↩ respondé una foto_

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
🎵 *DESCARGAS*

> ${botTag} descarga la música de Tini
> ${botTag} playlist de Shakira
> ${botTag} texto a voz: hola mundo
> _[pegá un link de TikTok / IG / Facebook]_

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
🌐 *UTILIDADES*

> ${botTag} traducir al inglés: buen día
> ${botTag} clima de Buenos Aires
> ${botTag} cuánto internet tengo
> ${botTag} estás vivo

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
🔇 *MODERACIÓN*  _· solo admins_

> ${botTag} mutea a @usuario  _· por 30 min / 2 h_
> ${botTag} desmutea a @usuario
> ${botTag} expulsa a @usuario
> ${botTag} dale admin a @usuario
> ${botTag} quita el admin a @usuario
> ${botTag} ver advertencias de @usuario
> ${botTag} ver fantasmas / quién no habla

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
⚙️ *CONFIG DEL GRUPO*  _· solo admins_

> ${botTag} activa el antilink / bienvenida / antidelete
> ${botTag} activa el antitoxic / autosticker / antispam
> ${botTag} activa el antiprivado / restrict / afk
> ${botTag} desactiva _[función]_
> ${botTag} cambia el nombre del grupo a _[nombre]_
> ${botTag} cambia la descripción a _[texto]_
> ${botTag} link del grupo / resetear link / info
> ${botTag} abre el grupo / cierra el grupo
> ${botTag} invoca a todos / mencionar todos
> ${botTag} reiniciar bot / sincronizar mensajes

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
💬 *CHARLA LIBRE*

Hablame de cualquier cosa 🙂

> ${botTag} contame un chiste
> ${botTag} dame un consejo
> ${botTag} cómo estás
> ${botTag} cómo instalo en Termux
> ${botTag} quién te hizo

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
_✦ Sin comandos · Solo mencioname y hablá ✦_`.trim()

    await conn.sendMessage(m.chat, {
      text: str,
      mentions: [m.sender, botJid]
    }, { quoted: m })

  } catch (e) {
    console.error('iamenu error:', e)
    conn.reply(m.chat, '❌ Error al mostrar el menú de IA', m)
  }
}

handler.command = /^(iamenu|menuia|menusia|aimenú|aimenu|lunamenu)$/i
handler.exp = 10
handler.fail = null
export default handler