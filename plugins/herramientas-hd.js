import axios from "axios"
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  try {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ""

    // Validar imagen
    if (!mime || !mime.includes("image")) {
      return m.reply(`✖️ *Envía o responde a una imagen para mejorarla en HD*\n\nEjemplo:\n${usedPrefix + command} (responde una imagen)`)
    }

    // Enviar mensaje de proceso
    let status = await conn.sendMessage(m.chat, { text: "⏳ *Mejorando imagen a HD... espera un momento*" }, { quoted: m })

    // Descargar imagen
    let imgBuffer = await q.download()
    if (!imgBuffer) return m.reply("✖️ No pude descargar la imagen.")

    // Subir imagen
    let url = await uploadImage(imgBuffer)

    // Llamar a la API
    let apiURL = `https://api.siputzx.my.id/api/iloveimg/upscale?image=${url}&scale=2`
    let { data } = await axios.get(apiURL, { responseType: "arraybuffer" })

    // Enviar imagen HD
    await conn.sendMessage(
      m.chat,
      { image: data, caption: "✅ *Imagen mejorada a HD correctamente.*" },
      { quoted: m }
    )

    // Cambiar mensaje a check ✔
    await conn.sendMessage(
      m.chat,
      { edit: status.key, text: "✔️ *Proceso completado*" }
    )

  } catch (e) {
    console.log(e)
    m.reply("✖️ Ocurrió un error al procesar la imagen.")
  }
}

handler.help = ["hd", "upscale"]
handler.tags = ["ai", "tools"]
handler.command = /^(hd|upscale|mejorar|enhance)$/i

export default handler
