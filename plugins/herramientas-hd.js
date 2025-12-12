import fs from "fs"
import axios from "axios"
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {

  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!mime) throw `Debes responder o enviar una imagen para usar *${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime)) throw `Formato no compatible (${mime}). Solo se acepta JPG o PNG.`

    m.reply("Procesando imagen, por favor espere...")

    const img = await q.download()
    const fileUrl = await uploadImage(img)
    const banner = await upscaleWithStellar(fileUrl)

    await conn.sendMessage(m.chat, { image: banner }, { quoted: m })
  } catch (e) {
    throw "Ocurrió un error al procesar la imagen: " + e
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

async function upscaleWithStellar(url) {
  const endpoint = `https://api.stellarwa.xyz/tools/upscale?url=${url}&key=BrunoSobrino`

  const { data } = await axios.get(endpoint, {
    responseType: "arraybuffer",
    headers: {
      accept: "image/*"
    }
  })

  return Buffer.from(data)
}
