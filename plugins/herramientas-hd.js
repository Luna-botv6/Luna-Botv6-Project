import fs from "fs"
import axios from "axios"
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.herramientas_hd

  try {
    // Detectar si la imagen viene citada o es la del mensaje actual
    let q = m.quoted ? m.quoted : m
    let mime =
      (q.msg || q).mimetype ||
      q.message?.imageMessage?.mimetype ||
      q.mimetype ||
      q.mediaType ||
      ""

    if (!mime) throw `${tradutor.texto1} ${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime))
      throw `${tradutor.texto2[0]} (${mime}) ${tradutor.texto2[1]}`

    // Mensaje de procesando
    m.reply(tradutor.texto3)

    // Reacción ⏳
    await conn.sendMessage(m.chat, {
      react: { text: "⏳", key: m.key }
    })

    // Descargar imagen
    let img
    if (q.download) {
      img = await q.download()
    } else if (q.message?.imageMessage) {
      img = await conn.downloadMediaMessage(q)
    }

    if (!img) throw tradutor.texto4

    // Subir imagen a servidor temporal
    let url = await uploadImage(img)

    // Procesar HD con Stellar
    let result = await upscaleWithStellar(url)

    // Enviar imagen mejorada
    await conn.sendMessage(m.chat, { image: result }, { quoted: m })

    // Reacción ✔️
    await conn.sendMessage(m.chat, {
      react: { text: "✔️", key: m.key }
    })

  } catch (e) {
    throw tradutor.texto4
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

// =====================================================
//      FUNCIÓN DE ESCALADO COMPATIBLE CON LUNA V6
// =====================================================
async function upscaleWithStellar(url) {
  const endpoint = `https://api.siputzx.my.id/api/iloveimg/upscale?image=${url}&scale=2`

}
