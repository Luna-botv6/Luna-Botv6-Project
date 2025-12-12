import fs from "fs"
import axios from "axios"
import uploadImage from "lib/src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.herramientas_hd

  try {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || q.mediaType || ""

    if (!mime) throw `${tradutor.texto1} ${usedPrefix + command}*`
    if (!/image\/(jpe?g|png)/.test(mime))
      throw `${tradutor.texto2[0]} (${mime}) ${tradutor.texto2[1]}`

    m.reply(tradutor.texto3)

    let img = await q.download()
    let url = await uploadImage(img)

    let result = await upscaleWithStellar(url)

    await conn.sendMessage(m.chat, { image: result }, { quoted: m })
  } catch (e) {
    throw tradutor.texto4
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]
export default handler

// ================================================
//   FUNCIÓN COMPATIBLE CON LA ESTRUCTURA DE LUNA
// ================================================
async function upscaleWithStellar(url) {
  const endpoint = `https://api.stellarwa.xyz/tools/upscale?url=${url}&key=BrunoSobrino`

  const { data } = await axios.get(endpoint, {
    responseType: "arraybuffer",
    headers: { accept: "image/*" }
  })

  return Buffer.from(data)
}
