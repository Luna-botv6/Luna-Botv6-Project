import { getUserWaifuData, saveWaifuClaim } from '../lib/datoswaifuusuarios.js'

let handler = async (m, { conn, usedPrefix }) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje

  const _translate = await import(`../src/lunaidiomas/${idioma}.json`, { with: { type: 'json' } })

  // 🔥 AQUÍ ESTABA EL ERROR
  const t = _translate.default.plugins.waifu_claim

  let waifu = getUserWaifuData(m.sender)

  if (!waifu) {
    return await conn.reply(
      m.chat,
      t.no_waifu.replace('{prefix}', usedPrefix),
      m
    )
  }

  saveWaifuClaim(m.sender, waifu)

  await conn.reply(
    m.chat,
    t.success
      .replace('{name}', waifu.nombre)
      .replace('{anime}', waifu.anime),
    m
  )
}

handler.help = ['claim']
handler.tags = ['rpg', 'gacha']
handler.command = /^claimw$/i

export default handler