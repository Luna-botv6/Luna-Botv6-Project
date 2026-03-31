import { getUserStats, getRoleByLevel } from '../lib/stats.js'

const handler = async (m, { conn, usedPrefix, isPrems }) => {

  try {
    const stats    = getUserStats(m.sender)
    const role     = getRoleByLevel(stats.level)
    const { money, exp, level, limit, premiumTime } = stats
    const taguser  = `@${m.sender.split('@')[0]}`
    const botName  = '@Luna'
    const isPrem   = premiumTime > 0 || isPrems

    const more     = String.fromCharCode(8206)
    const readMore = more.repeat(850)

    const str = `🌙 *LUNA IA — MENÚ COMPLETO*

👤 *Tu perfil*
┌ 👋 ${taguser}
├ 📊 Nivel: ${level} · ⭐ Exp: ${exp}
├ 🎯 Rango: ${role}
├ 💰 Dinero: $${money} · 🎫 Límite: ${limit}
└ 💎 Premium: ${isPrem ? '✅ Activo' : '❌ Inactivo'}
${readMore}
─────────────────────
🧠 *CÓMO HABLARLE A LUNA*

No necesitás comandos. Solo mencioname con ${botName} y hablá natural.

Luna entiende estas *palabras clave* para buscar información:

› *como se hace / como se prepara*
  ${botName} como se hacen los tacos
  ${botName} como se preparan los canelones

› *receta de / receta para*
  ${botName} receta de pizza casera
  ${botName} receta para hacer alfajores

› *que es / que fue / que son*
  ${botName} que es la fotosíntesis
  ${botName} que fue la Guerra Fría

› *quien es / quien fue / quien inventó*
  ${botName} quien fue Nikola Tesla
  ${botName} quien inventó el avión

› *cuando fue / cuando nació / cuando ocurrió*
  ${botName} cuando fue la Revolución Francesa
  ${botName} cuando nació Lionel Messi

› *donde queda / donde está / donde nació*
  ${botName} donde queda la Patagonia
  ${botName} donde está Islandia

› *por qué / porque*
  ${botName} por qué el cielo es azul
  ${botName} porque llueve

› *historia de / origen de*
  ${botName} historia de los mayas
  ${botName} origen del tango

› *como funciona / para qué sirve*
  ${botName} como funciona el GPS
  ${botName} para qué sirve el magnesio

› *cuánto mide / cuánto pesa / cuánto tarda*
  ${botName} cuánto mide la Torre Eiffel
  ${botName} cuánto tarda en llegar a Marte

› *capital de / significado de*
  ${botName} capital de Japón
  ${botName} significado de empatía

─────────────────────
🎮 *JUEGOS*

👁️ *Veo veo*
› ${botName} veo veo
› ${botName} dame una pista
› ${botName} cancela el juego

🪢 *Ahorcado*
› ${botName} ahorcado fácil / medio / difícil
› ${botName} dame una pista · cancela el ahorcado
› _[letra]_ para adivinar

─────────────────────
⚔️ *RPG — SISTEMA DE RANGOS*

› ${botName} mi exp / mis estadísticas
› ${botName} ver mi perfil de juego
› ${botName} top del grupo / ver ranking
› ${botName} reclamar recompensa diaria
› ${botName} quiero minar / ir a minar
› ${botName} minar diamantes

─────────────────────
🧮 *MATEMÁTICAS*

› ${botName} cuánto es 2 + 2
› ${botName} la mitad de 5000
› ${botName} derivada de x³
› ${botName} 20% de 800
› ${botName} promedio de 4, 7, 9

─────────────────────
🖼️ *IMÁGENES Y MEDIA*

🎨 *Generar con IA*
› ${botName} genera una imagen de un gato
› ${botName} crea un dibujo de dragón

😂 *Stickers y fotos*
› ${botName} hacer sticker _(respondé una imagen)_
› ${botName} pasar sticker a imagen
› ${botName} foto de gato / foto de perro
› ${botName} quiero un meme

👁️ *Leer imagen (OCR)*
› ${botName} qué dice la imagen _(respondé una foto)_

─────────────────────
🎵 *DESCARGAS*

› ${botName} descarga la música de Tini
› ${botName} playlist de Shakira
› ${botName} texto a voz: hola mundo
› _[link TikTok / Instagram / Facebook]_ — descarga solo

─────────────────────
🌐 *UTILIDADES*

› ${botName} traducir al inglés: buen día
› ${botName} clima de Buenos Aires
› ${botName} cuánto internet tengo
› ${botName} estás vivo

─────────────────────
🔇 *MODERACIÓN* _(solo admins)_

› ${botName} mutea a @usuario _(o por 30 min / 2 horas)_
› ${botName} desmutea a @usuario
› ${botName} expulsa a @usuario
› ${botName} dale admin a @usuario
› ${botName} quita el admin a @usuario
› ${botName} ver advertencias de @usuario
› ${botName} ver fantasmas / quién no habla

─────────────────────
⚙️ *CONFIG DEL GRUPO* _(solo admins)_

› ${botName} activa el antilink / bienvenida / antidelete
› ${botName} activa el antitoxic / autosticker / antispam
› ${botName} activa el antiprivado / restrict / afk / modoadmin
› ${botName} desactiva _[función]_
› ${botName} cambia el nombre del grupo a [nombre]
› ${botName} cambia la descripción del grupo a [texto]
› ${botName} cambia el mensaje de bienvenida a [texto]
› ${botName} link del grupo / resetear link / info del grupo
› ${botName} abre el grupo / cierra el grupo
› ${botName} invoca a todos / mencionar todos
› ${botName} reiniciar bot / sincronizar mensajes

─────────────────────
💬 *CHARLA*

Hablame de lo que quieras: chistes, consejos,
emociones, preguntas, recados y mucho más.

› ${botName} contame un chiste
› ${botName} dame un consejo
› ${botName} cómo estás
› ${botName} cómo instalo en Termux / Windows
› ${botName} quién te hizo

─────────────────────
🌙 *Luna Bot IA* · _Sin comandos · Solo hablá_`.trim()

    await conn.sendMessage(m.chat, {
      text: str,
      mentions: [m.sender]
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
